import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

// Game-specific types
export interface Card {
  id: string;
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  rank: number;
  isHitButton?: boolean; // Flag to indicate if card was played via hit button
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  cards: Card[];
  isHost: boolean;
  isReady: boolean;
  isActive?: boolean;
  isCurrentTurn: boolean;
  score?: number;
  wins?: number;
  losses?: number;
  autoPlayCount?: number;
  shuffleCount: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  centralPile: Card[];
  lastMatchWinner?: string;
  isGameOver: boolean;
  winner?: Player;
  gameStarted: boolean;
  gameStartTime?: number;
  turnEndTime?: number;
  roomDuration?: number;
  status: 'waiting' | 'ready' | 'in_progress';
  requiredPlayers: number;
  matchAnimation?: {
    isActive: boolean;
    cardId: string;
    playerId: string;
  };
  waitingStartTime: number;
  waitingTimer: number;
}

// Database schema types
export interface RoomData {
  id: string;
  name: string;
  code: string;
  hostName: string;
  maxPlayers: number;
  players: Player[];
  isPrivate: boolean;
  password?: string;
  status: 'waiting' | 'playing' | 'finished';
  betAmount?: number;
  createdAt?: string;
  updatedAt?: string;
  gameState?: GameState;
}

interface UserData {
  id: string;
  email: string;
  username?: string;
  coins: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  availableRooms: RoomData[];
  currentRoom: RoomData | null;
  gameState: GameState | null;
  canStartGame: boolean;
  fetchRooms: () => void;
  createRoom: (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; passkey?: string; hostId?: string }) => Promise<{ success: boolean; roomId?: string; roomCode?: string; error?: string }>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  startGame: () => void;
  playCard: (playerId: string, card: Card) => void;
  shuffleDeck: () => void;
  kickInactivePlayer: (playerId: string) => void;
  endGame: (winnerId: string) => void;
}

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  availableRooms: [],
  currentRoom: null,
  gameState: null,
  canStartGame: false,
  fetchRooms: () => {},
  createRoom: async () => ({ success: false, error: 'Socket not connected or user not authenticated' }),
  joinRoom: async () => false,
  leaveRoom: () => {},
  startGame: () => {},
  playCard: () => {},
  shuffleDeck: () => {},
  kickInactivePlayer: () => {},
  endGame: () => {}
});

