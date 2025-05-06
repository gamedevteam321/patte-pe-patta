import { createClient } from '@supabase/supabase-js';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { BalanceService } from '../balance/balance.service';
import { RoomType, roomConfigs } from '../../types/game';

// Load environment variables
dotenv.config();

interface Card {
  id: string;
  suit: string;
  value: string;
  rank: number;
  isHitButton?: boolean;
}

interface Player {
  id: string;
  userId: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  cards: Card[];
  score?: number;
  isActive?: boolean;
  autoPlayCount?: number;
  name?: string;
  shuffleCount: number;
  lastPlayTime?: number;
}

interface GameState {
  status: string;
  players: Player[];
  currentPlayerIndex: number;
  centralPile: Card[];
  gameStarted: boolean;
  isGameOver: boolean;
  gameStartTime: number | null;
  roomDuration: number;
  turnEndTime: number | null;
  requiredPlayers: number;
  matchAnimation?: {
    isActive: boolean;
    cardId: string;
    playerId: string;
    timestamp: number;
  };
  winner?: Player;
  currentTurn?: string;
  waitingTimer: number;
  waitingStartTime: number;
  autoStartEnabled: boolean;
  debugMode: boolean;
  roomType: RoomType;
  config: any;
  cardRequestedCount: number;
  cardVotes: Record<string, boolean>;
  lastVoteResult?: {
    playerId: string;
    reason: string;
    timestamp: number;
  };
  userNewCardRequest:boolean;
}

interface Room {
  id: string;
  roomName: string;
  hostName: string;
  isPrivate: boolean;
  password: string | null;
  players: Player[];
  gameState: GameState;
  status: string;
  code: string;
  max_players: number;
  amount_stack: number;
  created_at: string;
  roomType: RoomType;
  config: any;
  cardRequestedCount: number;
}

// Debug mode configuration
const DEBUG_MODE = process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development';

// Maximum number of auto-plays allowed before auto-exit
const MAX_AUTO_PLAY_COUNT = DEBUG_MODE ? 1000 : 200;

// Maximum waiting time before auto-play is detected (in milliseconds)
const MAX_WAITING_TIME = 5000;

// Function to detect auto-play
const isAutoPlay = (player: Player, card: Card): boolean => {
  // Initialize autoPlayCount if it doesn't exist
  if (player.autoPlayCount === undefined) {
    player.autoPlayCount = 0;
  }

  // Get current time
  // const currentTime = Date.now();

  // // Check if player took more than MAX_WAITING_TIME to play
  // const timeSinceLastPlay = currentTime - (player.lastPlayTime || 0);
  // const tookTooLong = timeSinceLastPlay >= MAX_WAITING_TIME;

  // Auto-play is detected if:
  // 1. Player took more than MAX_WAITING_TIME to play
  // 2. Auto-play count is less than max
  // return tookTooLong && player.autoPlayCount < MAX_AUTO_PLAY_COUNT;
  return player.autoPlayCount < MAX_AUTO_PLAY_COUNT;
};

// Initialize Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Store active rooms in memory
const rooms = new Map<string, Room>();

