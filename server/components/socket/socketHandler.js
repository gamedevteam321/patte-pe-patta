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
              code: room.code,
              status: room.status,
              created_by: room.created_by,
              max_players: room.max_players, 
              player_count: playerCount,
              amount_stack: room.amount_stack,
              roomName: inMemoryRoom.roomName || "Game Room",
              hostName: inMemoryRoom.hostName || "Host",
              isPrivate: inMemoryRoom.isPrivate || false,
              isFull: playerCount >= room.max_players
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
            amount_stack: roomData.betAmount || 0
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
          roomName: roomData.name, // Store name in memory
          hostName: roomData.hostName, // Store host name in memory
          isPrivate: roomData.isPrivate || false,
          password: roomData.password || null,
          players: [{
            id: socket.id,
            userId: roomData.userId,
            name: roomData.hostName,
            isHost: true,
            isReady: false
          }]
        };
        rooms.set(supabaseRoom.id, roomWithPlayers);
        socket.join(supabaseRoom.id);

        // Emit room created event
        io.emit('rooms_updated');
        socket.emit('room:joined', roomWithPlayers);
        
        // After successful room creation, emit room update event
        io.emit('room:created', {
          id: supabaseRoom.id,
          code: supabaseRoom.code,
          status: supabaseRoom.status,
          created_by: supabaseRoom.created_by,
          max_players: supabaseRoom.max_players,
          player_count: 1, // New room starts with 1 player
          amount_stack: supabaseRoom.amount_stack,
          roomName: roomData.name || "Game Room",
          hostName: roomData.hostName || "Host",
          isPrivate: roomData.isPrivate || false,
          isFull: false
        });

        if (callback) {
          callback({ success: true, room: roomWithPlayers });
        }
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
        
        if (!userId) {
          socket.emit('room:error', { message: 'Authentication required' });
          if (callback) callback({ success: false, error: 'Authentication required' });
          return;
        }
        
        // Check if room exists
        const { data: room, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError || !room) {
          if (callback) {
            callback({ success: false, error: 'Room not found' });
          }
          return;
        }

        // Check if room is private and validate password
        if (room.is_private && room.password !== roomData.password) {
          if (callback) {
            callback({ success: false, error: 'Invalid password' });
          }
          return;
        }

        // Check if room is full
        const roomInMemory = rooms.get(roomId);
        const playerCount = roomInMemory?.players?.length || 0;
        
        if (playerCount >= room.max_players) {
          if (callback) {
            callback({ success: false, error: 'Room is full' });
          }
          return;
        }

        // Get current room data from memory or initialize if not exists
        const roomData = rooms.get(roomId) || { 
          ...room,
          roomName: room.name || "Game Room",
          hostName: "Host",
          players: []
        };
        
        // Add player to room in memory
        roomData.players.push({
          id: socket.id,
          userId: userId,
          name: username,
          isHost: false,
          isReady: false
        });
        
        rooms.set(roomId, roomData);
        socket.join(roomId);

        // Notify room about new player
        io.to(roomId).emit('player_joined', {
          player: { id: socket.id, userId, name: username, isHost: false, isReady: false }
        });
        
        // Emit rooms updated to all clients
        io.emit('rooms_updated');

        // Emit joined event to the joining client
        socket.emit('room:joined', roomData);

        if (callback) {
          callback({ 
            success: true,
            room: roomData
          });
        }
        
        // Check if room is now full, and start game if needed
        if (roomData.players.length >= room.max_players) {
          // All players are ready when the room is full
          io.to(roomId).emit('room:ready', { roomId });
          
          // Update room status to playing
          await supabase
            .from('rooms')
            .update({ status: 'playing' })
            .eq('id', roomId);
            
          // Start game after a short delay
          setTimeout(() => {
            io.to(roomId).emit('game:start', { roomId });
          }, 3000);
        }
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

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        // Find all rooms the player is in
        for (const [roomId, room] of rooms.entries()) {
          const playerIndex = room.players.findIndex(p => p.id === socket.id);
          if (playerIndex !== -1) {
            const player = room.players[playerIndex];
            
            // If player was host, assign new host or delete room
            if (player.isHost) {
              if (room.players.length > 1) {
                // Assign new host
                const newHost = room.players.find(p => !p.isHost);
                if (newHost) {
                  newHost.isHost = true;
                  
                  // Update host in database if needed
                  // No need to update host_id as it's not in the schema
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
            
            // Notify remaining players
            io.to(roomId).emit('player_left', { playerId: socket.id });
            
            // Emit rooms updated to all clients
            io.emit('rooms_updated');
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};

module.exports = socketHandler; 