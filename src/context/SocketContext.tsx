import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

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

// Match the types with Supabase table structure
export interface RoomData {
  id: string;
  name: string;
  host_id: string;
  host_name: string;
  player_count: number;
  max_players: number;
  is_private: boolean;
  password?: string; // For room creation
  status: "waiting" | "playing" | "finished";
  bet_amount: number;
  created_at: string;
}

type SocketContextType = {
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
  const [isConnected, setIsConnected] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomChannel, setRoomChannel] = useState<RealtimeChannel | null>(null);
  const { user } = useAuth();

  // Set up real-time connection
  useEffect(() => {
    if (user) {
      console.log("Setting up Supabase real-time connection");
      setIsConnected(true);

      return () => {
        console.log("Cleaning up Supabase real-time connection");
        setIsConnected(false);
      };
    }
  }, [user]);

  // Subscribe to available rooms
  useEffect(() => {
    if (!isConnected) return;

    const channel = supabase
      .channel('public:game_rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms'
        },
        () => {
          console.log('Game rooms change detected, fetching rooms');
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isConnected]);

  // Function to join a room's realtime channel
  const joinRoomChannel = (roomId: string) => {
    console.log("Joining room channel for room:", roomId);
    
    // Clean up any existing channel subscription
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
    }
    
    // Create a new channel for the specific room
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Game player change detected:', payload);
          fetchRooms(); // Refresh room data
        }
      )
      .on(
        'broadcast',
        { event: 'game_state' },
        (payload) => {
          console.log('Received game state update:', payload);
          if (payload.payload && payload.payload.gameState) {
            setGameState(payload.payload.gameState);
          }
        }
      )
      .subscribe();
    
    setRoomChannel(channel);
    return channel;
  };

  // Fetch available rooms
  const fetchRooms = useCallback(async () => {
    if (!isConnected || !user) return;
    
    console.log("Fetching available rooms from Supabase");
    
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching rooms:", error);
        return;
      }
      
      if (data) {
        console.log("Fetched rooms:", data);
        setAvailableRooms(data as RoomData[]);
      }
    } catch (error) {
      console.error("Exception fetching rooms:", error);
    }
  }, [isConnected, user]);

  // Room management functions
  const createRoom = async (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string }): Promise<string> => {
    if (!isConnected || !user) {
      toast({
        title: "Not connected",
        description: "You must be logged in to create a room",
        variant: "destructive"
      });
      return "";
    }
    
    console.log("Creating room:", roomData);
    
    try {
      // Validate input data
      if (!roomData.name) {
        roomData.name = `${user.username || user.email || "Player"}'s Room`;
      }
      
      // Create the room object with explicit types
      const newRoom = {
        name: roomData.name,
        host_id: user.id,
        host_name: user.username || user.email || "Player",
        player_count: 1,
        max_players: roomData.playerCount,
        is_private: roomData.isPrivate,
        password: roomData.password || null,
        status: "waiting",
        bet_amount: roomData.betAmount
      };
      
      console.log("Sending room data to Supabase:", newRoom);
      
      // Insert the room into the game_rooms table
      const { data, error } = await supabase
        .from('game_rooms')
        .insert([newRoom])
        .select()
        .single();
      
      if (error) {
        console.error("Error creating room:", error);
        toast({
          title: "Error",
          description: `Failed to create room: ${error.message}`,
          variant: "destructive"
        });
        return "";
      }
      
      if (data) {
        console.log("Room created:", data);
        setCurrentRoom(data as RoomData);
        joinRoomChannel(data.id);
        initializeGameState(data.id, data.max_players);
        return data.id;
      }
    } catch (error) {
      const err = error as Error;
      console.error("Exception creating room:", err);
      toast({
        title: "Error",
        description: `Something went wrong creating the room: ${err.message}`,
        variant: "destructive"
      });
    }
    
    return "";
  };
  
  const joinRoom = async (roomId: string, password?: string): Promise<boolean> => {
    if (!isConnected || !user) return false;
    
    console.log("Joining room:", roomId, "with password:", password ? "provided" : "none");
    
    try {
      // First check if room exists and if it's not full
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomError) {
        console.error("Error fetching room:", roomError);
        toast({
          title: "Room not found",
          description: "The room you're trying to join doesn't exist.",
          variant: "destructive"
        });
        return false;
      }
      
      if (!roomData) {
        toast({
          title: "Room not found",
          description: "The room you're trying to join doesn't exist.",
          variant: "destructive"
        });
        return false;
      }
      
      // Type cast the roomData to RoomData
      const typedRoomData = roomData as RoomData;
      
      if (typedRoomData.player_count >= typedRoomData.max_players) {
        toast({
          title: "Room full",
          description: "This room is already full.",
          variant: "destructive"
        });
        return false;
      }
      
      // For private rooms, verify password
      if (typedRoomData.is_private) {
        if (!password) {
          toast({
            title: "Password required",
            description: "This room requires a password.",
            variant: "destructive"
          });
          return false;
        }
        
        if (password !== typedRoomData.password) {
          toast({
            title: "Incorrect password",
            description: "The password you entered is incorrect.",
            variant: "destructive"
          });
          return false;
        }
      }
      
      // Add player to game_players table
      const { error: playerError } = await supabase
        .from('game_players')
        .insert([{
          room_id: roomId,
          user_id: user.id,
          username: user.username || user.email
        }]);
      
      if (playerError) {
        console.error("Error joining room:", playerError);
        toast({
          title: "Error",
          description: "Failed to join room: " + playerError.message,
          variant: "destructive"
        });
        return false;
      }
      
      // Update player count in game_rooms table
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ player_count: typedRoomData.player_count + 1 })
        .eq('id', roomId);
      
      if (updateError) {
        console.error("Error updating player count:", updateError);
      }
      
      setCurrentRoom(typedRoomData);
      joinRoomChannel(roomId);
      initializeGameState(roomId, typedRoomData.max_players);
      return true;
    } catch (error) {
      console.error("Exception joining room:", error);
      toast({
        title: "Error",
        description: "Something went wrong joining the room",
        variant: "destructive"
      });
      return false;
    }
  };
  
  const leaveRoom = async () => {
    if (!isConnected || !user || !currentRoom) return;
    
    console.log("Leaving room:", currentRoom.id);
    
    try {
      if (roomChannel) {
        await supabase.removeChannel(roomChannel);
        setRoomChannel(null);
      }
      
      // Remove player from game_players table
      const { error: removeError } = await supabase
        .from('game_players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);
      
      if (removeError) {
        console.error("Error removing player:", removeError);
      }
      
      // If player is host, delete the room
      if (currentRoom.host_id === user.id) {
        const { error: deleteError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', currentRoom.id);
        
        if (deleteError) {
          console.error("Error deleting room:", deleteError);
        }
      } else {
        // Otherwise, update player count in game_rooms table
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ player_count: Math.max(1, currentRoom.player_count - 1) })
          .eq('id', currentRoom.id);
        
        if (updateError) {
          console.error("Error updating player count:", updateError);
        }
      }
      
      setCurrentRoom(null);
      setGameState(null);
    } catch (error) {
      console.error("Exception leaving room:", error);
    }
  };

  // Game actions
  const playCard = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
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
    
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      centralPile: updatedPile,
      currentPlayerIndex: nextPlayerIndex
    };
    
    // Broadcast the updated game state
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
  };
  
  const collectPile = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    console.log("Collecting pile");
    
    // Mock pile collection
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, cards: [...player.cards, ...gameState.centralPile] } 
        : player
    );
    
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      centralPile: [],
      lastMatchWinner: currentPlayer.id
    };
    
    // Broadcast the updated game state
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
  };
  
  const shuffleDeck = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
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
    
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers
    };
    
    // Broadcast the updated game state
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
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
      id: user.id,
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
    const initialGameState = {
      players,
      currentPlayerIndex: 0,
      centralPile: [],
      isGameOver: false
    };
    
    // Broadcast initial game state if we have a room channel
    if (roomChannel) {
      roomChannel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { gameState: initialGameState }
      });
    }
    
    setGameState(initialGameState);
  };

  // Initial fetch of rooms when component mounts
  useEffect(() => {
    if (isConnected && user) {
      fetchRooms();
    }
  }, [isConnected, user, fetchRooms]);

  return (
    <SocketContext.Provider 
      value={{ 
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
