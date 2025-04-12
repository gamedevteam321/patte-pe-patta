import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

// Game-specific types
export interface Card {
  id: string;
  suit: string;
  value: string;
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
  matchAnimation?: {
    isActive: boolean;
    cardId: string;
    playerId: string;
  };
}

// Match the types with Supabase table structure
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
  fetchRooms: () => void;
  createRoom: (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string; hostId?: string }) => Promise<boolean>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  startGame: () => void;
  playCard: (card: any) => void;
}

const SocketContext = React.createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  availableRooms: [],
  currentRoom: null,
  gameState: null,
  fetchRooms: () => {},
  createRoom: async () => false,
  joinRoom: async () => false,
  leaveRoom: () => {},
  startGame: () => {},
  playCard: () => {}
});

export const useSocket = () => React.useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [availableRooms, setAvailableRooms] = React.useState<RoomData[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<RoomData | null>(null);
  const [gameState, setGameState] = React.useState<GameState | null>(null);
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

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setIsConnecting(false);
      
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

    newSocket.on('room:created', (newRoom: RoomData) => {
      setAvailableRooms(prevRooms => [...prevRooms, newRoom]);
    });

    newSocket.on('room:joined', (room: RoomData) => {
      setCurrentRoom(room);
    });

    newSocket.on('room:ready', () => {
      toast({
        title: "Room is full",
        description: "Game will start shortly...",
        variant: "default"
      });
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
  }): Promise<boolean> => {
    if (!socket || !user) return false;

    return new Promise<boolean>((resolve) => {
      socket.emit('create_room', {
        name: roomData.name,
        maxPlayers: roomData.playerCount,
        betAmount: roomData.betAmount,
        isPrivate: roomData.isPrivate,
        password: roomData.password,
        userId: user.id,
        hostName: user.username || 'Anonymous'
      }, (response: { success: boolean; error?: string }) => {
        if (response.success) {
          resolve(true);
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
    if (!socket || !isConnected) return;

    socket.emit('start_game');
  };

  return (
    <SocketContext.Provider value={{
      socket,
        isConnected, 
        availableRooms, 
        currentRoom, 
        gameState,
      fetchRooms,
        createRoom,
        joinRoom,
        leaveRoom,
        playCard,
      startGame
    }}>
      {children}
    </SocketContext.Provider>
  );
};

