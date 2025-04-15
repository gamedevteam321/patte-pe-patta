const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Store active rooms in memory
const rooms = new Map();

// Function to verify Supabase connection
async function verifySupabaseConnection() {
  try {
    const { data, error } = await supabase.from('rooms').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    console.log('Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
}

// Verify connection on startup
verifySupabaseConnection().then(connected => {
  if (!connected) {
    console.warn('Warning: Could not verify Supabase connection on startup');
  }
});

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle fetch rooms request with retry logic
    socket.on('fetch_rooms', async (callback) => {
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          // Verify Supabase connection before querying
          const isConnected = await verifySupabaseConnection();
          if (!isConnected) {
            throw new Error('Supabase connection not available');
          }

          // Get all rooms in 'waiting' status
          const { data: roomsData, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('status', 'waiting');
          
          if (error) throw error;
          
          // If no rooms data, return empty array
          if (!roomsData) {
            if (callback) {
              callback({ success: true, rooms: [] });
            }
            return;
          }
          
          // Ensure roomsData is always an array
          const roomsArray = Array.isArray(roomsData) ? roomsData : [roomsData];
          
          // Filter out full rooms and add in-memory data including player count
          const availableRooms = roomsArray.map(room => {
            const inMemoryRoom = rooms.get(room.id) || { players: [] };
            const playerCount = inMemoryRoom.players ? inMemoryRoom.players.length : 0;
            
            return {
              id: room.id,
              name: room.name || "Game Room",
              hostName: room.host_name,
              maxPlayers: room.max_players || 2,
              playerCount: playerCount,
              isPrivate: room.is_private || false,
              betAmount: room.amount_stack || 0,
              status: room.status,
              createdAt: room.created_at
            };
          });
          
          if (callback) {
            callback({ success: true, rooms: availableRooms });
          }
          return; // Success, exit the retry loop
        } catch (error) {
          console.error(`Error fetching rooms (attempt ${retries + 1}/${maxRetries}):`, error);
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
    socket.on('create_room', async (roomData, callback) => {
      try {
        if (!roomData.userId) {
          socket.emit('room:error', { message: 'Authentication required' });
          if (callback) callback({ success: false, error: 'Authentication required' });
          return;
        }

        // Generate a unique room code
        const generateRoomCode = () => {
          return Math.floor(100000 + Math.random() * 900000).toString();
        };

        const roomCode = generateRoomCode();
        const roomId = crypto.randomUUID(); // Generate a proper UUID for room id

        // Check if user exists
        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', roomData.userId)
          .single();

        if (userError) {
          console.error('User not found:', userError);
          socket.emit('room:error', { message: 'User not found' });
          if (callback) callback({ success: false, error: 'User not found' });
          return;
        }

        // Create room in Supabase
        const { data: supabaseRoom, error: supabaseError } = await supabase
          .from('rooms')
          .insert([{
            id: roomId,
            created_by: roomData.userId,
            status: 'waiting',
            code: roomCode,
            max_players: roomData.maxPlayers || 2, // Default to 2 players
            amount_stack: roomData.betAmount || 0,
            host_id: roomData.userId,
            host_name: roomData.hostName,
            player_count: 1,
            is_private: roomData.isPrivate || false,
            name: roomData.name || "Game Room"
          }])
          .select()
          .single();

        if (supabaseError) {
          console.error('Supabase room creation error:', {
            error: supabaseError,
            errorMessage: supabaseError.message,
            errorCode: supabaseError.code,
            details: supabaseError.details,
            hint: supabaseError.hint,
            roomData: {
              id: roomId,
              created_by: roomData.userId,
              status: 'waiting',
              code: roomCode,
              max_players: roomData.maxPlayers || 2,
              amount_stack: roomData.betAmount || 0
            }
          });
          socket.emit('room:error', { message: `Failed to create room in database: ${supabaseError.message}` });
          if (callback) callback({ success: false, error: supabaseError.message });
          return;
        }

        console.log('Successfully created room in Supabase:', supabaseRoom);

        // Add to in-memory storage with additional metadata
        const roomWithPlayers = {
          ...supabaseRoom,
          roomName: roomData.name,
          hostName: roomData.hostName,
          isPrivate: roomData.isPrivate || false,
          password: roomData.password || null,
          players: [{
            id: socket.id,
            userId: roomData.userId,
            username: roomData.hostName,
            isHost: true,
            isReady: true,
            cards: []
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
              autoPlayCount: 0
            }],
            currentPlayerIndex: 0,
            centralPile: [],
            gameStarted: false,
            isGameOver: false,
            gameStartTime: null,
            roomDuration: 5 * 60 * 1000,
            turnEndTime: null,
            requiredPlayers: roomData.maxPlayers || 2
          }
        };

        rooms.set(roomId, roomWithPlayers);

        // Broadcast the new room to all connected clients
        const roomToBroadcast = {
          id: roomId,
          name: roomData.name || "Game Room",
          hostName: roomData.hostName,
          maxPlayers: roomData.maxPlayers || 2,
          players: roomWithPlayers.players,
          isPrivate: roomData.isPrivate || false,
          password: roomData.password || null,
          status: 'waiting',
          betAmount: roomData.betAmount || 0,
          createdAt: supabaseRoom.created_at
        };

        // Broadcast to all clients except the creator
        socket.broadcast.emit('room:created', roomToBroadcast);

        // Join the room
        socket.join(roomId);

        // Send room creation success to the creator with full room data
        socket.emit('room:created', roomWithPlayers);

        // Also emit room:joined since the creator is automatically added
        socket.emit('room:joined', roomWithPlayers);

        // Emit game state update to all players in the room
        io.to(roomId).emit('game_state_updated', roomWithPlayers.gameState);

        if (callback) callback({ success: true, room: roomWithPlayers });
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('room:error', { message: `Failed to create room: ${error.message}` });
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // Handle joining a room
    socket.on('join_room', async (roomData, callback) => {
      try {
        const { roomId, userId, username } = roomData;
        console.log('Join room request received:', { roomId, userId, username });
        
        if (!userId) {
          console.log('Join room failed: Authentication required');
          socket.emit('room:error', { message: 'Authentication required' });
          if (callback) callback({ success: false, error: 'Authentication required' });
          return;
        }
        
        // Check if room exists in memory first
        const currentRoom = rooms.get(roomId);
        if (!currentRoom) {
          console.log('Join room failed: Room not found in memory');
          if (callback) {
            callback({ success: false, error: 'Room not found' });
          }
          return;
        }

        // Check if player is already in the room
        const existingPlayer = currentRoom.players.find(p => p.userId === userId);
        if (existingPlayer) {
          // Update the socket ID for reconnecting player
          existingPlayer.id = socket.id;
          socket.join(roomId);
          console.log('Reconnecting existing player:', existingPlayer);
          if (callback) {
            callback({ success: true, room: currentRoom });
          }
          return;
        }

        // Check if room is full
        if (currentRoom.players.length >= currentRoom.max_players) {
          console.log('Join room failed: Room is full');
          if (callback) {
            callback({ success: false, error: 'Room is full' });
          }
          return;
        }
        
        // Add player to room in memory
        const newPlayer = {
          id: socket.id,
          userId: userId,
          username: username,
          isHost: false,
          isReady: false,
          cards: []
        };

        currentRoom.players.push(newPlayer);
        
        // Add player to game state
        if (currentRoom.gameState) {
          currentRoom.gameState.players.push({
            ...newPlayer,
            cards: [],
            score: 0,
            isActive: true,
            autoPlayCount: 0
          });

          // Check if we have all required players
          if (currentRoom.gameState.players.length === currentRoom.gameState.requiredPlayers) {
            currentRoom.gameState.status = 'ready';
            // Emit room ready event
            io.to(roomId).emit('room:ready', { roomId });
          }
        }
        
        rooms.set(roomId, currentRoom);
        socket.join(roomId);

        // Update player count in database
        const { error: updateError } = await supabase
          .from('rooms')
          .update({ player_count: currentRoom.players.length })
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
        io.to(roomId).emit('game_state_updated', currentRoom.gameState);

        // Send proper callback response
        if (callback) {
          callback({ 
            success: true,
            room: currentRoom
          });
        }

        console.log('Player successfully joined room:', {
          roomId,
          playerCount: currentRoom.players.length,
          maxPlayers: currentRoom.max_players,
          status: currentRoom.gameState.status
        });
      } catch (error) {
        console.error('Error in join_room:', error);
        if (callback) {
          callback({ success: false, error: error.message });
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
          callback({ success: false, error: error.message });
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
                      host_name: newHost.name 
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
              playerName: player.name,
              isHost: player.isHost
            });
            
            // Emit rooms updated to all clients
            io.emit('rooms_updated');
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error.message);
        // Attempt cleanup even if there's an error
        socket.leaveAll();
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

        // Verify room is ready to start
        if (room.gameState.status !== 'ready') {
          console.log('Room not ready to start:', {
            status: room.gameState.status,
            players: room.players.length,
            required: room.gameState.requiredPlayers
          });
          throw new Error('Room is not ready to start');
        }

        // Check if user is host
        const isHost = room.players[0]?.id === socket.id;
        if (!isHost) {
          throw new Error('Only host can start the game');
        }

        // Initialize game state with deck
        const createDeck = () => {
          const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
          const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
          const deck = [];

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

        const shuffleDeck = (deck) => {
          for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
          }
          return deck;
        };

        const deck = shuffleDeck(createDeck());
        const cardsPerPlayer = Math.floor(deck.length / room.gameState.players.length);
        
        // Update game state
        room.gameState.status = 'in_progress';
        room.gameState.gameStarted = true;
        room.gameState.gameStartTime = Date.now();
        room.gameState.currentPlayerIndex = 0; // Start with first player
        room.gameState.turnEndTime = Date.now() + (15 * 1000);

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
          console.log(`Distributed ${player.cards.length} cards to player:`, {
            username: player.username,
            userId: player.userId,
            isFirstPlayer: index === 0
          });
        });

        // Set remaining cards to central pile
        room.gameState.centralPile = deck.slice(cardsPerPlayer * room.gameState.players.length);

        // Update room state
        room.status = 'playing';
        rooms.set(roomId, room);

        // Emit an immediate game state update to ensure all clients are in sync
        io.to(roomId).emit('game:update', {
          gameState: room.gameState
        });

        // Notify all players about game start
        io.to(roomId).emit('game:start', {
          roomId,
          gameState: room.gameState
        });

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
            error: error.message || 'Failed to start game' 
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

        // Shuffle the player's cards
        const shuffleCards = (cards) => {
          for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
          }
          return cards;
        };

        player.cards = shuffleCards([...player.cards]);

        // Emit the updated game state
        io.to(roomId).emit('game_state_updated', room.gameState);
      } catch (error) {
        console.error('Error in shuffle_deck:', error);
      }
    });

    // Handle play card
    socket.on('play_card', ({ id, card, roomId }) => {
      try {
        console.log('Play card request received:', { 
          playerId: id, 
          roomId, 
          card: `${card.value}-${card.suit}` 
        });
        
        const room = rooms.get(roomId);
        if (!room) {
          console.error('Room not found:', roomId);
          return;
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

        const player = room.gameState.players.find(p => p.id === id);
        if (!player) {
          console.error('Player not found:', id);
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

        // Remove card from player's deck
        const [playedCard] = player.cards.splice(cardIndex, 1);
        
        // Check if player has no cards left after playing
        if (player.cards.length === 0) {
          console.log('Player has no cards left, removing from game:', {
            playerId: player.id,
            username: player.username
          });
          
          // Remove player from game state
          room.gameState.players = room.gameState.players.filter(p => p.id !== player.id);
          
          // Check if only one player remains
          if (room.gameState.players.length === 1) {
            const lastPlayer = room.gameState.players[0];
            console.log('Only one player remains, declaring winner:', {
              winnerId: lastPlayer.id,
              winnerName: lastPlayer.username
            });
            
            // Set the last player as winner and end the game
            room.gameState.isGameOver = true;
            room.gameState.winner = lastPlayer;
            
            // Notify all players about the game over
            io.to(roomId).emit('game_over', {
              winner: lastPlayer,
              reason: 'last_player_standing'
            });
          } else if (room.gameState.players.length === 0) {
            room.gameState.isGameOver = true;
            console.log('All players removed, game over');
          } else {
            // Adjust current player index if needed
            if (room.gameState.currentPlayerIndex >= room.gameState.players.length) {
              room.gameState.currentPlayerIndex = 0;
            }
          }
          
          // Notify all players about the player removal
          io.to(roomId).emit('player_removed', {
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
            timestamp: Date.now() // Add timestamp to track when the match occurred
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
        }

        // Calculate next player index
        let nextPlayerIndex = (room.gameState.currentPlayerIndex + 1) % room.gameState.players.length;
        
        // Skip inactive players
        while (
          room.gameState.players[nextPlayerIndex] && 
          !room.gameState.players[nextPlayerIndex].isActive && 
          nextPlayerIndex !== room.gameState.currentPlayerIndex
        ) {
          nextPlayerIndex = (nextPlayerIndex + 1) % room.gameState.players.length;
        }

        // Update current player index
        room.gameState.currentPlayerIndex = nextPlayerIndex;
        
        // Set turn end time (15 seconds from now)
        room.gameState.turnEndTime = Date.now() + 15000;
        
        console.log('Turn changed to next player:', {
          previousPlayerIndex: playerIndex,
          newPlayerIndex: nextPlayerIndex,
          newPlayerName: room.gameState.players[nextPlayerIndex].username
        });
        
        // Update game state for all players
        io.to(roomId).emit('game_state_updated', room.gameState);
        
        // Notify players of turn change
        io.to(roomId).emit('turn_changed', {
          previousPlayerId: id,
          currentPlayerIndex: room.gameState.currentPlayerIndex,
          currentPlayerId: room.gameState.players[room.gameState.currentPlayerIndex].id,
          nextPlayerUsername: room.gameState.players[room.gameState.currentPlayerIndex].username,
          turnEndTime: room.gameState.turnEndTime
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
        console.error('Error playing card:', error);
      }
    });
  });
};

module.exports = socketHandler; 