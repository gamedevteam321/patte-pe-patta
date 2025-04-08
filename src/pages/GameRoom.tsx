
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Clock, Shuffle, Play, Info, Lock } from "lucide-react";

interface Player {
  id: string;
  username: string;
  avatar: string;
  cardsCount: number;
  isCurrentPlayer: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
}

interface GameState {
  roomId: string;
  roomName: string;
  isPrivate: boolean;
  betAmount: number;
  gameTimer: number;
  turnTimer: number;
  players: Player[];
  pile: {
    topCard: string | null;
    count: number;
  };
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  isYourTurn: boolean;
  yourCards: string[];
  canShuffle: boolean;
}

const SUITS = ['♥', '♦', '♠', '♣'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Helper function to convert card notation to display
const getCardDisplay = (card: string | null) => {
  if (!card) return null;
  
  const value = card.slice(0, -1);
  const suit = card.slice(-1);
  
  const color = suit === '♥' || suit === '♦' ? 'text-red-500' : 'text-black';
  
  return { value, suit, color };
};

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Effect to authenticate user
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);
  
  // Effect to initialize game state (mock)
  useEffect(() => {
    if (!roomId || !user) return;
    
    // Get requested player count from URL query param or default to 4
    // In a real app, you would get this from the server
    const playerCountParam = new URLSearchParams(window.location.search).get('players');
    const playerCount = playerCountParam ? parseInt(playerCountParam) : 4;
    
    // Create mock players based on requested count
    let mockPlayers: Player[] = [
      {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        cardsCount: 13,
        isCurrentPlayer: true,
        position: 'bottom'
      }
    ];
    
    // Add AI players based on requested count
    if (playerCount >= 2) {
      mockPlayers.push({
        id: 'player2',
        username: 'Player 2',
        avatar: '/avatars/avatar2.png',
        cardsCount: 13,
        isCurrentPlayer: false,
        position: playerCount === 2 ? 'top' : 'right'
      });
    }
    
    if (playerCount >= 3) {
      mockPlayers.push({
        id: 'player3',
        username: 'Player 3',
        avatar: '/avatars/avatar3.png',
        cardsCount: 13,
        isCurrentPlayer: false,
        position: playerCount === 3 ? 'left' : 'top'
      });
    }
    
    if (playerCount >= 4) {
      mockPlayers.push({
        id: 'player4',
        username: 'Player 4',
        avatar: '/avatars/avatar4.png',
        cardsCount: 13,
        isCurrentPlayer: false,
        position: 'left'
      });
    }
    
    // Create mock game state
    const initialState: GameState = {
      roomId: roomId,
      roomName: "Satta Kings Arena",
      isPrivate: false,
      betAmount: 100,
      gameTimer: 120,
      turnTimer: 10,
      players: mockPlayers,
      pile: {
        topCard: null,
        count: 0
      },
      status: 'waiting',
      winner: null,
      isYourTurn: true,
      yourCards: ['A♥', '2♦', '3♣', 'K♠', 'Q♥', '10♦', '7♠', '5♣', '9♥', 'J♦', '4♣', '8♠', '6♥'],
      canShuffle: true
    };
    
    setGameState(initialState);
    showMessage("Game starting! Your turn first.");
  }, [roomId, user]);
  
  // Effect to handle the game timer
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    
    const interval = setInterval(() => {
      setGameState(prev => {
        if (!prev) return null;
        
        // Decrement game timer
        let newGameTimer = prev.gameTimer - 1;
        let newTurnTimer = prev.turnTimer - 1;
        
        // Handle turn timeout
        if (newTurnTimer <= 0 && prev.isYourTurn) {
          // Auto play card
          const randomCardIndex = Math.floor(Math.random() * prev.yourCards.length);
          handlePlayCard(randomCardIndex);
          showMessage("Time's up! Card auto-played.");
          newTurnTimer = 10;
        }
        
        // Handle game end
        if (newGameTimer <= 0) {
          // End game logic
          clearInterval(interval);
          handleGameEnd();
          return {
            ...prev,
            gameTimer: 0,
            turnTimer: 0,
            status: 'finished'
          };
        }
        
        return {
          ...prev,
          gameTimer: newGameTimer,
          turnTimer: prev.isYourTurn ? newTurnTimer : 10
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState?.status]);
  
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };
  
  const handleStartGame = () => {
    if (!gameState) return;
    
    setGameState({
      ...gameState,
      status: 'playing'
    });
    
    showMessage("Game started! It's your turn.");
  };
  
  const handlePlayCard = (cardIndex: number) => {
    if (!gameState || !gameState.isYourTurn || gameState.status !== 'playing') return;
    
    const playedCard = gameState.yourCards[cardIndex];
    const newYourCards = [...gameState.yourCards];
    newYourCards.splice(cardIndex, 1);
    
    // Check for match with top card
    const isMatch = gameState.pile.topCard && 
                    playedCard.slice(0, -1) === gameState.pile.topCard.slice(0, -1);
    
    let newPileCount = gameState.pile.count + 1;
    let newPile = {
      topCard: playedCard,
      count: newPileCount
    };
    
    // If there's a match, player gets all cards in pile
    if (isMatch) {
      newYourCards.push(...Array(gameState.pile.count).fill('?'));
      newPile = {
        topCard: null,
        count: 0
      };
      showMessage("Match! You collected all cards in the pile!");
    }
    
    // Mock the next player's turn
    const currentPlayerIndex = gameState.players.findIndex(p => p.isCurrentPlayer);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    const updatedPlayers = gameState.players.map((player, index) => ({
      ...player,
      isCurrentPlayer: index === nextPlayerIndex,
      cardsCount: player.id === user?.id ? newYourCards.length : 
                  index === nextPlayerIndex ? player.cardsCount : player.cardsCount - 1
    }));
    
    setGameState({
      ...gameState,
      pile: newPile,
      yourCards: newYourCards,
      players: updatedPlayers,
      isYourTurn: false,
      turnTimer: 10
    });
    
    // Mock other player's turn
    setTimeout(() => {
      if (!gameState) return;
      
      // Simulate next player playing a card
      const nextPlayer = updatedPlayers[nextPlayerIndex];
      const randomSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
      const randomValue = VALUES[Math.floor(Math.random() * VALUES.length)];
      const nextCard = randomValue + randomSuit;
      
      // Check if next card matches the top card
      const nextIsMatch = newPile.topCard && 
                      nextCard.slice(0, -1) === newPile.topCard.slice(0, -1);
      
      let nextPileCount = newPile.count + 1;
      let nextPileTopCard = nextCard;
      
      // If there's a match, next player gets all cards in pile
      if (nextIsMatch) {
        nextPileCount = 0;
        nextPileTopCard = null;
        showMessage(`${nextPlayer.username} matched and collected the pile!`);
      }
      
      // Move to the player's turn again
      const afterNextPlayerIndex = (nextPlayerIndex + 1) % updatedPlayers.length;
      
      const finalPlayers = updatedPlayers.map((player, index) => ({
        ...player,
        isCurrentPlayer: index === afterNextPlayerIndex
      }));
      
      setGameState(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          pile: {
            topCard: nextPileTopCard,
            count: nextPileCount
          },
          players: finalPlayers,
          isYourTurn: afterNextPlayerIndex === 0,
          turnTimer: 10
        };
      });
      
      if (afterNextPlayerIndex === 0) {
        showMessage("Your turn!");
      }
    }, 1500);
  };
  
  const handleShuffleDeck = () => {
    if (!gameState || !gameState.canShuffle) return;
    
    // Shuffle the player's cards
    const shuffledCards = [...gameState.yourCards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    
    setGameState({
      ...gameState,
      yourCards: shuffledCards,
      canShuffle: false
    });
    
    showMessage("Your cards have been shuffled!");
  };
  
  const handleGameEnd = () => {
    if (!gameState || !user) return;
    
    // Determine winner by most cards
    const playerCardCounts = gameState.players.map(p => ({
      id: p.id,
      username: p.username,
      cardsCount: p.id === user.id ? gameState.yourCards.length : p.cardsCount
    }));
    
    playerCardCounts.sort((a, b) => b.cardsCount - a.cardsCount);
    const winner = playerCardCounts[0];
    
    setGameState({
      ...gameState,
      status: 'finished',
      winner: winner.id
    });
    
    // Update user stats
    if (winner.id === user.id) {
      toast({
        title: "You Won!",
        description: `You've won ${gameState.betAmount * gameState.players.length} coins!`,
        variant: "default",
      });
      
      // Update user's coins and stats
      updateUser({
        coins: user.coins + (gameState.betAmount * (gameState.players.length - 1)),
        wins: user.wins + 1
      });
    } else {
      toast({
        title: "You Lost!",
        description: `${winner.username} won the game.`,
        variant: "destructive",
      });
      
      // Update user's stats
      updateUser({
        losses: user.losses + 1
      });
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const getPlayerPosition = (position: string) => {
    switch (position) {
      case 'top':
        return 'order-1 justify-center';
      case 'right':
        return 'order-2 justify-end';
      case 'bottom':
        return 'order-4 justify-center';
      case 'left':
        return 'order-3 justify-start';
      default:
        return 'justify-center';
    }
  };
  
  if (!gameState || !user) {
    return <div className="flex items-center justify-center h-screen">Loading game...</div>;
  }
  
  return (
    <Layout showNav={false}>
      <div className="relative min-h-screen">
        {/* Game Header */}
        <div className="absolute top-0 left-0 right-0 glass-panel m-2 p-2 flex items-center justify-between">
          <Button 
            variant="ghost" 
            className="text-gray-400"
            onClick={() => {
              if (gameState.status === 'playing') {
                if (window.confirm("Are you sure you want to leave? You'll lose your bet.")) {
                  navigate("/lobby");
                }
              } else {
                navigate("/lobby");
              }
            }}
          >
            Leave Room
          </Button>
          
          <div className="text-xl font-bold text-game-cyan text-glow flex items-center">
            {gameState.roomName} 
            {gameState.isPrivate && (
              <Lock className="ml-2 h-4 w-4 text-game-yellow" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-game-yellow" />
            <span className={`font-mono ${gameState.gameTimer < 30 ? 'text-game-red' : 'text-game-yellow'}`}>
              {formatTime(gameState.gameTimer)}
            </span>
          </div>
        </div>

        {/* Game message */}
        {message && (
          <div className="absolute top-16 left-0 right-0 mx-auto w-3/4 max-w-md z-50">
            <div className="glass-panel p-3 text-center text-white bg-black/70 animate-slide-in">
              {message}
            </div>
          </div>
        )}
        
        {/* Game Status */}
        {gameState.status === 'finished' && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
            <Card className="glass-panel border-none p-8 max-w-md text-center">
              <h2 className="text-2xl font-bold mb-4">
                {gameState.winner === user.id ? (
                  <span className="text-game-green">You Won!</span>
                ) : (
                  <span className="text-game-red">You Lost!</span>
                )}
              </h2>
              
              <p className="mb-6">
                {gameState.winner === user.id ? (
                  <>You've won <span className="text-game-yellow font-bold">{gameState.betAmount * gameState.players.length} coins</span>!</>
                ) : (
                  <>The winner was {gameState.players.find(p => p.id === gameState.winner)?.username}</>
                )}
              </p>
              
              <Button 
                onClick={() => navigate("/lobby")} 
                className="bg-game-cyan hover:bg-game-cyan/80 text-black"
              >
                Return to Lobby
              </Button>
            </Card>
          </div>
        )}

        {/* Game Board */}
        <div className="flex flex-col items-center justify-center min-h-screen py-20">
          {/* Player UI layouts - only show the players that are in the game */}
          <div className="flex flex-1 w-full">
            {gameState.players.map((player) => (
              <div 
                key={player.id} 
                className={`flex flex-1 items-center ${getPlayerPosition(player.position)}`}
              >
                <div className={`glass-panel p-2 ${player.isCurrentPlayer ? 'neon-border' : ''}`}>
                  <div className="flex flex-col items-center">
                    <Avatar className={`w-12 h-12 border-2 ${player.isCurrentPlayer ? 'border-game-green animate-pulse-neon' : 'border-white/20'}`}>
                      <AvatarImage src={player.avatar} alt={player.username} />
                      <AvatarFallback>{player.username[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm mt-1 font-semibold">{player.username}</p>
                    <div className="flex items-center mt-1 space-x-1">
                      <div className="card-back relative">
                        <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                          {player.cardsCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Center pile */}
          <div className="flex-1 flex items-center justify-center relative">
            <div className="glass-panel p-6 rounded-full flex flex-col items-center">
              {gameState.pile.topCard ? (
                <div className={`card-front mb-2 ${getCardDisplay(gameState.pile.topCard)?.color}`}>
                  <span className="text-2xl font-bold">
                    {getCardDisplay(gameState.pile.topCard)?.value}
                    {getCardDisplay(gameState.pile.topCard)?.suit}
                  </span>
                </div>
              ) : (
                <div className="card-back mb-2 opacity-50">
                  <div className="absolute inset-0 flex items-center justify-center text-white/50">
                    ?
                  </div>
                </div>
              )}
              <div className="text-sm">
                Pile: <span className="font-bold">{gameState.pile.count}</span> cards
              </div>
              
              {gameState.status === 'waiting' && (
                <Button 
                  className="mt-4 bg-game-green hover:bg-game-green/80 text-black"
                  onClick={handleStartGame}
                >
                  Start Game
                </Button>
              )}
            </div>
            
            {/* Turn timer */}
            {gameState.status === 'playing' && gameState.isYourTurn && (
              <div className="absolute top-[-20px] left-1/2 transform -translate-x-1/2">
                <div className={`text-sm font-mono ${
                  gameState.turnTimer <= 3 ? 'text-game-red' : 'text-white'
                }`}>
                  Your turn: {gameState.turnTimer}s
                </div>
              </div>
            )}
          </div>

          {/* Player's cards - now showing them face down */}
          <div className="flex-1 w-full max-w-2xl">
            <div className="glass-panel p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm">
                  <Info className="h-3 w-3 inline mr-1" />
                  Your cards: <span className="font-bold">{gameState.yourCards.length}</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShuffleDeck}
                    disabled={!gameState.canShuffle || gameState.status !== 'playing'}
                    className={`${
                      gameState.canShuffle && gameState.status === 'playing'
                        ? "border-game-magenta text-game-magenta hover:bg-game-magenta/10"
                        : "border-gray-600 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Shuffle className="h-4 w-4 mr-1" />
                    Shuffle
                  </Button>
                  
                  <Button
                    size="sm"
                    disabled={!gameState.isYourTurn || gameState.status !== 'playing' || gameState.yourCards.length === 0}
                    className={`${
                      gameState.isYourTurn && gameState.status === 'playing' && gameState.yourCards.length > 0
                        ? "bg-game-cyan text-black hover:bg-game-cyan/80"
                        : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                    }`}
                    onClick={() => handlePlayCard(0)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Hit
                  </Button>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                {gameState.yourCards.map((card, index) => (
                  <button
                    key={index}
                    onClick={() => handlePlayCard(index)}
                    disabled={!gameState.isYourTurn || gameState.status !== 'playing'}
                    className={`${
                      index === 0 && gameState.isYourTurn && gameState.status === 'playing'
                        ? "animate-float"
                        : ""
                    }`}
                  >
                    {/* Show card backs instead of fronts */}
                    <div className="card-back">
                      <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                        {index === 0 && gameState.isYourTurn ? "↑" : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GameRoom;
