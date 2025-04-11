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
  coins?: number;
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
  host_id: string;
  host_name: string;
  max_players: number;
  player_count: number;
  is_private: boolean;
  password?: string;
  status: 'waiting' | 'playing' | 'finished';
  bet_amount: number;
  created_at: string;
}

interface UserData {
  id: string;
  email: string;
  username?: string;
  coins: number;
}

type SocketContextType = {
  isConnected: boolean;
  availableRooms: RoomData[];
  currentRoom: RoomData | null;
  gameState: GameState | null;
  roomChannel: RealtimeChannel | null;
  createRoom: (roomData: { name: string; playerCount: number; betAmount: number; isPrivate: boolean; password?: string }) => Promise<string>;
  joinRoom: (roomId: string, password?: string) => Promise<boolean>;
  leaveRoom: () => void;
  playCard: () => void;
  collectPile: () => void;
  shuffleDeck: () => void;
  fetchRooms: () => void;
  startGame: () => void;
  kickInactivePlayer: (playerId: string) => void;
  endGame: (winningPlayerId?: string) => void;
};

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  availableRooms: [],
  currentRoom: null,
  gameState: null,
  roomChannel: null,
  createRoom: async () => "",
  joinRoom: async () => false,
  leaveRoom: () => {},
  playCard: () => {},
  collectPile: () => {},
  shuffleDeck: () => {},
  fetchRooms: () => {},
  startGame: () => {},
  kickInactivePlayer: () => {},
  endGame: () => {}
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<RoomData[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomChannel, setRoomChannel] = useState<RealtimeChannel | null>(null);
  const [joinInProgress, setJoinInProgress] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session ? "User logged in" : "No session");
      setIsConnected(!!session);
    });

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
          
          if (currentRoom && currentRoom.id === roomId) {
            console.log("Player change detected, refreshing game state");
            initializeGame(roomId, currentRoom.max_players);
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
      .on(
        'broadcast',
        { event: 'player_joined' },
        (payload) => {
          console.log('Player joined broadcast received:', payload);
          fetchRooms();
          if (currentRoom) {
            initializeGame(currentRoom.id, currentRoom.max_players);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'player_kicked' },
        (payload) => {
          console.log('Player kicked broadcast received:', payload);
          fetchRooms();
          
          // If current user was kicked
          if (payload.payload && payload.payload.kickedId === user?.id) {
            toast({
              title: "You were kicked",
              description: "You were removed from the game due to inactivity",
              variant: "destructive"
            });
            
            // Redirect to lobby
            window.location.href = "/lobby";
          } else if (currentRoom) {
            initializeGame(currentRoom.id, currentRoom.max_players);
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
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session || !user) {
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
        const channel = joinRoomChannel(data.id);
        
        const { error: playerError } = await supabase
          .from('game_players')
          .insert([{
            room_id: data.id,
            user_id: user.id,
            username: user.username || user.email || "Player"
          }]);
          
        if (playerError) {
          console.error("Error adding host as player:", playerError);
        }
        
        initializeGame(data.id, data.max_players);
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

  const signInDemoUser = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@example.com',
        password: 'demopassword'
      });

      if (error) {
        console.error("Demo signin failed, trying to sign up:", error);
        
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
    
    // Prevent multiple join attempts
    if (joinInProgress) {
      console.log("Join already in progress, skipping");
      return false;
    }
    
    setJoinInProgress(true);
    console.log("Joining room:", roomId, "with password:", password ? "provided" : "none");
    
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomError || !roomData) {
        console.error("Error fetching room:", roomError);
        toast({
          title: "Room not found",
          description: "The room you're trying to join doesn't exist.",
          variant: "destructive"
        });
        setJoinInProgress(false);
        return false;
      }
      
      // Check if player has enough coins using local user state
      if (user.coins < roomData.bet_amount) {
        toast({
          title: "Insufficient Coins",
          description: `You need ${roomData.bet_amount} coins to join this room.`,
          variant: "destructive"
        });
        setJoinInProgress(false);
        return false;
      }

      // Check if the player is already in the room
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      
      if (existingPlayer) {
        console.log("Player already in room, just refreshing state");
        setCurrentRoom(roomData as RoomData);
        joinRoomChannel(roomId);
        await initializeGame(roomId, roomData.max_players);
        setJoinInProgress(false);
        return true;
      }
      
      // Only check player count for new players joining
      if (roomData.player_count >= roomData.max_players) {
        toast({
          title: "Room full",
          description: "This room is already full.",
          variant: "destructive"
        });
        setJoinInProgress(false);
        return false;
      }
      
      if (roomData.is_private) {
        if (!password) {
          toast({
            title: "Password required",
            description: "This room requires a password.",
            variant: "destructive"
          });
          setJoinInProgress(false);
          return false;
        }
        
        if (password !== roomData.password) {
          toast({
            title: "Incorrect password",
            description: "The password you entered is incorrect.",
            variant: "destructive"
          });
          setJoinInProgress(false);
          return false;
        }
      }
      
      // Deduct coins from local user state
      const newCoins = user.coins - roomData.bet_amount;
      user.coins = newCoins;
      
      // Show coin deduction notification
      toast({
        title: "Room Joined",
        description: `${roomData.bet_amount} coins have been deducted. Current balance: ${newCoins} coins`,
      });
      
      // New player joining
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
        setJoinInProgress(false);
        return false;
      }
      
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ player_count: roomData.player_count + 1 })
        .eq('id', roomId);
      
      if (updateError) {
        console.error("Error updating player count:", updateError);
      }
      
      roomData.player_count += 1;
      
      setCurrentRoom(roomData as RoomData);
      const channel = joinRoomChannel(roomId);
      
      const { data: playersData } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomId);
      
      console.log("Players in room:", playersData);
      console.log(`Total player count: ${playersData?.length || 0}`);
      
      if (playersData && playersData.length > 0) {
        console.log(`Setting player count to ${playersData.length}`);
        
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ player_count: playersData.length })
          .eq('id', roomId);
        
        if (updateError) {
          console.error("Error updating player count:", updateError);
        } else {
          roomData.player_count = playersData.length;
          setCurrentRoom(roomData as RoomData);
        }
      }
      
      await initializeGame(roomId, roomData.max_players);
      
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
      
      setJoinInProgress(false);
      return true;
    } catch (error) {
      console.error("Exception joining room:", error);
      toast({
        title: "Error",
        description: "Something went wrong joining the room",
        variant: "destructive"
      });
      setJoinInProgress(false);
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

  // Add function to kick inactive players
  const kickInactivePlayer = async (playerId: string) => {
    if (!gameState || !roomChannel || !currentRoom || !user) return;
    
    // Only host can kick players
    if (gameState.players[0].id !== user.id) {
      console.log("Only host can kick players");
      return;
    }
    
    try {
      console.log(`Kicking inactive player: ${playerId}`);
      
      // Get the player to be kicked
      const playerToKick = gameState.players.find(p => p.id === playerId);
      if (!playerToKick) {
        console.error("Player to kick not found");
        return;
      }
      
      // Remove player from game state
      const updatedPlayers = gameState.players.filter(p => p.id !== playerId);
      
      if (updatedPlayers.length === 0) {
        console.log("Cannot kick last player");
        return;
      }
      
      // Adjust current player index if needed
      let nextPlayerIndex = gameState.currentPlayerIndex;
      if (nextPlayerIndex >= updatedPlayers.length) {
        nextPlayerIndex = 0;
      }
      
      const updatedGameState = {
        ...gameState,
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
        turnEndTime: Date.now() + 15000
      };
      
      // Broadcast updated game state
      roomChannel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { gameState: updatedGameState }
      });
      
      // Broadcast player kicked event
      roomChannel.send({
        type: 'broadcast',
        event: 'player_kicked',
        payload: { 
          kickedId: playerId,
          kickedName: playerToKick.username
        }
      });
      
      // Remove from database
      const { error: removeError } = await supabase
        .from('game_players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', playerId);
      
      if (removeError) {
        console.error("Error removing player from database:", removeError);
      }
      
      // Update room player count
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ player_count: Math.max(1, currentRoom.player_count - 1) })
        .eq('id', currentRoom.id);
      
      if (updateError) {
        console.error("Error updating player count:", updateError);
      }
      
      // Update current room
      setCurrentRoom({
        ...currentRoom,
        player_count: Math.max(1, currentRoom.player_count - 1)
      });
      
      setGameState(updatedGameState);
      
      toast({
        title: "Player kicked",
        description: `${playerToKick.username} was removed for inactivity`
      });
    } catch (error) {
      console.error("Error kicking inactive player:", error);
    }
  };

  useEffect(() => {
    const checkTimers = () => {
      if (!gameState || !gameState.gameStarted || gameState.isGameOver) return;
      
      const now = Date.now();
      
      // Check if game duration has expired
      if (gameState.gameStartTime && gameState.roomDuration) {
        const gameEndTime = gameState.gameStartTime + gameState.roomDuration;
        if (now > gameEndTime) {
          endGame();
          return;
        }
      }
      
      // Check for turn timeout
      if (gameState.turnEndTime && now > gameState.turnEndTime) {
        handleTurnTimeout();
      }
      
      // Check if any player has won by having no cards
      const playerWithNoCards = gameState.players.find(player => player.cards.length === 0);
      if (playerWithNoCards) {
        endGame(playerWithNoCards.id);
        return;
      }

      // Check if all players except one have left
      const activePlayers = gameState.players.filter(p => p.isActive);
      if (activePlayers.length === 1) {
        endGame(activePlayers[0].id);
        return;
      }

      // Check if all players have been inactive for too long
      const allInactive = gameState.players.every(p => p.autoPlayCount >= 2);
      if (allInactive) {
        endGame();
        return;
      }
    };
    
    const timerId = setInterval(checkTimers, 1000);
    return () => clearInterval(timerId);
  }, [gameState]);

  const handleTurnTimeout = () => {
    if (!gameState || !roomChannel) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.cards.length) return;
    
    console.log(`Turn timeout for player ${currentPlayer.username}, auto-playing`);
    
    const card = currentPlayer.cards[0];
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, 
            cards: player.cards.slice(1), 
            autoPlayCount: player.autoPlayCount + 1 
          } 
        : player
    );
    
    const updatedPile = [...gameState.centralPile, card];
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    // Check for match with the previous card
    let matchFound = false;
    let matchAnimation = undefined;
    
    if (updatedPile.length > 1) {
      const previousCard = updatedPile[updatedPile.length - 2];
      const playedCard = updatedPile[updatedPile.length - 1];
      
      matchFound = checkCardMatch(playedCard, previousCard);
      
      if (matchFound) {
        matchAnimation = {
          isActive: true,
          cardId: playedCard.id,
          playerId: currentPlayer.id
        };
      }
    }
    
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      centralPile: updatedPile,
      currentPlayerIndex: nextPlayerIndex,
      turnEndTime: Date.now() + 15000,
      matchAnimation
    };
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    // If match was found, handle match after animation delay
    if (matchFound) {
      setTimeout(() => {
        handleCardMatch(currentPlayer.id);
      }, 1500);
    }
    
    toast({
      title: "Turn timeout",
      description: `${currentPlayer.username}'s turn timed out. Card auto-played.`
    });
  };

  const endGame = async (winningPlayerId?: string) => {
    if (!gameState || !roomChannel || !currentRoom) return;
    
    console.log(`Ending game, winner ID: ${winningPlayerId || "none - determining by card count"}`);
    
    let winner: Player | undefined;
    if (winningPlayerId) {
      winner = gameState.players.find(p => p.id === winningPlayerId);
    } else {
      // If no specific winner, determine by card count
      const sortedPlayers = [...gameState.players].sort((a, b) => b.cards.length - a.cards.length);
      winner = sortedPlayers[0];
    }
    
    if (!winner) return;
    
    // Calculate coins won
    const coinsWon = currentRoom.bet_amount * gameState.players.length;
    
    // Update winner's coins
    const updatedPlayers = gameState.players.map(player => {
      if (player.id === winner?.id) {
        return {
          ...player,
          coins: (player.coins || 0) + coinsWon,
          wins: (player.wins || 0) + 1
        };
      } else {
        return {
          ...player,
          losses: (player.losses || 0) + 1
        };
      }
    });
    
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      isGameOver: true,
      winner
    };
    
    // Broadcast the game over state
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    // Update room status in database
    try {
      await supabase
        .from('game_rooms')
        .update({ 
          status: "finished",
          winner_id: winner.id,
          ended_at: new Date().toISOString()
        })
        .eq('id', currentRoom.id);

      // Update player stats in game_players table
      for (const player of updatedPlayers) {
        // First, get the current player record
        const { data: playerData, error: fetchError } = await supabase
          .from('game_players')
          .select('*')
          .eq('user_id', player.id)
          .eq('room_id', currentRoom.id)
          .single();

        if (fetchError) {
          console.error("Error fetching player data:", fetchError);
          continue;
        }

        // Update the player's stats
        await supabase
          .from('game_players')
          .update({
            username: player.username,
            joined_at: playerData.joined_at
          })
          .eq('user_id', player.id)
          .eq('room_id', currentRoom.id);
      }
    } catch (error) {
      console.error("Error updating game completion data:", error);
    }
    
    toast({
      title: "Game Over!",
      description: `${winner.username} wins the game and ${coinsWon} coins!`
    });
  };

  // Improved card matching logic
  const checkCardMatch = (playedCard: Card, topCard: Card): boolean => {
    // Cards match if they have the same rank only (not suit)
    console.log(`Checking match: ${playedCard.rank}${playedCard.suit} with ${topCard.rank}${topCard.suit}`);
    const isMatch = playedCard.rank === topCard.rank;
    console.log(`Match result: ${isMatch}`);
    return isMatch;
  };

  // Handler for after card match animation completes
  const handleCardMatch = (playerId: string) => {
    if (!gameState || !roomChannel) return;
    
    console.log(`Handling card match for player: ${playerId}`);
    
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      console.error(`Player with ID ${playerId} not found`);
      return;
    }
    
    // Move all central pile cards to the player's hand
    const updatedPlayers = [...gameState.players];
    const centralPileCards = [...gameState.centralPile];
    updatedPlayers[playerIndex] = {
      ...updatedPlayers[playerIndex],
      cards: [...updatedPlayers[playerIndex].cards, ...centralPileCards]
    };
    
    // Check if this match makes the player win (has all cards)
    const totalCards = updatedPlayers.reduce((sum, player) => sum + player.cards.length, 0);
    const winningPlayer = updatedPlayers[playerIndex];
    
    if (winningPlayer.cards.length === totalCards) {
      // Player has all cards, they win!
      const updatedGameState = {
        ...gameState,
        players: updatedPlayers,
        centralPile: [],
        isGameOver: true,
        winner: winningPlayer,
        matchAnimation: {
          isActive: true,
          cardId: centralPileCards[centralPileCards.length - 1]?.id || "",
          playerId: playerId
        }
      };
      
      console.log("Game Over - Player has all cards:", winningPlayer.username);
      
      // Broadcast the game over state
      roomChannel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { gameState: updatedGameState }
      });
      
      setGameState(updatedGameState);
      
      // Call endGame to handle database updates and notifications
      endGame(winningPlayer.id);
      return;
    }
    
    // If no winner yet, continue with normal match handling
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      centralPile: [],
      lastMatchWinner: playerId,
      matchAnimation: {
        isActive: true,
        cardId: centralPileCards[centralPileCards.length - 1]?.id || "",
        playerId: playerId
      }
    };
    
    console.log("Broadcasting updated game state after match");
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    toast({
      title: "Match found!",
      description: `${updatedPlayers[playerIndex].username} won the pile with a matching card!`
    });
  };

  const playCard = () => {
    if (!gameState || !currentRoom || !roomChannel || !gameState.gameStarted) return;
    
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.cards.length) return;
    
    console.log("Playing card");
    
    // Get the top card from the player's hand
    const card = currentPlayer.cards[0];
    console.log(`Playing card: ${card.rank}${card.suit}`);
    
    // Remove the played card from the player's hand
    const updatedPlayers = gameState.players.map((player, idx) => 
      idx === gameState.currentPlayerIndex 
        ? { ...player, cards: player.cards.slice(1) } 
        : player
    );
    
    // Add the card to the central pile
    const updatedPile = [...gameState.centralPile, card];
    
    // Determine the next player
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    // Check for a match with the previous card
    let matchFound = false;
    let matchAnimation = undefined;
    
    if (updatedPile.length > 1) {
      const previousCard = updatedPile[updatedPile.length - 2];
      const playedCard = updatedPile[updatedPile.length - 1];
      
      matchFound = checkCardMatch(playedCard, previousCard);
      
      if (matchFound) {
        console.log("Card match! Player wins the pile");
        
        // Create match animation state
        matchAnimation = {
          isActive: true,
          cardId: playedCard.id,
          playerId: currentPlayer.id
        };
      }
    }
    
    // Update game state with the played card
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      centralPile: updatedPile,
      currentPlayerIndex: nextPlayerIndex,
      lastMatchWinner: gameState.lastMatchWinner,
      turnEndTime: Date.now() + 15000,
      matchAnimation
    };
    
    console.log("Broadcasting updated game state after playing card");
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    setGameState(updatedGameState);
    
    // If match was found, handle match after animation delay
    if (matchFound) {
      console.log("Scheduling match handling after animation");
      setTimeout(() => {
        handleCardMatch(currentPlayer.id);
      }, 1500);
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

  const startGame = async () => {
    if (!gameState || !currentRoom || !roomChannel) return;
    
    // Prevent starting if game is already in progress
    if (gameState.gameStarted && !gameState.isGameOver) {
      console.log("Game is already in progress");
      return;
    }
    
    console.log("Starting game");
    
    // First, initialize the game and distribute cards
    await initializeGame(currentRoom.id, currentRoom.max_players);
    
    // Only proceed if gameState was updated by initializeGame
    if (!gameState) return;
    
    const gameStartTime = Date.now();
    const roomDuration = 5 * 60 * 1000;
    
    const updatedPlayers = gameState.players.map(player => {
      const currentCoins = player.coins !== undefined ? player.coins : 1000;
      const newCoins = Math.max(0, currentCoins - currentRoom.bet_amount);
      console.log(`Deducting ${currentRoom.bet_amount} coins from ${player.username}. Before: ${currentCoins}, After: ${newCoins}`);
      return {
        ...player,
        coins: newCoins
      };
    });
    
    const updatedGameState = {
      ...gameState,
      players: updatedPlayers,
      gameStarted: true,
      gameStartTime,
      roomDuration,
      turnEndTime: gameStartTime + 15000,
      isGameOver: false // Explicitly set to false when starting
    };
    
    roomChannel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: updatedGameState }
    });
    
    toast({
      title: "Game started!",
      description: `The cards have been shuffled and dealt. ${currentRoom.bet_amount} coins have been collected from each player.`
    });
    
    setGameState(updatedGameState);
    
    supabase
      .from('game_rooms')
      .update({ status: "playing" })
      .eq('id', currentRoom.id)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating room status:", error);
        }
      });
  };

  const initializeGame = async (roomId: string, maxPlayers: number) => {
    if (!user) return;
    
    console.log("Initializing game state for room:", roomId);
    
    try {
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
      console.log(`Total players in room: ${playersData.length}`);
      
      if (currentRoom && currentRoom.player_count !== playersData.length) {
        console.log(`Updating room player count from ${currentRoom.player_count} to ${playersData.length}`);
        
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ player_count: playersData.length })
          .eq('id', roomId);
          
        if (updateError) {
          console.error("Error updating room player count:", updateError);
        } else if (currentRoom) {
          setCurrentRoom({
            ...currentRoom,
            player_count: playersData.length
          });
        }
      }
      
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
          autoPlayCount: 0,
          coins: 1000
        });
      });
      
      if (gameState && gameState.players.length > 0) {
        const updatedPlayers = players.map(player => {
          const existingPlayer = gameState.players.find(p => p.id === player.id);
          if (existingPlayer && existingPlayer.coins !== undefined) {
            return { 
              ...player, 
              coins: existingPlayer.coins,
              autoPlayCount: existingPlayer.autoPlayCount || 0 
            };
          }
          return player;
        });
        
        players.splice(0, players.length, ...updatedPlayers);
      }
      
      // Create a new game state with cards distributed but game not started yet
      const initialGameState: GameState = {
        players,
        currentPlayerIndex: 0,
        centralPile: [],
        isGameOver: false, // Keep this false until startGame is called
        gameStarted: false, // Keep this false until startGame is called
        gameStartTime: undefined,
        turnEndTime: undefined,
        roomDuration: undefined
      };
      
      console.log("Created game state with players:", players.length);
      
      // Update the game state first
      setGameState(initialGameState);
      
      // Then broadcast the update
      if (roomChannel) {
        roomChannel.send({
          type: 'broadcast',
          event: 'game_state',
          payload: { gameState: initialGameState }
        });
      }
      
      return initialGameState;
    } catch (error) {
      console.error("Error initializing game state:", error);
      return null;
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchRooms();
    }
  }, [isConnected, fetchRooms]);

  return (
    <SocketContext.Provider 
      value={{ 
        isConnected, 
        availableRooms, 
        currentRoom, 
        gameState,
        roomChannel,
        createRoom,
        joinRoom,
        leaveRoom,
        playCard,
        collectPile,
        shuffleDeck,
        fetchRooms,
        startGame,
        kickInactivePlayer,
        endGame
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

