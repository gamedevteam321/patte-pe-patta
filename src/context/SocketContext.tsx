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
  gameStarted: boolean;
  gameStartTime?: number;
  gameDuration: number; // in seconds
  turnTimeLimit: number; // in seconds
  turnStartTime?: number;
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
  initializeGame: (roomId: string, maxPlayers: number) => Promise<void>;
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
  initializeGame: async () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomChannel, setRoomChannel] = useState<RealtimeChannel | null>(null);
  const [turnTimer, setTurnTimer] = useState<NodeJS.Timeout | null>(null);
  const [gameTimer, setGameTimer] = useState<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Set up a Supabase auth listener to handle auth state changes
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session ? "User logged in" : "No session");
      setIsConnected(!!session);
    });

    // Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Current session:", session ? "Active" : "None");
      setIsConnected(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  const joinRoomChannel = (roomId: string) => {
    console.log("Joining room channel for room:", roomId);
    
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
    }
    
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
          fetchRooms();
          
          // Re-fetch game state when players change
          if (currentRoom && currentRoom.id === roomId) {
            console.log("Player change detected, refreshing game state");
            initializeGameState(roomId, currentRoom.max_players);
          }
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

  const fetchRooms = useCallback(async () => {
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
  }, []);

  const createRoom = async (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string }): Promise<string> => {
    console.log("Creating room:", roomData);
    
    try {
      // Check if user is authenticated before proceeding
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session || !user) {
        // Sign in with mock user credentials for demo purposes
        await signInDemoUser();
      }

      if (!user || !user.id) {
        console.error("Cannot create room: User not authenticated");
        toast({
          title: "Authentication required",
          description: "You must be logged in to create a room",
          variant: "destructive"
        });
        return "";
      }

      if (!roomData.name) {
        roomData.name = `${user.username || user.email || "Player"}'s Room`;
      }
      
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

  // Sign in with a demo user for testing purposes
  const signInDemoUser = async () => {
    try {
      // Create a demo anonymous session - helpful for testing without full auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@example.com',
        password: 'demopassword'
      });

      if (error) {
        console.error("Demo signin failed, trying to sign up:", error);
        
        // Try to sign up the demo user if sign-in fails
        const { error: signUpError } = await supabase.auth.signUp({
          email: 'demo@example.com',
          password: 'demopassword'
        });

        if (signUpError) {
          console.error("Demo signup also failed:", signUpError);
          throw signUpError;
        }
      }

      console.log("Demo auth session created", data);
    } catch (error) {
      console.error("Could not create demo session:", error);
      toast({
        title: "Authentication Error",
        description: "Could not create a demo session. Please try again.",
        variant: "destructive"
      });
    }
  };

  const joinRoom = async (roomId: string, password?: string): Promise<boolean> => {
    if (!isConnected || !user) return false;
    
    console.log("Joining room:", roomId, "with password:", password ? "provided" : "none");
    
    try {
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
      
      const typedRoomData = roomData as RoomData;
      
      if (typedRoomData.player_count >= typedRoomData.max_players) {
        toast({
          title: "Room full",
          description: "This room is already full.",
          variant: "destructive"
        });
        return false;
      }
      
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
      
      // Check if player already exists in this room
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      
      if (!existingPlayer) {
        // Player doesn't exist in this room, add them
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
        
        // Update player count
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ player_count: typedRoomData.player_count + 1 })
          .eq('id', roomId);
        
        if (updateError) {
          console.error("Error updating player count:", updateError);
        }
      }
      
      setCurrentRoom(typedRoomData);
      const channel = joinRoomChannel(roomId);
      
      // Get all players in the room to sync game state
      const { data: playersData } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId);
      
      console.log("Players in room:", playersData);
      
      initializeGameState(roomId, typedRoomData.max_players);
      
      // Notify all other players in the room that a new player has joined
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { 
            userId: user.id,
            username: user.username || user.email
          }
        });
      }
      
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
      
      const { error: removeError } = await supabase
        .from('game_players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', user.id);
      
      if (removeError) {
        console.error("Error removing player:", removeError);
      }
      
      if (currentRoom.host_id === user.id) {
        const { error: deleteError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', currentRoom.id);
        
        if (deleteError) {
          console.error("Error deleting room:", deleteError);
        }
      } else {
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

  const startGameTimer = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    // Clear any existing timer
    if (gameTimer) {
      clearTimeout(gameTimer);
    }
    
    const duration = gameState.gameDuration * 1000; // convert to milliseconds
    const startTime = gameState.gameStartTime || Date.now();
    const endTime = startTime + duration;
    const timeLeft = endTime - Date.now();
    
    if (timeLeft <= 0) {
      endGame();
      return;
    }
    
    const timer = setTimeout(() => {
      endGame();
    }, timeLeft);
    
    setGameTimer(timer);
  };

  const endGame = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    // Find player with most cards
    let winner = gameState.players[0];
    for (const player of gameState.players) {
      if (player.cards.length > winner.cards.length) {
        winner = player;
      }
    }
    
    const updatedGameState = {
      ...gameState,
      isGameOver: true,
      winner
    };
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    // Update room status to finished
    supabase
      .from('game_rooms')
      .update({ status: 'finished' })
      .eq('id', currentRoom.id)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating room status:", error);
        }
      });
  };

  const startTurnTimer = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    // Clear any existing timer
    if (turnTimer) {
      clearTimeout(turnTimer);
    }
    
    const turnLimit = gameState.turnTimeLimit * 1000; // convert to milliseconds
    
    const timer = setTimeout(() => {
      autoPlayTurn();
    }, turnLimit);
    
    setTurnTimer(timer);
    
    // Update game state with turn start time
    const updatedGameState = {
      ...gameState,
      turnStartTime: Date.now()
    };
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
  };

  const autoPlayTurn = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.cards.length) return;
    
    // Update auto play count for the player
    const autoPlayCount = currentPlayer.autoPlayCount + 1;
    
    // Check if player should be kicked
    if (autoPlayCount >= 2) {
      kickPlayer(currentPlayer.id);
      return;
    }
    
    // Auto play a card
    const card = currentPlayer.cards[0];
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, cards: player.cards.slice(1), autoPlayCount } 
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
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    // Check for card match
    checkForCardMatch(card, updatedGameState);
    
    // Start timer for the next player
    startTurnTimer();
  };

  const kickPlayer = async (playerId: string) => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    try {
      // Remove player from game state
      const updatedPlayers = gameState.players.filter(p => p.id !== playerId);
      
      // If no players left, end the game
      if (updatedPlayers.length === 0) {
        endGame();
        return;
      }
      
      // Update current player index if needed
      let currentPlayerIndex = gameState.currentPlayerIndex;
      if (updatedPlayers.length <= currentPlayerIndex) {
        currentPlayerIndex = 0;
      }
      
      const updatedGameState = {
        ...gameState,
        players: updatedPlayers,
        currentPlayerIndex
      };
      
      roomChannel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { gameState: updatedGameState }
      });
      
      setGameState(updatedGameState);
      
      // If player is the current user, leave the room
      if (playerId === user?.id) {
        toast({
          title: "You've been removed from the game",
          description: "You missed your turn too many times",
          variant: "destructive"
        });
        
        leaveRoom();
      } else {
        // Remove player from database
        const { error: removeError } = await supabase
          .from('game_players')
          .delete()
          .eq('room_id', currentRoom.id)
          .eq('user_id', playerId);
        
        if (removeError) {
          console.error("Error removing kicked player:", removeError);
        }
        
        // Update player count
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ player_count: Math.max(1, currentRoom.player_count - 1) })
          .eq('id', currentRoom.id);
        
        if (updateError) {
          console.error("Error updating player count after kick:", updateError);
        }
        
        // Start timer for next player
        startTurnTimer();
      }
    } catch (error) {
      console.error("Error kicking player:", error);
    }
  };

  const playCard = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    // Clear the turn timer since player is manually playing
    if (turnTimer) {
      clearTimeout(turnTimer);
      setTurnTimer(null);
    }
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.cards.length) return;
    
    console.log("Playing card");
    
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
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    // Check for card match
    checkForCardMatch(card, updatedGameState);
    
    // Start timer for the next player
    startTurnTimer();
  };

  const checkForCardMatch = (playedCard: Card, currentGameState: GameState) => {
    if (!currentGameState.centralPile.length || currentGameState.centralPile.length < 2) return;
    
    const topCard = currentGameState.centralPile[currentGameState.centralPile.length - 2];
    
    if (topCard.rank === playedCard.rank) {
      // We have a match! The current player wins the pile
      const currentPlayerIndex = currentGameState.currentPlayerIndex;
      const previousPlayerIndex = (currentPlayerIndex + currentGameState.players.length - 1) % currentGameState.players.length;
      
      const updatedPlayers = currentGameState.players.map((player, idx) => 
        idx === previousPlayerIndex 
          ? { ...player, cards: [...player.cards, ...currentGameState.centralPile] } 
          : player
      );
      
      const updatedGameState = {
        ...currentGameState,
        players: updatedPlayers,
        centralPile: [],
        lastMatchWinner: currentGameState.players[previousPlayerIndex].id
      };
      
      if (roomChannel) {
        roomChannel.send({
          type: 'broadcast',
          event: 'game_state',
          payload: { gameState: updatedGameState }
        });
      }
      
      setGameState(updatedGameState);
      
      toast({
        title: `Match!`,
        description: `${currentGameState.players[previousPlayerIndex].username} won ${currentGameState.centralPile.length} cards!`,
        variant: "default"
      });
    }
  };

  const collectPile = () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    console.log("Collecting pile");
    
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
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;
    
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
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
  };

  const initializeGame = async (roomId: string, maxPlayers: number) => {
    if (!user) return;
    
    console.log("Initializing game state for room:", roomId);
    
    try {
      // Update room status to playing
      await supabase
        .from('game_rooms')
        .update({ status: 'playing' })
        .eq('id', roomId);
      
      // Get all players in the room
      const { data: playersData, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId);
      
      if (playersError) {
        console.error("Error fetching players:", playersError);
        return;
      }
      
      if (!playersData || playersData.length === 0) {
        console.error("No players found in room");
        return;
      }
      
      console.log("Found players in room:", playersData);
      
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
      
      const shuffled = [...deck].sort(() => Math.random() - 0.5);
      const cardsPerPlayer = Math.floor(shuffled.length / playersData.length);
      
      const players: Player[] = [];
      
      // Create players based on players in database
      playersData.forEach((playerData, index) => {
        const startIdx = index * cardsPerPlayer;
        const endIdx = index === playersData.length - 1 
          ? shuffled.length 
          : (index + 1) * cardsPerPlayer;
        
        players.push({
          id: playerData.user_id,
          username: playerData.username,
          cards: shuffled.slice(startIdx, endIdx),
          isActive: true,
          autoPlayCount: 0
        });
      });
      
      const initialGameState = {
        players,
        currentPlayerIndex: 0,
        centralPile: [],
        isGameOver: false,
        gameStarted: true,
        gameStartTime: Date.now(),
        gameDuration: 300, // 5 minutes
        turnTimeLimit: 15 // 15 seconds
      };
      
      console.log("Created initial game state with players:", players.length);
      
      if (roomChannel) {
        roomChannel.send({
          type: 'broadcast',
          event: 'game_state',
          payload: { gameState: initialGameState }
        });
      }
      
      setGameState(initialGameState);
      
      // Start game timer and turn timer
      setTimeout(() => {
        startGameTimer();
        startTurnTimer();
      }, 1000);
    } catch (error) {
      console.error("Error initializing game state:", error);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchRooms();
    }
  }, [isConnected, fetchRooms]);

  // Effect to listen for game state changes and handle timers
  useEffect(() => {
    if (gameState?.gameStarted && !gameTimer) {
      startGameTimer();
    }
    
    if (gameState?.gameStarted && !turnTimer && user?.id === gameState.players[gameState.currentPlayerIndex]?.id) {
      startTurnTimer();
    }
  }, [gameState, gameTimer, turnTimer, user]);

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
        fetchRooms,
        initializeGame
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
