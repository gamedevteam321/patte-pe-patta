
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";

// Game-specific types
export type CardRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades";

export interface Card {
  rank: CardRank;
  suit: CardSuit;
  id: string; // Unique identifier for the card
}

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  cards: Card[];
  isActive: boolean;
  autoPlayCount: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  centralPile: Card[];
  lastMatchWinner?: string;
  isGameOver: boolean;
  winner?: Player;
}

interface RoomData {
  id: string;
  name: string;
  host: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string; // For room creation
  status: "waiting" | "playing" | "finished";
}

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  availableRooms: RoomData[];
  currentRoom: RoomData | null;
  gameState: GameState | null;
  createRoom: (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string }) => Promise<string>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  playCard: () => void;
  collectPile: () => void;
  shuffleDeck: () => void;
  fetchRooms: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  availableRooms: [],
  currentRoom: null,
  gameState: null,
  createRoom: async () => "",
  joinRoom: async () => false,
  leaveRoom: () => {},
  playCard: () => {},
  collectPile: () => {},
  shuffleDeck: () => {},
  fetchRooms: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // In a real implementation, connect to your actual Socket.IO server
      // For development purposes, we're using a mock
      console.log("Connecting to socket server...");
      
      // Mock socket connection - in a real app, connect to your Socket.IO server
      // Example: const newSocket = io("https://yourgameserver.com");
      const mockSocket = {
        on: (event: string, callback: (...args: any[]) => void) => {
          console.log(`Socket registered event: ${event}`);
          return mockSocket;
        },
        emit: (event: string, ...args: any[]) => {
          console.log(`Socket emitted event: ${event}`, args);
          return mockSocket;
        },
        disconnect: () => {
          console.log("Socket disconnected");
        },
      } as unknown as Socket;
      
      setSocket(mockSocket as Socket);
      setIsConnected(true);

      // Register event handlers
      mockSocket.on("connect", () => setIsConnected(true));
      mockSocket.on("disconnect", () => setIsConnected(false));
      mockSocket.on("error", (error) => toast({ title: "Socket Error", description: error.message }));
      
      // Game-specific events
      mockSocket.on("roomsList", (rooms: RoomData[]) => setAvailableRooms(rooms));
      mockSocket.on("roomJoined", (room: RoomData) => setCurrentRoom(room));
      mockSocket.on("roomLeft", () => {
        setCurrentRoom(null);
        setGameState(null);
      });
      mockSocket.on("gameState", (state: GameState) => setGameState(state));

      return () => {
        if (mockSocket) {
          mockSocket.disconnect();
          setSocket(null);
          setIsConnected(false);
        }
      };
    }
  }, [user]);

  // Fetch available rooms
  const fetchRooms = useCallback(() => {
    if (!socket || !user) return;
    
    console.log("Fetching available rooms");
    
    // In a real implementation, this would emit a request to the server
    // socket.emit("getRooms");
    
    // For the mock implementation, let's simulate getting rooms from the server
    setTimeout(() => {
      const mockRooms: RoomData[] = [];
      
      // Don't set any mock rooms - we want to only show real rooms
      setAvailableRooms(mockRooms);
    }, 300);
  }, [socket, user]);

  // Room management functions
  const createRoom = async (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string }): Promise<string> => {
    if (!socket || !user) return "";
    
    console.log("Creating room:", roomData);
    
    // Mock room creation - would emit to server in a real app
    const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
    
    const newRoom: RoomData = {
      id: roomId,
      name: roomData.name,
      host: user.username || user.email,
      playerCount: 1,
      maxPlayers: roomData.playerCount,
      isPrivate: roomData.isPrivate,
      status: "waiting"
    };
    
    setCurrentRoom(newRoom);
    setAvailableRooms([...availableRooms, newRoom]);
    
    // Mock joining the room as host
    initializeGameState(roomId, roomData.playerCount);
    
    return roomId;
  };
  
  const joinRoom = async (roomId: string, password?: string): Promise<boolean> => {
    if (!socket || !user) return false;
    
    console.log("Joining room:", roomId, "with password:", password ? "provided" : "none");
    
    const room = availableRooms.find(r => r.id === roomId);
    if (!room) {
      toast({
        title: "Room not found",
        description: "The room you're trying to join doesn't exist."
      });
      return false;
    }
    
    if (room.playerCount >= room.maxPlayers) {
      toast({
        title: "Room full",
        description: "This room is already full."
      });
      return false;
    }
    
    // In a real implementation, we would verify the password with the server
    // This is just a mock implementation
    if (room.isPrivate && !password) {
      toast({
        title: "Password required",
        description: "This room requires a password."
      });
      return false;
    }
    
    // Mock joining the room
    const updatedRoom = {
      ...room,
      playerCount: room.playerCount + 1
    };
    
    setCurrentRoom(updatedRoom);
    setAvailableRooms(availableRooms.map(r => r.id === roomId ? updatedRoom : r));
    
    // Initialize game state for joined player
    initializeGameState(roomId, updatedRoom.maxPlayers);
    
    return true;
  };
  
  const leaveRoom = () => {
    if (!socket || !currentRoom) return;
    
    console.log("Leaving room:", currentRoom.id);
    
    // In a real app, emit leave room event
    // socket.emit("leaveRoom", { roomId: currentRoom.id });
    
    // Update available rooms
    if (currentRoom.playerCount <= 1) {
      // If player was last in room, remove the room
      setAvailableRooms(availableRooms.filter(r => r.id !== currentRoom.id));
    } else {
      // Otherwise, decrement player count
      setAvailableRooms(availableRooms.map(r => 
        r.id === currentRoom.id ? { ...r, playerCount: r.playerCount - 1 } : r
      ));
    }
    
    setCurrentRoom(null);
    setGameState(null);
  };
  
  // Game actions
  const playCard = () => {
    if (!socket || !gameState || !currentRoom) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.cards.length) return;
    
    console.log("Playing card");
    
    // Mock card play
    const card = currentPlayer.cards[0];
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, cards: player.cards.slice(1) } 
        : player
    );
    
    const updatedPile = [...gameState.centralPile, card];
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    setGameState({
      ...gameState,
      players: updatedPlayers,
      centralPile: updatedPile,
      currentPlayerIndex: nextPlayerIndex
    });
  };
  
  const collectPile = () => {
    if (!socket || !gameState || !currentRoom) return;
    
    console.log("Collecting pile");
    
    // Mock pile collection
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, cards: [...player.cards, ...gameState.centralPile] } 
        : player
    );
    
    setGameState({
      ...gameState,
      players: updatedPlayers,
      centralPile: [],
      lastMatchWinner: currentPlayer.id
    });
  };
  
  const shuffleDeck = () => {
    if (!socket || !gameState || !currentRoom) return;
    
    console.log("Shuffling deck");
    
    // Mock shuffle - would be handled by server in real app
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;
    
    // Simple shuffle: randomize the player's cards
    const shuffledCards = [...currentPlayer.cards].sort(() => Math.random() - 0.5);
    
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, cards: shuffledCards } 
        : player
    );
    
    setGameState({
      ...gameState,
      players: updatedPlayers
    });
  };

  // Initialize mock game state
  const initializeGameState = (roomId: string, maxPlayers: number) => {
    if (!user) return;
    
    // Create a standard deck of cards
    const suits: CardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: CardRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    
    const deck: Card[] = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({
          suit,
          rank,
          id: `${rank}_${suit}`
        });
      });
    });
    
    // Shuffle deck
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    
    // Create mock players (1 real player + AI opponents)
    const playerCount = Math.min(maxPlayers, 4);
    const cardsPerPlayer = Math.floor(shuffled.length / playerCount);
    
    const players: Player[] = [];
    let cardIndex = 0;
    
    // Create real player
    players.push({
      id: user.id || "player1",
      username: user.username || user.email || "You",
      cards: shuffled.slice(cardIndex, cardIndex + cardsPerPlayer),
      isActive: true,
      autoPlayCount: 0
    });
    cardIndex += cardsPerPlayer;
    
    // Add AI players
    const aiNames = ["AI Player 1", "AI Player 2", "AI Player 3"];
    for (let i = 1; i < playerCount; i++) {
      players.push({
        id: `ai_player_${i}`,
        username: aiNames[i-1],
        cards: shuffled.slice(cardIndex, cardIndex + cardsPerPlayer),
        isActive: true,
        autoPlayCount: 0
      });
      cardIndex += cardsPerPlayer;
    }
    
    // Set initial game state
    setGameState({
      players,
      currentPlayerIndex: 0,
      centralPile: [],
      isGameOver: false
    });
  };

  return (
    <SocketContext.Provider 
      value={{ 
        socket, 
        isConnected, 
        availableRooms, 
        currentRoom, 
        gameState,
        createRoom,
        joinRoom,
        leaveRoom,
        playCard,
        collectPile,
        shuffleDeck,
        fetchRooms
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