export const useSocket = () => React.useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [availableRooms, setAvailableRooms] = React.useState<RoomData[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<RoomData | null>(null);
  const [gameState, setGameState] = React.useState<GameState | null>(null);
  const [canStartGame, setCanStartGame] = React.useState(false);
  const [lastFetchTime, setLastFetchTime] = React.useState<number>(0);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const { user } = useAuth();

  const fetchRooms = React.useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      console.log('Skipping fetch due to rate limit');
      return;
    }
      
    if (socket && isConnected) {
      console.log('Fetching rooms from server...');
      setLastFetchTime(now);
      socket.emit('fetch_rooms', (response: { success: boolean; rooms: RoomData[] }) => {
        console.log('Received rooms response:', response);
        if (response.success) {
          console.log('Setting available rooms:', response.rooms);
          setAvailableRooms(response.rooms);
        } else {
          console.error('Failed to fetch rooms:', response);
          toast({
            title: "Error",
            description: "Failed to fetch rooms. Please try again.",
            variant: "destructive"
          });
        }
      });
    } else {
      console.log('Cannot fetch rooms - socket not connected:', { socket, isConnected });
    }
  }, [socket, isConnected, lastFetchTime]);

  // Initialize socket connection
  const initializeSocket = React.useCallback(() => {
    if (!user) {
      console.log('No user found, skipping socket initialization');
        return;
      }
      
    if (isConnecting) {
      console.log('Already connecting, skipping initialization');
      return;
    }

    if (socket && isConnected) {
      console.log('Socket already connected, skipping initialization');
      return;
    }

    setIsConnecting(true);
    console.log('Initializing socket connection...');

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
      auth: {
        username: user.username || user.email || "Player",
        userId: user.id
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      forceNew: true
    });

    let connectionTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;

    const handleConnect = () => {
      console.log('Socket connected successfully');
      setIsConnected(true);
      setIsConnecting(false);
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      reconnectAttempts = 0;
      fetchRooms();
    };

    const handleDisconnect = (reason: string) => {
      console.log('Socket disconnected. Reason:', reason);
      setIsConnected(false);
      setIsConnecting(false);
      setGameState(null);  // Clear game state on disconnect
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt reconnection
        console.log('Server initiated disconnect, attempting to reconnect...');
        newSocket.connect();
        return;
      }
      
      // For other disconnects, attempt to reconnect
      connectionTimeout = setTimeout(() => {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts})...`);
        newSocket.connect();
      }, 1000 * Math.min(reconnectAttempts, 5));
    };

    // Add room:created event handler
    newSocket.on('room:created', (roomData) => {
      console.log('SocketContext: Room created:', roomData);
      
      // If this is the current user's room (they created it)
      if (user && roomData.players.some(player => player.userId === user.id)) {
        console.log('Setting current room for creator');
        setCurrentRoom(roomData);
        if (roomData.gameState) {
          setGameState(roomData.gameState);
        }
      } else {
        // For other clients, just update the available rooms list
        console.log('Updating available rooms list for other clients');
        setAvailableRooms(prevRooms => {
          // Check if room already exists in the list
          const roomExists = prevRooms.some(room => room.id === roomData.id);
          if (roomExists) {
            // Update existing room
            return prevRooms.map(room => room.id === roomData.id ? roomData : room);
          } else {
            // Add new room
            return [...prevRooms, roomData];
          }
        });
      }
    });

    // Add room:deleted event handler
    newSocket.on('room:deleted', (deletedRoomId: string) => {
      console.log('Room deleted:', deletedRoomId);
      setAvailableRooms(prevRooms => prevRooms.filter(room => room.id !== deletedRoomId));
    });

    // Add room:updated event handler
    newSocket.on('room:updated', (updatedRoom: RoomData) => {
      console.log('Room updated:', updatedRoom);
      setAvailableRooms(prevRooms => 
        prevRooms.map(room => room.id === updatedRoom.id ? updatedRoom : room)
      );
    });

    // Add rooms_updated event handler to refresh room list
    newSocket.on('rooms_updated', () => {
      console.log('Rooms updated event received, fetching latest rooms...');
      fetchRooms();
    });

    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnecting(false);
        toast({
        title: "Connection Error",
        description: "Failed to connect to server. Please try again.",
          variant: "destructive"
        });
    });

    newSocket.on('room:joined', (roomData) => {
      console.log('SocketContext: Room joined:', roomData);
      // Ensure betAmount is properly set from amount_stack
      const roomWithBetAmount = {
        ...roomData,
        betAmount: roomData.amount_stack || 0
      };
      console.log('Setting room with bet amount:', roomWithBetAmount);
      setCurrentRoom(roomWithBetAmount);
      if (roomData.gameState) {
        console.log('SocketContext: Setting game state from room join');
        setGameState(roomData.gameState);
      }
    });

    newSocket.on('room:ready', () => {
      console.log('Room ready event received');
      const isHost = currentRoom?.players[0]?.id === socket.id;
      console.log('Is host check:', { isHost, currentRoom });
      if (isHost) {
        console.log('Setting canStartGame to true for host');
        setCanStartGame(true);
      }
          toast({
        title: "Room is Ready",
        description: "All players have joined. Host can start the game!",
        variant: "default"
      });
    });

    newSocket.on('game:start', (data: { roomId: string; gameState: GameState }) => {
      console.log('SocketContext: Received game:start event with data:', {
        roomId: data.roomId,
        gameState: {
          gameStarted: data.gameState.gameStarted,
          playersCount: data.gameState.players.length,
          currentPlayerIndex: data.gameState.currentPlayerIndex,
          hasCards: data.gameState.players.some(p => p.cards && p.cards.length > 0)
        }
      });
      
      if (!data.gameState) {
        console.error('SocketContext: Game state is missing in game:start event');
      return;
    }
    
      console.log('SocketContext: Setting game state...');
      setGameState(data.gameState);
      console.log('SocketContext: Game state set successfully');
      
      toast({
        title: "Game Started!",
        description: "The game has begun. Good luck!",
        variant: "default"
      });
    });

    newSocket.on('game_state_updated', (newGameState: GameState) => {
      console.log('SocketContext: Received game_state_updated:', {
        gameStarted: newGameState.gameStarted,
        playersCount: newGameState.players.length,
        currentPlayerIndex: newGameState.currentPlayerIndex,
        hasCards: newGameState.players.some(p => p.cards && p.cards.length > 0)
      });
      setGameState(newGameState);
    });

    setSocket(newSocket);

    return () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      newSocket.disconnect();
    };
  }, [user, isConnecting, socket, isConnected, fetchRooms]);

  // Initialize socket when component mounts or user changes
  React.useEffect(() => {
    initializeSocket();
  }, [initializeSocket]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  const createRoom = async (roomData: { 
    name: string; 
    playerCount: number; 
    betAmount: number; 
    isPrivate: boolean; 
    passkey?: string;
  }): Promise<{ success: boolean; roomId?: string; roomCode?: string; error?: string }> => {
    if (!socket || !user) return { success: false, error: 'Socket not connected or user not authenticated' };

    return new Promise((resolve) => {
      socket.emit('create_room', {
        name: roomData.name,
        maxPlayers: roomData.playerCount,
        betAmount: roomData.betAmount,
        isPrivate: roomData.isPrivate,
        passkey: roomData.passkey,
        userId: user.id,
        hostName: user.username || 'Anonymous'
      }, (response: { success: boolean; room?: RoomData; error?: string }) => {
        if (response.success && response.room) {
          resolve({ 
            success: true, 
            roomId: response.room.id,
            roomCode: response.room.code
          });
        } else {
          console.error('Failed to create room:', response.error);
          resolve({ 
            success: false, 
            error: response.error || 'Failed to create room' 
          });
        }
      });
    });
  };

  const joinRoom = async (roomId: string, password?: string): Promise<boolean> => {
    if (!socket || !isConnected || !user) return false;

    return new Promise<boolean>((resolve) => {
      socket.emit('join_room', { 
        roomId, 
        password, 
        userId: user.id, 
        username: user.username || user.email || 'Anonymous' 
      }, (response: { success: boolean; room?: RoomData; error?: string }) => {
        if (response.success && response.room) {
          const roomWithBetAmount = {
            ...response.room,
            betAmount: response.room.amount_stack || 0
          };
          console.log('Joining room with bet amount:', roomWithBetAmount);
          setCurrentRoom(roomWithBetAmount);
          resolve(true);
        } else {
          toast({
            title: "Failed to join room",
            description: response.error || "Unknown error",
            variant: "destructive"
          });
          resolve(false);
        }
      });
    });
  };

  const leaveRoom = () => {
    if (!socket || !isConnected) return;

    socket.emit('leave_room');
    setCurrentRoom(null);
  };

  const playCard = (playerId: string, card: Card) => {
    if (!socket || !currentRoom) return;

    console.log('Playing card:', {
      playerId: playerId,
      currentRoomId: currentRoom.id,
      card
    });

    socket.emit('play_card', { 
      id: playerId, 
      card,
      roomId: currentRoom.id 
    });
  };

  const startGame = () => {
    if (!socket || !isConnected || !currentRoom) {
      console.log('Cannot start game - prerequisites not met:', { 
        hasSocket: !!socket, 
        isConnected, 
        hasCurrentRoom: !!currentRoom 
      });
      toast({
        title: "Cannot start game",
        description: "Connection or room not available",
        variant: "destructive"
      });
      return;
    }
    
    console.log('Emitting start_game event for room:', currentRoom.id);
    socket.emit('start_game', currentRoom.id, (response: { success: boolean; error?: string }) => {
      console.log('Received start_game response:', response);
      if (!response.success) {
        toast({
          title: "Failed to start game",
          description: response.error || "Unknown error occurred",
          variant: "destructive"
        });
      } else {
    toast({
          title: "Game Starting",
          description: "The game is now starting...",
        });
        }
      });
  };

  // Update the room:ready handler
  React.useEffect(() => {
    if (!socket) return;

    socket.on('room:ready', (data) => {
      console.log('Room is ready:', data);
      if (currentRoom?.players.some(p => p.id === user?.id && p.isHost)) {
        console.log('Setting canStartGame to true for host');
        setCanStartGame(true);
      }
      toast({
        title: "Room is Ready",
        description: "All players have joined. Host can start the game!",
        variant: "default"
        });
      });
      
    return () => {
      socket.off('room:ready');
    };
  }, [socket, currentRoom, user]);

  const shuffleDeck = () => {
    if (!socket || !isConnected) return;
    socket.emit('shuffle_deck', { roomId: currentRoom?.id });
  };

  const kickInactivePlayer = (playerId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('kick_player', { roomId: currentRoom?.id, playerId });
  };

  const endGame = (winnerId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('end_game', { roomId: currentRoom?.id, winnerId });
  };

  React.useEffect(() => {
    if (!socket) return;

    const handleGameStateUpdate = (newGameState: GameState) => {
      console.log('Game state updated:', {
        currentPlayerIndex: newGameState.currentPlayerIndex,
        currentPlayerId: newGameState.players[newGameState.currentPlayerIndex]?.id,
        gameStarted: newGameState.gameStarted
      });
      setGameState(newGameState);
    };

    const handleTurnChanged = (data: { 
      currentPlayerIndex: number;
      currentPlayerId: string;
      nextPlayerUsername: string;
    }) => {
      console.log('Turn changed:', data);
      if (gameState) {
        setGameState(prev => ({
          ...prev!,
          currentPlayerIndex: data.currentPlayerIndex
        }));
      }
    };

    socket.on('game_state_updated', handleGameStateUpdate);
    socket.on('turn_changed', handleTurnChanged);

    return () => {
      socket.off('game_state_updated', handleGameStateUpdate);
      socket.off('turn_changed', handleTurnChanged);
    };
  }, [socket, gameState]);

  const contextValue = {
    socket,
        isConnected, 
    user,
        gameState,
    currentRoom,
    availableRooms,
    fetchRooms,
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
    playCard,
        kickInactivePlayer,
    endGame,
    shuffleDeck,
    canStartGame
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

