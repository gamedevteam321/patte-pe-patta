import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

// Game-specific types
export interface Card {
  id: string;
  suit: string;
  value: string;
  rank: string;
}

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  cards?: Card[];
  isHost?: boolean;
  isReady?: boolean;
  isActive?: boolean;
  score?: number;
  wins?: number;
  losses?: number;
  autoPlayCount?: number;
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
  createRoom: (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string; hostId?: string }) => Promise<string | false>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  startGame: () => void;
  playCard: (card: any) => void;
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
  createRoom: async () => false,
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
        return;
      }
      
    if (socket && isConnected) {
      setLastFetchTime(now);
      socket.emit('fetch_rooms', (response: { success: boolean; rooms: RoomData[] }) => {
        if (response.success) {
          setAvailableRooms(response.rooms);
        } else {
            toast({
          title: "Error",
            description: "Failed to fetch rooms. Please try again.",
              variant: "destructive"
            });
        }
      });
    }
  }, [socket, isConnected, lastFetchTime]);

  // Initialize socket connection
  const initializeSocket = React.useCallback(() => {
    if (!user || isConnecting || (socket && isConnected)) {
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
      reconnectionAttempts: 5,
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
        // Server initiated disconnect, don't attempt reconnection
        toast({
          title: "Server Disconnected",
          description: "The server has closed the connection. Please refresh the page.",
          variant: "destructive"
        });
        return;
      }
      
      if (reconnectAttempts < 5) {
        connectionTimeout = setTimeout(() => {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/5)...`);
          newSocket.connect();
        }, 1000 * reconnectAttempts);
      } else {
      toast({
          title: "Connection Lost",
          description: "Unable to reconnect. Please refresh the page.",
        variant: "destructive"
      });
    }
    };

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

    newSocket.on('room:created', (roomData) => {
      console.log('SocketContext: Room created:', roomData);
      setCurrentRoom(roomData);
      if (roomData.gameState) {
        console.log('SocketContext: Setting initial game state from room creation');
        setGameState(roomData.gameState);
      }
    });

    newSocket.on('room:joined', (roomData) => {
      console.log('SocketContext: Room joined:', roomData);
      setCurrentRoom(roomData);
      if (roomData.gameState) {
        console.log('SocketContext: Setting game state from room join');
        setGameState(roomData.gameState);
      }
    });

    newSocket.on('room:ready', () => {
      if (currentRoom?.players.some(p => p.id === user?.id && p.isHost)) {
        setCanStartGame(true);
      }
      toast({
        title: "Room is full",
        description: "Game will start shortly...",
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
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.close();
    };
  }, [user, fetchRooms, socket, isConnected, isConnecting]);

  // Initialize socket when user changes
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
    password?: string;
  }): Promise<string | false> => {
    if (!socket || !user) return false;

    return new Promise<string | false>((resolve) => {
      socket.emit('create_room', {
        name: roomData.name,
        maxPlayers: roomData.playerCount,
        betAmount: roomData.betAmount,
        isPrivate: roomData.isPrivate,
        password: roomData.password,
        userId: user.id,
        hostName: user.username || 'Anonymous'
      }, (response: { success: boolean; room?: RoomData; error?: string }) => {
        if (response.success && response.room) {
          resolve(response.room.id);
        } else {
          console.error('Failed to create room:', response.error);
          resolve(false);
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
          setCurrentRoom(response.room);
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

  const playCard = (card: any) => {
    if (!socket || !isConnected) return;

    socket.emit('play_card', { roomId: currentRoom?.id, card });
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
        }
      });
  };

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

  return (
    <SocketContext.Provider value={{
      socket,
        isConnected, 
        availableRooms, 
        currentRoom, 
        gameState,
        canStartGame,
      fetchRooms,
        createRoom,
        joinRoom,
        leaveRoom,
        playCard,
        startGame,
      shuffleDeck,
        kickInactivePlayer,
        endGame
    }}>
      {children}
    </SocketContext.Provider>
  );
};