// Function to verify Supabase connection
async function verifySupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('rooms').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    console.log('Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Verify connection on startup
verifySupabaseConnection().then(connected => {
  if (!connected) {
    console.warn('Warning: Could not verify Supabase connection on startup');
  }
});

// Add this function at the top level of the file
async function recordRoomHistory(roomId: string, userId: string, action: 'join' | 'leave' | 'reconnect', socketId: string, metadata: any = {}) {
  try {
    const { error } = await supabase
      .from('room_history')
      .insert([{
        room_id: roomId,
        user_id: userId,
        action,
        socket_id: socketId,
        metadata
      }]);

    if (error) {
      console.error('Error recording room history:', error);
    }
  } catch (error) {
    console.error('Error in recordRoomHistory:', error);
  }
}

// Add this helper function at the top level
const findNextActivePlayer = (players: Player[], currentIndex: number): number => {
  let nextIndex = (currentIndex + 1) % players.length;
  while (
    players[nextIndex] &&
    !players[nextIndex].isActive &&
    nextIndex !== currentIndex
  ) {
    nextIndex = (nextIndex + 1) % players.length;
  }
  return nextIndex;
};

// Helper function to emit balance updates
const emitBalanceUpdate = async (socket: Socket, userId: string, io: Server) => {
  try {
    const userBalance = await BalanceService.getUserBalance(userId);
    socket.emit('balance:update', {
      demo: userBalance.demo_balance,
      real: userBalance.real_balance
    });
    // Also broadcast to all clients in the room
    const rooms = [...socket.rooms.values()];
    rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        io.to(roomId).emit('balance:update', {
          userId,
          demo: userBalance.demo_balance,
          real: userBalance.real_balance
        });
      }
    });
  } catch (error) {
    console.error('Error emitting balance update:', error);
  }
};

 // Initialize game state with deck
 const createDeck = (): Card[] => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (let suit of suits) {
    for (let value of values) {
      deck.push({
        id: `${value}-${suit}`,
        suit,
        value,
        rank: values.indexOf(value)
      });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const socketHandler = (io: Server): void => {
  const handleAutoPlayLimit = (socket: Socket, room: Room, player: Player) => {
    if (player.autoPlayCount === MAX_AUTO_PLAY_COUNT) {
      // Disable the player
      player.isActive = false;

      // Notify all players about the auto-exit
      io.to(room.id).emit('player_auto_exited', {
        playerId: player.id,
        username: player.username,
        reason: `${player.username} was disabled for excessive auto-play`
      });

      // Update game state
      if (room.gameState.currentTurn === player.id) {
        // Find next active player
        // const nextPlayerIndex = findNextActivePlayer(room.gameState.players, room.gameState.currentPlayerIndex);
        // room.gameState.currentPlayerIndex = nextPlayerIndex;
        // room.gameState.currentTurn = room.gameState.players[nextPlayerIndex]?.id;

        // // Reset turn timer for next player
        // room.gameState.turnEndTime = Date.now() + MAX_WAITING_TIME;

        // Emit turn change
        io.to(room.id).emit('turn_changed', {
          nextPlayerId: room.gameState.currentTurn,
          gameState: room.gameState
        });
      }

      // Update room state for remaining players
      io.to(room.id).emit('game_state_updated', room.gameState);
    }
  };

  io.on('connection', (socket: Socket) => {
    console.log('New client connected:', socket.id);

    // Handle fetch rooms request with retry logic
    socket.on('fetch_rooms', async (callback?: (response: { success: boolean; rooms: Partial<Room>[]; error?: string }) => void) => {
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          console.log('Fetching rooms from database...');
          // Verify Supabase connection before querying
          const isConnected = await verifySupabaseConnection();
          if (!isConnected) {
            console.error('Supabase connection not available');
            throw new Error('Supabase connection not available');
          }

          // Get all rooms in 'waiting' status
          const { data: roomsData, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('status', 'waiting');

          if (error) {
            console.error('Supabase query error:', error);
            throw error;
          }

          // console.log('Raw rooms data from database:', roomsData?.map(room => ({
          //   id: room.id,
          //   code: room.code,
          //   status: room.status,
          //   name: room.name,
          //   player_count: room.player_count,
          //   max_players: room.max_players
          // })));

          // If no rooms data, return empty array
          if (!roomsData) {
            console.log('No rooms found in database');
            if (callback) {
              callback({ success: true, rooms: [] });
            }
            return;
          }

          // Ensure roomsData is always an array
          const roomsArray = Array.isArray(roomsData) ? roomsData : [roomsData];
          // console.log('Processed rooms array:', roomsArray.map(room => ({
          //   id: room.id,
          //   code: room.code,
          //   status: room.status,
          //   name: room.name,
          //   player_count: room.player_count,
          //   max_players: room.max_players
          // })));

          // Filter out full rooms and add in-memory data including player count
          const availableRooms = roomsArray.map(room => {
            const inMemoryRoom = rooms.get(room.id) || { players: [] };
            const playerCount = inMemoryRoom.players ? inMemoryRoom.players.length : 0;

            // console.log('Processing room:', {
            //   roomId: room.id,
            //   roomCode: room.code,
            //   roomName: room.name,
            //   status: room.status,
            //   playerCount,
            //   maxPlayers: room.max_players,
            //   isInMemory: rooms.has(room.id),
            //   amount_stack: room.amount_stack
            // });

            return {
              id: room.id,
              name: room.name || "Game Room",
              hostName: room.host_name,
              maxPlayers: room.max_players || 2,
              players: inMemoryRoom.players || [],
              isPrivate: room.is_private || false,
              betAmount: room.amount_stack || 0,
              status: room.status,
              createdAt: room.created_at,
              code: room.code,
              amount_stack: room.amount_stack || 0,
              roomType: room.room_type || RoomType.CASUAL,
              config: room.config || roomConfigs[RoomType.CASUAL]
            };
          }).filter(room => {
            const isAvailable = room.players.length < room.maxPlayers;
            // console.log('Room availability check:', {
            //   roomId: room.id,
            //   roomCode: room.code,
            //   roomName: room.name,
            //   playerCount: room.players.length,
            //   maxPlayers: room.maxPlayers,
            //   isAvailable
            // });
            return isAvailable;
          });

          // console.log('Final available rooms after filtering:', availableRooms.map(room => ({
          //   id: room.id,
          //   code: room.code,
          //   name: room.name,
          //   playerCount: room.players.length,
          //   maxPlayers: room.maxPlayers
          // })));

          if (callback) {
            callback({ success: true, rooms: availableRooms });
          }
          return; // Success, exit the retry loop
        } catch (error) {
          console.error(`Error fetching rooms (attempt ${retries + 1}/${maxRetries}):`, error instanceof Error ? error.message : 'Unknown error');
          retries++;

          if (retries === maxRetries) {
            console.error('Max retries reached, returning empty room list');
            if (callback) {
              callback({ success: true, rooms: [] });
            }
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }
    });

    // Handle room creation
    socket.on('create_room', async (roomData: any, callback?: (response: any) => void) => {
      try {
        console.log('Room creation request received:', {
          userId: roomData.userId,
          roomName: roomData.name,
          maxPlayers: roomData.maxPlayers,
          betAmount: roomData.betAmount,
          isPrivate: roomData.isPrivate,
          roomType: roomData.roomType
        });

        if (!roomData.userId) {
          const error = 'Authentication required';
          console.error('Room creation failed:', error);
          socket.emit('room:error', { message: error });
          if (callback) callback({ success: false, error });
          return;
        }

        // Get room configuration based on type
        const roomType = (roomData.roomType || RoomType.CASUAL) as RoomType;
        const config = roomConfigs[roomType];

        // Validate bet amount against room type config
        if (roomData.betAmount < config.minBet || roomData.betAmount > config.maxBet) {
          const error = `Bet amount must be between ${config.minBet} and ${config.maxBet} for ${roomType} rooms`;
          console.error('Room creation failed:', error);
          socket.emit('room:error', { message: error });
          if (callback) callback({ success: false, error });
          return;
        }

        // Generate a unique room code and ID first
        const generateRoomCode = (): string => {
          return Math.floor(100000 + Math.random() * 900000).toString();
        };

        const roomCode = generateRoomCode();
        const roomId = crypto.randomUUID();
        const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // First, try to fix the update_user_balance function if it's causing issues
        try {
          await supabase.rpc('exec_sql', {
            sql: `
              CREATE OR REPLACE FUNCTION update_user_balance(
                p_user_id UUID,
                p_amount INTEGER,
                p_balance_type TEXT,
                p_transaction_type TEXT,
                p_room_id UUID DEFAULT NULL,
                p_metadata JSONB DEFAULT '{}'::jsonb
              ) RETURNS INTEGER AS $$
              DECLARE
                new_balance INTEGER;
              BEGIN
                -- Check if user has sufficient balance for deductions
                IF p_amount < 0 THEN
                  IF p_balance_type = 'demo' THEN
                    IF (SELECT demo_balance FROM user_balance WHERE user_id = p_user_id) + p_amount < 0 THEN
                      RAISE EXCEPTION 'Insufficient demo balance';
                    END IF;
                  ELSE
                    IF (SELECT real_balance FROM user_balance WHERE user_id = p_user_id) + p_amount < 0 THEN
                      RAISE EXCEPTION 'Insufficient real balance';
                    END IF;
                  END IF;
                END IF;

                -- Insert transaction record
                INSERT INTO balance_transactions (
                  user_id,
                  transaction_type,
                  amount,
                  balance_type,
                  room_id,
                  metadata
                ) VALUES (
                  p_user_id,
                  p_transaction_type,
                  p_amount,
                  p_balance_type,
                  p_room_id,
                  p_metadata
                );

                -- Update balance
                IF p_balance_type = 'demo' THEN
                  UPDATE user_balance
                  SET demo_balance = demo_balance + p_amount
                  WHERE user_id = p_user_id
                  RETURNING demo_balance INTO new_balance;
                ELSE
                  UPDATE user_balance
                  SET real_balance = real_balance + p_amount
                  WHERE user_id = p_user_id
                  RETURNING real_balance INTO new_balance;
                END IF;

                RETURN new_balance;
              END;
              $$ LANGUAGE plpgsql SECURITY DEFINER;
            `
          });
          console.log('Successfully updated the update_user_balance function');
        } catch (error) {
          console.error('Error fixing update_user_balance function:', error);
          // Continue anyway - the function might already be fixed
        }

        // First create the room in Supabase
        const { data: supabaseRoom, error: supabaseError } = await supabase
          .from('rooms')
          .insert([{
            id: roomId,
            created_by: roomData.userId,
            status: 'waiting',
            code: roomCode,
            max_players: roomData.maxPlayers || 2,
            amount_stack: roomData.betAmount || 0,
            host_id: roomData.userId,
            host_name: roomData.hostName,
            player_count: 1,
            is_private: roomData.isPrivate || false,
            name: roomData.name || "Game Room",
            passkey: roomData.isPrivate ? roomData.passkey : null,
            is_demo_mode: true, // Set to true for now, can be made configurable later
            room_type: roomType,
            config: config
          }])
          .select()
          .single();

        if (supabaseError) {
          console.error('Supabase room creation error:', supabaseError);
          socket.emit('room:error', { message: `Failed to create room in database: ${supabaseError.message}` });
          if (callback) callback({ success: false, error: supabaseError.message });
          return;
        }

        // Now process the balance deduction since room exists
        const { data: newBalance, error: deductError } = await supabase.rpc('process_room_entry', {
          p_user_id: roomData.userId,
          p_room_id: roomId,
          p_amount: roomData.betAmount,
          p_balance_type: 'demo',
          p_transaction_id: transactionId
        });

        if (deductError) {
          // If balance deduction fails, delete the created room
          await supabase
            .from('rooms')
            .delete()
            .eq('id', roomId);

          console.error('Error processing room entry fee:', {
            error: deductError,
            userId: roomData.userId,
            betAmount: roomData.betAmount,
            transactionId
          });

          let errorMessage = 'Failed to process entry fee';
          if (deductError.message.includes('Insufficient')) {
            errorMessage = 'Insufficient balance to create room';
          } else if (deductError.message.includes('limit exceeded')) {
            errorMessage = 'Daily limit exceeded';
          }

          socket.emit('room:error', { message: errorMessage });
          if (callback) callback({ success: false, error: errorMessage });
          return;
        }

        // Check if user exists
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', roomData.userId)
          .single();

        if (userError) {
          // Refund the entry fee since room creation failed
          await supabase.rpc('refund_room_entry', {
            p_user_id: roomData.userId,
            p_amount: roomData.betAmount,
            p_balance_type: 'demo',
            p_transaction_id: transactionId
          });

          // Emit balance update after refund
          await emitBalanceUpdate(socket, roomData.userId, io);

          console.error('User not found:', userError);
          socket.emit('room:error', { message: 'User not found' });
          if (callback) callback({ success: false, error: 'User not found' });
          return;
        }

        console.log('Room created in database:', { roomId, roomCode });

        // Update game state with room type configuration
        const roomWithPlayers = {
          ...supabaseRoom,
          roomName: roomData.name,
          hostName: roomData.hostName,
          isPrivate: roomData.isPrivate || false,
          password: roomData.passkey || null,
          room_type: roomType,
          players: [{
            id: socket.id,
            userId: roomData.userId,
            username: roomData.hostName,
            isHost: true,
            isReady: true,
            cards: [],
            score: 0,
            isActive: true,
            autoPlayCount: 0,
            shuffleCount: 0
          }],
          gameState: {
            status: 'waiting',
            players: [{
              id: socket.id,
              userId: roomData.userId,
              username: roomData.hostName,
              isHost: true,
              isReady: true,
              cards: [],
              score: 0,
              isActive: true,
              autoPlayCount: 0,
              shuffleCount: 0
            }],
            currentPlayerIndex: 0,
            centralPile: [],
            gameStarted: false,
            isGameOver: false,
            gameStartTime: null,
            roomDuration: config.gameDuration,
            turnEndTime: null,
            requiredPlayers: roomData.maxPlayers || config.maxPlayers,
            waitingTimer: 3 * 60 * 1000,
            waitingStartTime: Date.now(),
            autoStartEnabled: true,
            debugMode: false,
            roomType: roomType,
            config: config
          }
        };

        rooms.set(roomId, roomWithPlayers);
        console.log('Room added to memory:', { roomId, playerCount: 1 });

        // Join the room first
        socket.join(roomId);

        // Broadcast the new room to all connected clients
        const roomToBroadcast = {
          id: roomId,
          name: roomData.name || "Game Room",
          hostName: roomData.hostName,
          maxPlayers: roomData.maxPlayers || 2,
          players: roomWithPlayers.players,
          isPrivate: roomData.isPrivate || false,
          password: roomData.passkey || null,
          status: 'waiting',
          betAmount: roomData.betAmount || 0,
          createdAt: supabaseRoom.created_at,
          room_type: roomType,
          gameMode: 'normal'
        };

        // Broadcast to all clients except the creator
        socket.broadcast.emit('room:created', roomToBroadcast);

        // Send room creation success to the creator with full room data
        socket.emit('room:created', roomWithPlayers);

        // Also emit room:joined since the creator is automatically added
        socket.emit('room:joined', roomWithPlayers);

        // Emit game state update to all players in the room
        io.to(roomId).emit('game_state_updated', roomWithPlayers.gameState);

        console.log('Room creation completed successfully:', { roomId, roomCode });

        // After successful balance deduction
        if (newBalance !== undefined) {
          await emitBalanceUpdate(socket, roomData.userId, io);
        }

        if (callback) {
          callback({
            success: true,
            room: roomWithPlayers,
            roomId,
            roomCode
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating room:', errorMessage);
        socket.emit('room:error', { message: `Failed to create room: ${errorMessage}` });
        if (callback) callback({ success: false, error: errorMessage });
      }
    });

    // Handle joining a room
    socket.on('join_room', async (roomData, callback) => {
      console.log('Join room request received:', roomData);
      try {
        const { roomId, userId, username, password } = roomData;
        console.log('Join room request received:', { roomId, userId, username });

        if (!userId) {
          console.log('Join room failed: Authentication required');
          socket.emit('room:error', { message: 'Authentication required' });
          if (callback) callback({ success: false, error: 'Authentication required' });
          return;
        }

        // Check if room exists in memory first
        let currentRoom = rooms.get(roomId);

        // If not in memory, try to find it in the database
        if (!currentRoom) {
          console.log('Room not found in memory, checking database...');
          const { data: dbRoom, error: dbError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

          if (dbError || !dbRoom) {
            console.log('Room not found in database:', dbError);
            if (callback) {
              callback({ success: false, error: 'Room not found' });
            }
            return;
          }

          // Initialize room in memory with current timestamp and amount_stack
          currentRoom = {
            ...dbRoom,
            amount_stack: dbRoom.amount_stack,
            betAmount: dbRoom.amount_stack,
            players: [],
            gameState: {
              status: 'waiting',
              players: [],
              currentPlayerIndex: 0,
              centralPile: [],
              gameStarted: false,
              isGameOver: false,
              gameStartTime: null,
              roomDuration: 5 * 60 * 1000,
              turnEndTime: null,
              requiredPlayers: dbRoom.max_players,
              waitingTimer: 3 * 60 * 1000,
              waitingStartTime: Date.now(),
              autoStartEnabled: true,
              debugMode: false
            }
          } as Room;
          rooms.set(roomId, currentRoom);
        }

        // At this point, currentRoom is guaranteed to be defined
        const room = currentRoom;

        // Check if player is already in the room
        const existingPlayer = room.players.find(p => p.userId === userId);
        if (existingPlayer) {
          // Update the socket ID for reconnecting player
          existingPlayer.id = socket.id;
          socket.join(roomId);
          console.log('Reconnecting existing player:', existingPlayer);

          // Record reconnection in history
          await recordRoomHistory(roomId, userId, 'reconnect', socket.id, {
            previousSocketId: existingPlayer.id,
            username: existingPlayer.username
          });

          if (callback) {
            const responseRoom = {
              ...room,
              amount_stack: room.amount_stack,
              betAmount: room.amount_stack,
              roomType: room.roomType // Add room type to response
            };
            callback({
              success: true,
              room: responseRoom
            });
          }
          return;
        }

        // Check if game has already started - prevent new players from joining
        if (room.gameState && room.gameState.status !== 'waiting') {
          console.log('Join room failed: Game has already started');
          if (callback) {
            callback({ success: false, error: 'Game has already started. Cannot join now.' });
          }
          return;
        }

        // Check if room is private and validate password, but skip for room creator
        if (room.isPrivate) {
          // Fetch the room from database to get the creator and passkey
          const { data: dbRoom, error: dbError } = await supabase
            .from('rooms')
            .select('created_by, passkey, is_private')
            .eq('id', roomId)
            .single();

          if (dbError) {
            console.error('Error fetching room:', dbError);
            if (callback) {
              callback({ success: false, error: 'Error validating room' });
            }
            return;
          }

          console.log('Room details:', {
            roomId,
            isPrivate: room.isPrivate,
            dbIsPrivate: dbRoom.is_private,
            storedPasskey: dbRoom.passkey,
            providedPassword: password,
            isCreator: dbRoom.created_by === userId,
            passwordMatch: dbRoom.passkey === password,
            userId,
            createdBy: dbRoom.created_by
          });

          // Skip password check if the user is the room creator
          if (dbRoom.created_by !== userId) {
            // For private rooms, ensure password matches exactly
            if (!password || !dbRoom.passkey || password !== dbRoom.passkey) {
              console.log('Join room failed: Invalid password. Details:', {
                providedPassword: password,
                storedPasskey: dbRoom.passkey,
                match: password === dbRoom.passkey
              });
              if (callback) {
                callback({ success: false, error: 'Invalid password' });
              }
              return;
            }
          }
        }

        // Check if room is full
        if (room.players.length >= room.max_players) {
          console.log('Join room failed: Room is full');
          if (callback) {
            callback({ success: false, error: 'Room is full' });
          }
          return;
        }

        // Process balance deduction for room entry
        if (room.amount_stack > 0) {
          try {
            console.log(`Processing balance deduction for user ${userId} joining room ${roomId}`);
            console.log(`Bet amount from room: ${room.amount_stack}`);

            // Generate a transaction ID for the balance deduction
            const transactionId = crypto.randomUUID();

            // Call the supabase function to process the room entry fee
            const { data: balanceData, error: balanceError } = await supabase.rpc(
              'process_room_entry',
              {
                p_user_id: userId,
                p_room_id: roomId,
                p_amount: room.amount_stack,
                p_balance_type: 'demo',
                p_transaction_id: transactionId
              }
            );

            if (balanceError) {
              console.error(`Balance deduction error: ${JSON.stringify(balanceError)}`);
              socket.emit('room:error', {
                message: 'Failed to process entry fee',
                details: balanceError.message || 'Balance deduction failed'
              });

              if (callback) {
                callback({ success: false, error: 'Failed to process entry fee' });
              }
              return;
            }

            console.log(`Balance deduction successful: ${JSON.stringify(balanceData)}`);
          } catch (error) {
            console.error(`Exception in balance processing: ${error instanceof Error ? error.message : String(error)}`);
            socket.emit('room:error', { message: 'Failed to process entry fee', details: String(error) });

            if (callback) {
              callback({ success: false, error: 'Failed to process entry fee' });
            }
            return;
          }
        }

        // Add player to room in memory
        const newPlayer = {
          id: socket.id,
          userId: userId,
          username: username,
          isHost: false,
          isReady: false,
          cards: [],
          shuffleCount: 0
        };

        room.players.push(newPlayer);

        // Add player to game state
        if (room.gameState) {
          room.gameState.players.push({
            ...newPlayer,
            cards: [],
            score: 0,
            isActive: true,
            autoPlayCount: 0
          });

          // Check if we have all required players
          if (room.gameState.players.length === room.gameState.requiredPlayers) {
            room.gameState.status = 'ready';
            // Emit room ready event
            io.to(roomId).emit('room:ready', { roomId });
          }
        }

        rooms.set(roomId, room);
        socket.join(roomId);

        // Update player count in database
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ player_count: room.players.length })
          .eq('id', roomId);

        if (updateError) {
          console.error('Failed to update player count:', updateError);
        }

        // Notify room about new player
        io.to(roomId).emit('player_joined', {
          player: newPlayer
        });

        // Emit rooms updated to all clients
        io.emit('rooms_updated');

        // Emit game state update to all players
        io.to(roomId).emit('game_state_updated', room.gameState);

        // Emit updated balance to the joining player
        await emitBalanceUpdate(socket, userId, io);

        console.log('Player successfully joined room:', {
          roomId,
          playerCount: room.players.length,
          maxPlayers: room.max_players,
          status: room.gameState.status
        });

        // Record join in history after successful join
        await recordRoomHistory(roomId, userId, 'join', socket.id, {
          username,
          isPrivate: room.isPrivate,
          playerCount: room.players.length
        });

        // After successfully joining the room
        if (room.gameState) {
          io.to(roomId).emit('timer:sync', {
            waitingStartTime: room.gameState.waitingStartTime,
            waitingTimer: room.gameState.waitingTimer
          });
        }

        // Send proper callback response
        if (callback) {
          const responseRoom = {
            ...room,
            amount_stack: room.amount_stack,
            betAmount: room.amount_stack,
            roomType: room.roomType // Add room type to response
          };
          callback({
            success: true,
            room: responseRoom
          });
        }
      } catch (error) {
        console.error('Error in join_room:', error);
        if (callback) {
          callback({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      }
    });

    // Handle player readiness
    socket.on('player_ready', async (roomId, callback) => {
      try {
        const room = rooms.get(roomId);
        if (!room) {
          if (callback) {
            callback({ success: false, error: 'Room not found' });
          }
          return;
        }

        const player = room.players.find(p => p.id === socket.id);
        if (!player) {
          if (callback) {
            callback({ success: false, error: 'Player not found in room' });
          }
          return;
        }

        player.isReady = !player.isReady;

        // Update readiness in database
        const { error } = await supabase
          .from('profiles')
          .update({ is_ready: player.isReady })
          .eq('id', socket.id);

        if (error) {
          if (callback) {
            callback({ success: false, error: error.message });
          }
          return;
        }

        // Notify room about player readiness change
        io.to(roomId).emit('player_readiness_changed', {
          playerId: socket.id,
          isReady: player.isReady
        });

        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        console.error('Error in player_ready:', error);
        if (callback) {
          callback({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' });
        }
      }
    });

    // Handle leave room
    socket.on('leave_room', async (roomId) => {
      try {
        console.log('Player leaving room:', { socketId: socket.id, roomId });

        const room = rooms.get(roomId);
        if (!room) {
          console.log('Room not found for leave_room:', roomId);
          return;
        }

        // Find and remove the player
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const player = room.players[playerIndex];

          // Record leave in history before removing player
          await recordRoomHistory(roomId, player.userId, 'leave', socket.id, {
            username: player.username,
            isHost: player.isHost,
            playerCount: room.players.length - 1
          });

          // Remove player from room
          room.players.splice(playerIndex, 1);

          // Update player count in database
          await supabase
            .from('rooms')
            .update({ player_count: room.players.length })
            .eq('id', roomId);

          // If player was host, assign new host or delete room
          if (player.isHost && room.players.length > 0) {
            const newHost = room.players[0];
            newHost.isHost = true;
            await supabase
              .from('rooms')
              .update({
                host_id: newHost.userId,
                host_name: newHost.username
              })
              .eq('id', roomId);
          }

          // If no players left, delete the room
          if (room.players.length === 0) {
            await supabase
              .from('rooms')
              .delete()
              .eq('id', roomId);
            rooms.delete(roomId);
          }

          // Notify remaining players
          io.to(roomId).emit('player_left', {
            playerId: socket.id,
            playerName: player.username,
            isHost: player.isHost
          });

          // Emit rooms updated to all clients
          io.emit('rooms_updated');
        }

        // Leave the socket room
        socket.leave(roomId);

      } catch (error) {
        console.error('Error in leave_room:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        console.log('User disconnected:', socket.id);

        // Find all rooms where this player is present
        for (const [roomId, room] of rooms.entries()) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = room.players[playerIndex];

            // Update player count in database
            await supabase
              .from('rooms')
              .update({ player_count: room.players.length - 1 })
              .eq('id', roomId);

            // If player was host, assign new host or delete room
            if (player.isHost) {
              if (room.players.length > 1) {
                // Assign new host
                const newHost = room.players.find(p => !p.isHost);
                if (newHost) {
                  newHost.isHost = true;
                  await supabase
                    .from('rooms')
                    .update({
                      host_id: newHost.userId,
                      host_name: newHost.username || newHost.name
                    })
                    .eq('id', roomId);
                }
              } else {
                // Delete room if no players left
                await supabase
                  .from('rooms')
                  .delete()
                  .eq('id', roomId);
                rooms.delete(roomId);
                io.emit('rooms_updated');
                continue;
              }
            }

            // Remove player from room
            room.players.splice(playerIndex, 1);

            // Update game state if game was in progress
            if (room.gameState && room.gameState.status === 'in_progress') {
              // Handle game state cleanup
              room.gameState.players = room.gameState.players.filter(p => p.id !== socket.id);
              if (room.gameState.currentTurn === socket.id) {
                // Move to next player if it was disconnected player's turn
                const nextPlayerIndex = room.gameState.players.findIndex(p => p.id === socket.id) + 1;
                room.gameState.currentTurn = room.gameState.players[nextPlayerIndex % room.gameState.players.length].id;
              }
              io.to(roomId).emit('game_state_updated', room.gameState);
            }

            // Notify remaining players
            io.to(roomId).emit('player_left', {
              playerId: socket.id,
              playerName: player.username || player.name,
              isHost: player.isHost
            });

            // Emit rooms updated to all clients
            io.emit('rooms_updated');
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error instanceof Error ? error.message : 'Unknown error');
        // Socket.leaveAll is private, leave all rooms differently
        const rooms = [...socket.rooms.values()];
        rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
      }
    });

    // Handle game start
    socket.on('start_game', async (roomId, callback) => {
      try {
        console.log('Start game request received for room:', roomId);

        const room = rooms.get(roomId);
        if (!room) {
          throw new Error('Room not found');
        }

        // Check if room is full or waiting timer has expired
        const isRoomFull = room.players.length >= room.gameState.requiredPlayers;
        const waitingTimeElapsed = Date.now() - room.gameState.waitingStartTime >= room.gameState.waitingTimer;

        // Check if we have enough players to start
        if (room.players.length < 2) {
          console.log('Not enough players to start:', {
            currentPlayers: room.players.length,
            required: 2
          });
          throw new Error('Need at least 2 players to start the game');
        }

        if (!isRoomFull && !waitingTimeElapsed && !room.gameState.autoStartEnabled) {
          console.log('Room not ready to start:', {
            status: room.gameState.status,
            players: room.players.length,
            required: room.gameState.requiredPlayers,
            waitingTimeElapsed,
            autoStartEnabled: room.gameState.autoStartEnabled
          });
          throw new Error('Room is not ready to start');
        }

        // Check if user is host
        const isHost = room.players[0]?.id === socket.id;
        if (!isHost && !isRoomFull && !waitingTimeElapsed) {
          throw new Error('Only host can start the game');
        }

       

        const deck = shuffleDeck(createDeck());
        const cardsPerPlayer = Math.floor(deck.length / room.gameState.players.length);

        // Update game state
        room.gameState.status = 'in_progress';
        room.gameState.gameStarted = true;
        room.gameState.gameStartTime = Date.now();
        room.gameState.currentPlayerIndex = 0; // Start with first player
        room.gameState.turnEndTime =   Date.now() + room.config.turnTime;

        console.log('Setting initial game state:', {
          status: room.gameState.status,
          gameStarted: room.gameState.gameStarted,
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          firstPlayerId: room.gameState.players[0].userId,
          firstPlayerName: room.gameState.players[0].username,
          allPlayers: room.gameState.players.map(p => ({
            id: p.id,
            userId: p.userId,
            username: p.username
          }))
        });

        // Distribute cards to players
        room.gameState.players.forEach((player, index) => {
          player.cards = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
          player.shuffleCount = 0; // Reset shuffle count for new chance
          console.log(`Distributed ${player.cards.length} cards to player:`, {
            username: player.username,
            userId: player.userId,
            isFirstPlayer: index === 0,
            shuffleCount: player.shuffleCount
          });
        });

        // Set remaining cards to central pile
        room.gameState.centralPile = deck.slice(cardsPerPlayer * room.gameState.players.length);

        // Update room state
        room.status = 'playing';
        rooms.set(roomId, room);

        // Update room status in database
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ status: 'playing' })
          .eq('id', roomId);

        if (updateError) {
          console.error('Failed to update room status in database:', updateError);
          throw new Error('Failed to update room status');
        }

        // Emit an immediate game state update to ensure all clients are in sync
        io.to(roomId).emit('game:update', {
          gameState: room.gameState
        });

        // Notify all players about game start
        io.to(roomId).emit('game:start', {
          roomId,
          gameState: room.gameState
        });

        // Emit rooms updated to all clients
        io.emit('rooms_updated');

        console.log('Game started successfully:', {
          roomId,
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          firstPlayer: {
            userId: room.gameState.players[0].userId,
            username: room.gameState.players[0].username
          },
          totalPlayers: room.gameState.players.length
        });

        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        console.error('Error starting game:', error);
        if (callback) {
          callback({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to start game'
          });
        }
      }
    });

    // Handle shuffle deck
    socket.on('shuffle_deck', ({ roomId }) => {
      try {
        const room = rooms.get(roomId);
        if (!room || !room.gameState) {
          console.log('Room or game state not found for shuffle');
          return;
        }

        const player = room.gameState.players.find(p => p.id === socket.id);
        if (!player) {
          console.log('Player not found for shuffle');
          return;
        }

        // Check if player has reached shuffle limit
        if (player.shuffleCount >= 2) {
          console.log('Player has reached maximum shuffle limit');
          socket.emit('error', { message: 'You have reached the maximum number of shuffles for this chance' });
          return;
        }

        // Shuffle the player's cards
        const shuffleCards = (cards: Card[]): Card[] => {
          for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
          }
          return cards;
        };

        player.cards = shuffleCards([...player.cards]);
        player.shuffleCount += 1; // Increment shuffle count

        // Emit the updated game state
        io.to(roomId).emit('game_state_updated', room.gameState);
      } catch (error) {
        console.error('Error in shuffle_deck:', error);
      }
    });

    // Handle purchase shuffle
    socket.on('purchase_shuffle', async ({ roomId, playerId, amount }) => {
      try {
        const room = rooms.get(roomId);
        if (!room || !room.gameState) {
          console.log('Room or game state not found for shuffle purchase');
          return;
        }

        const player = room.gameState.players.find(p => p.id === playerId);
        if (!player) {
          console.log('Player not found for shuffle purchase');
          return;
        }

        // Process the payment
        try {
          const newBalance = await BalanceService.processGameResultWithNotification(
            player.userId,
            false, // isWinner (false since this is a purchase)
            amount,
            'demo', // balanceType (using demo balance for purchases)
            roomId,
            {
              socketId: player.id,
              reason: 'shuffle_purchase',
              isLastPayout: true
            }
          );

          console.log('Successfully processed shuffle purchase:', {
            playerId: player.userId,
            socketId: player.id,
            amount,
            newBalance,
            roomId
          });

          // Emit balance update to all clients in the room
          io.to(roomId).emit('balance:update', {
            userId: player.userId,
            socketId: player.id,
            demo: newBalance,
            real: 0
          });

          // Also emit to the player's socket specifically
          const playerSocket = io.sockets.sockets.get(player.id);
          if (playerSocket) {
            playerSocket.emit('balance:update', {
              userId: player.userId,
              demo: newBalance,
              real: 0
            });
          }

          // Reset shuffle count to allow one more shuffle
          player.shuffleCount = 0;

          // Emit the updated game state
          io.to(roomId).emit('game_state_updated', room.gameState);

          // Notify the player of successful purchase
          socket.emit('shuffle_purchased', {
            success: true,
            message: 'Successfully purchased additional shuffle'
          });

        } catch (error) {
          console.error('Failed to process shuffle purchase:', error);
          socket.emit('error', { 
            message: 'Failed to process shuffle purchase. Please try again.' 
          });
        }
      } catch (error) {
        console.error('Error in purchase_shuffle:', error);
        socket.emit('error', { 
          message: 'An error occurred while processing your request.' 
        });
      }
    });

    // Handle play card
    socket.on('play_card', async ({ id, card, roomId }) => {
      try {
       

        const room = rooms.get(roomId);
        if (!room) {
          console.error('Room not found:', roomId);
          return;
        }

        // Check if game is over
        if (room.gameState.isGameOver) {
          console.log('Game is over, cannot play cards');
          return;
        }

        // Find the player
        const player = room.gameState.players.find(p => p.id === id);
        if (!player) {
          console.error('Player not found:', id);
          return;
        }

        // Check if player is disabled
        if (!player.isActive) {
          console.log('Player is disabled, skipping turn:', player.username);
          // Move to next active player
          const nextPlayerIndex = findNextActivePlayer(room.gameState.players, room.gameState.currentPlayerIndex);
          room.gameState.currentPlayerIndex = nextPlayerIndex;
          room.gameState.currentTurn = room.gameState.players[nextPlayerIndex].id;

          // Emit turn change
          io.to(roomId).emit('turn_changed', {
            nextPlayerId: room.gameState.currentTurn,
            gameState: room.gameState
          });
          return;
        }

        // Initialize auto-play count if not exists
        if (player.autoPlayCount === undefined) {
          player.autoPlayCount = 0;
        }

        // Always reset any previous match animation state first
        if (room.gameState.matchAnimation) {
          room.gameState.matchAnimation.isActive = false;
        }

        // Validate player's turn
        const playerIndex = room.gameState.players.findIndex(p => p.id === id);
        if (room.gameState.currentPlayerIndex !== playerIndex) {
          console.log('Not player\'s turn:', {
            currentPlayerIndex: room.gameState.currentPlayerIndex,
            playerIndex: playerIndex,
            playerId: id
          });
          return;
        }

        // Verify card exists in player's deck
        const cardIndex = player.cards.findIndex(c =>
          c.value === card.value && c.suit === card.suit
        );

        if (cardIndex === -1) {
          console.error('Card not found in player\'s deck:', {
            playerId: id,
            card,
            playerCardsCount: player.cards.length
          });
          return;
        }

        console.log('Successfully playing card:', {
          player: player.username,
          card: `${card.value}-${card.suit}`,
          roomId
        });

        // Update last play time after all validations pass
        player.lastPlayTime = Date.now();

        // Check for auto-play
        if (isAutoPlay(player, card) && !card.isHitButton) {
          player.autoPlayCount++;
          console.log('Auto-play detected:', {
            playerId: id,
            username: player.username,
            autoPlayCount: player.autoPlayCount,
            timeSinceLastPlay: Date.now() - (player.lastPlayTime || 0)
          });

          // Notify the player about their auto-play count
          socket.emit('auto_play_warning', {
            count: player.autoPlayCount,
            maxCount: MAX_AUTO_PLAY_COUNT,
            message: `Warning: Auto-play detected (${player.autoPlayCount}/${MAX_AUTO_PLAY_COUNT})`
          });

          // Check if player should be auto-exited
          handleAutoPlayLimit(socket, room, player);
        }

        // Remove card from player's deck
        const [playedCard] = player.cards.splice(cardIndex, 1);

        // Check if player has no cards left after playing
        if (player.cards.length === 0) {
          console.log('Player has no cards left, checking for winner:', {
            playerId: player.id,
            username: player.username,
            activePlayers: room.gameState.players.filter(p => p.isActive !== false).length
          });

          // Disable player instead of removing them
          player.isActive = false;

          // Check if only one active player remains
          const activePlayers = room.gameState.players.filter(p => p.isActive !== false);
          console.log('Active players after disabling:', {
            count: activePlayers.length,
            players: activePlayers.map(p => ({ id: p.id, username: p.username }))
          });

          if (activePlayers.length === 1) {
            const lastPlayer = activePlayers[0];
            console.log('Declaring winner by cards:', {
              winnerId: lastPlayer.id,
              winnerName: lastPlayer.username,
              roomId: roomId
            });

            // Set the last player as winner and end the game
            room.gameState.isGameOver = true;
            room.gameState.winner = lastPlayer;

            // Update room status to completed
            room.status = 'completed';
            rooms.set(roomId, room);

            // Update room status in database
            const { error: updateError } = await supabase
              .from('rooms')
              .update({ status: 'completed' })
              .eq('id', roomId);

            if (updateError) {
              console.error('Failed to update room status:', updateError);
            }

            // Calculate total pool amount
            const totalPoolAmount = room.amount_stack * room.players.length;

            // Process the payout directly here
            try {
              const newBalance = await BalanceService.processGameResultWithNotification(
                lastPlayer.userId,
                true, // isWinner
                totalPoolAmount,
                'demo', // balanceType
                roomId,
                {
                  socketId: lastPlayer.id,
                  totalPlayers: room.players.length,
                  amountPerPlayer: room.amount_stack,
                  reason: 'last_player_standing',
                  isLastPayout: true
                }
              );

              console.log('Successfully credited pool amount to winner:', {
                winnerId: lastPlayer.userId,
                socketId: lastPlayer.id,
                amount: totalPoolAmount,
                newBalance,
                roomId
              });

              // Emit balance update to all clients in the room
              io.to(roomId).emit('balance:update', {
                userId: lastPlayer.userId,
                socketId: lastPlayer.id,
                demo: newBalance,
                real: 0
              });

              // Also emit to the winner's socket specifically
              const winnerSocket = io.sockets.sockets.get(lastPlayer.id);
              if (winnerSocket) {
                winnerSocket.emit('balance:update', {
                  userId: lastPlayer.userId,
                  demo: newBalance,
                  real: 0
                });
              }
            } catch (error) {
              console.error('Failed to credit pool amount to winner:', error);
            }

            // Emit game_over event to notify all clients
            io.to(roomId).emit('game_over', {
              winner: lastPlayer,
              reason: 'last_player_standing',
              poolAmount: totalPoolAmount
            });

            // Emit rooms updated to all clients
            io.emit('rooms_updated');
          }

          // Notify all players about the player being disabled
          io.to(roomId).emit('player_disabled', {
            playerId: player.id,
            username: player.username,
            reason: 'no_cards'
          });
        }

        // Get the current top card before adding the new one
        const centralPileLength = room.gameState.centralPile.length;
        const topCard = centralPileLength > 0 ? room.gameState.centralPile[centralPileLength - 1] : null;

        // Add card to central pile
        room.gameState.centralPile.push(playedCard);

        // Check for a match with the previous top card only
        let hasMatch = false;
        if (topCard && topCard.value === playedCard.value) {
          hasMatch = true;

          console.log('Match found with top card:', {
            playedCard: `${playedCard.value}-${playedCard.suit}`,
            topCard: `${topCard.value}-${topCard.suit}`,
            player: player.username
          });

          // Handle match animation
          room.gameState.matchAnimation = {
            isActive: true,
            cardId: playedCard.id,
            playerId: id,
            timestamp: Date.now()
          };

          // Collect ALL cards from central pile
          const allCentralPileCards = [...room.gameState.centralPile];
          const totalCardsCollected = allCentralPileCards.length;

          console.log('Player collecting all central pile cards:', {
            player: player.username,
            totalCardsCollected,
            matchValue: playedCard.value
          });

          // Clear the central pile
          room.gameState.centralPile = [];

          // Add all cards to player's deck
          player.cards.push(...allCentralPileCards);

          // Emit match event
          io.to(roomId).emit('card_match', {
            playerId: id,
            cards: allCentralPileCards
          });

          // Keep the same player's turn after a match
          room.gameState.currentTurn = player.id;
          room.gameState.currentPlayerIndex = room.gameState.players.findIndex(p => p.id === player.id);
        } else {
          // Move to next active player only if there was no match
          const nextPlayerIndex = findNextActivePlayer(room.gameState.players, room.gameState.currentPlayerIndex);
          room.gameState.currentPlayerIndex = nextPlayerIndex;
          room.gameState.currentTurn = room.gameState.players[nextPlayerIndex].id;
        }

        // Set turn end time (15 seconds from now)
        room.gameState.turnEndTime = Date.now() + room.config.turnTime;

        console.log('Turn changed to next player:', {
          previousPlayerIndex: playerIndex,
          newPlayerIndex: room.gameState.currentPlayerIndex,
          newPlayerName: room.gameState.players[room.gameState.currentPlayerIndex].username,
          hadMatch: hasMatch
        });

        // Update game state for all players
        io.to(roomId).emit('game_state_updated', {
          ...room.gameState,
          players: room.gameState.players.map(p => ({
            ...p,
            autoPlayCount: p.autoPlayCount || 0
          }))
        });

        // Notify players of turn change
        io.to(roomId).emit('turn_changed', {
          previousPlayerId: id,
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          currentPlayerId: room.gameState.players[room.gameState.currentPlayerIndex].id,
          nextPlayerUsername: room.gameState.players[room.gameState.currentPlayerIndex].username,
          turnEndTime: room.gameState.turnEndTime
        });

        // Notify all clients about the card play
        io.to(roomId).emit('play_card', {
          playerId: id,
          card: playedCard
        });

        // Set a timeout to clear the match animation state after 3 seconds
        setTimeout(() => {
          // Only clear if this is still the active match
          if (room && room.gameState && room.gameState.matchAnimation &&
            room.gameState.matchAnimation.cardId === playedCard.id) {
            room.gameState.matchAnimation.isActive = false;
            // Emit updated game state
            io.to(roomId).emit('game_state_updated', room.gameState);
          }
        }, 3000);

      } catch (error) {
        console.error('Error in play_card:', error);
      }
    });

    socket.on('end_game', async ({ roomId, winnerId, reason }) => {
      try {
        const room = rooms.get(roomId);
        console.log('End game request received:', {
          roomId,
          winnerId,
          reason,
          roomStatus: room?.status,
          gameState: room?.gameState
        });

        if (!room) {
          console.error('Room not found:', roomId);
          return;
        }

        // Check if game is already over to prevent duplicate payouts
        if (room.status === 'completed') {
          console.log('Game already ended, skipping duplicate end_game event');
          return;
        }

        // Update room status to completed
        room.status = 'completed';
        rooms.set(roomId, room);

        // Update room status in database
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ status: 'completed' })
          .eq('id', roomId);

        if (updateError) {
          console.error('Failed to update room status:', updateError);
        }

        // Emit rooms updated to all clients
        io.emit('rooms_updated');

        // Find the winner if not already set in gameState
        let winner = room.gameState.winner;
        if (!winner && winnerId) {
          winner = room.gameState.players.find(p => p.id === winnerId);
          if (winner) {
            room.gameState.winner = winner;
          }
        }

        console.log('Processing winner payout:', {
          winnerId: winner?.id,
          winnerName: winner?.username,
          reason,
          roomId
        });

        if (!winner) {
          console.error('No winner found in game state');
          return;
        }

        // Calculate total pool amount (bet amount * number of players)
        const totalPoolAmount = (room.amount_stack * room.players.length) + (room.amount_stack * room.gameState.cardRequestedCount);
        console.log('Calculating pool amount:', {
          amountPerPlayer: room.amount_stack,
          totalPlayers: room.players.length,
          totalPoolAmount
        });

        // Credit the pool amount to the winner
        try {
          const newBalance = await BalanceService.processGameResultWithNotification(
            winner.userId,
            true, // isWinner
            totalPoolAmount,
            'demo', // balanceType
            roomId,
            {
              socketId: winner.id,
              totalPlayers: room.players.length,
              amountPerPlayer: room.amount_stack,
              reason: reason || 'game_ended',
              isLastPayout: true
            }
          );

          console.log('Successfully credited pool amount to winner:', {
            winnerId: winner.userId,
            socketId: winner.id,
            amount: totalPoolAmount,
            newBalance,
            roomId,
            reason
          });

          // Emit balance update to all clients in the room
          io.to(roomId).emit('balance:update', {
            userId: winner.userId,
            socketId: winner.id,
            demo: newBalance,
            real: 0
          });

          // Also emit to the winner's socket specifically
          const winnerSocket = io.sockets.sockets.get(winner.id);
          if (winnerSocket) {
            winnerSocket.emit('balance:update', {
              userId: winner.userId,
              demo: newBalance,
              real: 0
            });
          }
        } catch (error) {
          console.error('Failed to credit pool amount to winner:', error);
        }

        // Notify all players about the game over
        io.to(roomId).emit('game_over', {
          winner,
          reason: reason || 'game_ended',
          poolAmount: totalPoolAmount
        });
      } catch (error) {
        console.error('Error ending game:', error);
      }
    });

    socket.on('timer:request_sync', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.gameState) {
        // Broadcast timer state to all clients in the room instead of just the requesting client
        io.to(roomId).emit('timer:sync', {
          waitingStartTime: room.gameState.waitingStartTime,
          waitingTimer: room.gameState.waitingTimer
        });
      }
    });

    socket.on('timer:complete', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room && room.gameState) {
        // Notify all clients in the room that timer is complete
        io.to(roomId).emit('timer:sync', {
          waitingStartTime: room.gameState.waitingStartTime,
          waitingTimer: 0
        });

        // If room is full, emit start_game event
        if (room.players.length >= room.gameState.requiredPlayers) {
          socket.emit('start_game', roomId, (response: { success: boolean; error?: string }) => {
            if (!response.success) {
              console.error('Failed to start game after timer completion:', response.error);
            }
          });
        }
      }
    });

    // Add check for waiting timer expiration
    socket.on('check_waiting_timer', async (roomId) => {
      try {
        const room = rooms.get(roomId);
        if (!room) {
          console.log('Room not found for timer check:', roomId);
          return;
        }

        const waitingTimeElapsed = Date.now() - room.gameState.waitingStartTime >= room.gameState.waitingTimer;

        if (waitingTimeElapsed) {
          console.log('Waiting timer expired for room:', roomId);

          if (room.players.length > 1) {
            // Auto-start the game if more than one player
            console.log('Auto-starting game with multiple players');
            room.gameState.autoStartEnabled = true;
            socket.emit('start_game', roomId);
          } else {
            // Close room and kick the single player if only one player
            console.log('Closing room due to insufficient players');

            // Notify the player
            io.to(roomId).emit('room_closed', {
              reason: 'Insufficient players when timer expired'
            });

            // Remove player from room
            const player = room.players[0];
            if (player) {
              socket.leave(roomId);
            }

            // Delete room from memory
            rooms.delete(roomId);

            // Update room status in database
            const { error: updateError } = await supabase
              .from('rooms')
              .update({ status: 'completed' })
              .eq('id', roomId);

            if (updateError) {
              console.error('Failed to update room status in database:', updateError);
            }

            // Emit rooms updated to all clients
            io.emit('rooms_updated');
          }
        }
      } catch (error) {
        console.error('Error checking waiting timer:', error);
      }
    });

    // Add debug mode handler
    socket.on('set_debug_mode', ({ enabled }: { enabled: boolean }) => {
      // Update debug mode for this socket's room
      const roomIds = [...socket.rooms.values()];
      roomIds.forEach(roomId => {
        if (roomId !== socket.id) {
          const room = rooms.get(roomId);
          if (room) {
            room.gameState.debugMode = enabled;
            // Broadcast debug mode change to all clients in the room
            io.to(roomId).emit('debug_mode_changed', { enabled });
          }
        }
      });
    });

    // Handle card vote request
    socket.on('request_card_vote', ({ roomId, playerId, playerName }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      // Reset votes
      room.gameState.cardVotes = {};

      // Notify all players about the vote request
      io.to(roomId).emit('card_vote_request', {
        roomId,
        playerId,
        playerName
      });

      // Set a 10-second timeout for the vote
      setTimeout(() => {
        const room = rooms.get(roomId);
        if (!room) return;

        // Get all active players who should vote
        const activePlayers = room.gameState.players.filter(p => p.isActive);
        const voters = activePlayers.filter(p => p.id !== playerId);
        //console.log("voters", voters);
        //console.log("room.gameState.cardVotes", room.gameState.cardVotes);
        // Count votes received so far and mark non-voting players as "no"
        voters.forEach(voter => {
          if (room.gameState.cardVotes[voter.id] === undefined) {
            room.gameState.cardVotes[voter.id] = false;
          }
        });

        const yesVotes = Object.values(room.gameState.cardVotes).filter(vote => vote).length;
        const noVotes = Object.values(room.gameState.cardVotes).filter(vote => !vote).length;

        // Determine if request is approved
        const approved = yesVotes > noVotes; // All players must vote yes

        if(approved){
          room.gameState.userNewCardRequest = true;
          // socket.emit('new_card_deck_request', {
          //     roomId: roomId,
          //     playerId: playerId
          //   });
        }

        // Notify all players of the result
        io.to(roomId).emit('card_vote_result', {
          roomId,
          playerId,
          approved,
          yesVotes,
          noVotes,
          reason: 'timeout'
        });

        // Clear votes
        room.gameState.cardVotes = {};
      }, 10000);
    });

    // Handle vote submission
    socket.on('submit_card_vote', ({ roomId, playerId, vote }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      // Get the voting player's ID from the socket
      const votingPlayerId = socket.id;

      // Record the vote with the voting player's ID
      room.gameState.cardVotes[votingPlayerId] = vote;

      console.log("cardVotes", room.gameState.cardVotes);
      console.log("votingPlayerId", votingPlayerId);
      console.log("vote", vote);

      // Check if all players have voted
      const activePlayers = room.gameState.players.filter(p => p.isActive);
      const voters = activePlayers.filter(p => p.id !== playerId);
      
      console.log("Active players:", activePlayers.map(p => ({ id: p.id, name: p.username })));
      //console.log("Voters:", voters.map(p => ({ id: p.id, name: p.username })));
      
      const allVoted = voters.every(voter => room.gameState.cardVotes[voter.id] !== undefined);
      console.log("All voted:", allVoted);

      if (allVoted) {
        // Count votes
        const yesVotes = Object.values(room.gameState.cardVotes).filter(vote => vote).length;
        const noVotes = Object.values(room.gameState.cardVotes).filter(vote => !vote).length;

        // Determine if request is approved
        const approved = yesVotes > noVotes; // All players must vote yes
        //if approved, then set user new card request to true
        if(approved){
          room.gameState.userNewCardRequest = true;
          // socket.emit('new_card_deck_request', {
          //   roomId: roomId,
          //   playerId: playerId
          // });
        }
        console.log("Vote result:", {
          yesVotes,
          noVotes,
          approved,
          totalVoters: voters.length,
          votes: room.gameState.cardVotes
        });
        
        // Notify all players of the result
        io.to(roomId).emit('card_vote_result', {
          roomId,
          playerId,
          approved,
          yesVotes,
          noVotes,
          reason: 'all_voted'
        });
       
       
        // Clear votes
        room.gameState.cardVotes = {};
      }
    });

    // Handle new card deck request
    socket.on('new_card_deck_request', async ({ roomId, playerId}) => {
      const room = rooms.get(roomId);
      console.log("new_card_deck_request", {
        roomId,
        playerId
      });
      if (room && room.gameState.userNewCardRequest) {
        // Find the player to get their user ID
        const player = room.gameState.players.find(p => p.id === playerId);
        if (!player) {
          socket.emit('new_deck_error', {
            message: 'Player not found'
          });
          return;
        }

        // Initialize cardRequestedCount if it doesn't exist
        if (room.gameState.cardRequestedCount === undefined) {
          room.gameState.cardRequestedCount = 0;
        }

        // Calculate the cost for new deck
        const deckCost = room.amount_stack; // Cost per card in the deck

        try {
          // Deduct the cost from player's balance using their user ID
          const newBalance = await BalanceService.processGameResultWithNotification(
            player.userId, // Use user ID instead of socket ID
            false, // isWinner
            deckCost,
            'demo', // balanceType
            roomId,
            {
              socketId: playerId,
              reason: 'new_deck_purchase',
              isLastPayout: false
            }
          );

          console.log("new_card_deck_request", {
            playerId,
            newBalance,
            roomId
          });
          // Increment card request count
          room.gameState.cardRequestedCount += 1;

          // If balance deduction was successful, create and distribute new deck
          const deck = shuffleDeck(createDeck());
          const activePlayers = room.gameState.players.filter(p => p.isActive || p.id === playerId);
          const cardsPerPlayer = Math.floor(deck.length / room.gameState.players.length);
         console.log("cardsPerPlayer", cardsPerPlayer);
          // Distribute cards to players
          activePlayers.forEach((player, index) => {
            const startIndex = index * cardsPerPlayer;
            const endIndex = startIndex + cardsPerPlayer;
            const newCards =  deck.slice(startIndex, endIndex);
            console.log("newCards length", newCards.length);
            console.log("player.cards", player.cards.length);
            player.cards = [...player.cards, ...newCards];
            
            if(player.id === playerId){
              player.isActive = true;
              // Notify all players about the player being enabled
              io.to(roomId).emit('player_enabled', {
                playerId: player.id,
                username: player.username,
                reason: 'new_cards'
              });
            }
            console.log(`Distributed ${newCards.length} cards to player:`, {
              username: player.username,
              userId: player.userId,
              totalCards: player.cards.length,
              isFirstPlayer: index === 0,
              shuffleCount: player.shuffleCount
            });
          });

          room.gameState.userNewCardRequest = false;
          // Update room state
          io.to(roomId).emit('room:updated', {
            updatedRoom: room,
          });

          // Notify player about successful deck purchase
          socket.emit('balance:update', {
            userId: player.userId,
            demo: newBalance,
            real: 0
          });

          // Calculate and emit updated pool amount
          const initialPool = room.amount_stack * room.players.length;
          const additionalPool = room.amount_stack * room.gameState.cardRequestedCount;
          const totalPool = initialPool + additionalPool;
          
           // Update game state for all players
           io.to(roomId).emit('game_state_updated', {
            ...room.gameState,
            players: room.gameState.players.map(p => ({
              ...p,
              cards: p.cards,  // Explicitly include cards
              cardCount: p.cards.length,  // Add card count
              isActive: p.isActive,  // Include active status
              username: p.username,  // Include username for identification
              id: p.id  // Include id for matching
            }))
          });

        } catch (error) {
          console.error('Failed to process new deck request:', error);
          // Notify player about failed purchase
          socket.emit('new_deck_error', {
            message: 'Insufficient balance to purchase new deck'
          });
        }
      }
    });

    //handle card match found
    socket.on('card_match_found', ({ playerId, cards, roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.gameState.players.filter(player => player.id === playerId).forEach((player, index) => {
          
            player.isActive = true;
             // Notify all players about the player being disabled
            io.to(roomId).emit('player_enabled', {
              playerId: player.id,
              username: player.username,
              reason: 'no_cards'
            });
        
          });
        room.gameState.matchAnimation = {
          isActive: true,
          cardId: cards[0].id,
          playerId: playerId,
          timestamp: Date.now()
        };
        rooms.set(roomId, room);
        io.to(roomId).emit('room:updated', {
          updatedRoom: room,
        });
      }
    }); 

   
  });

  }; 