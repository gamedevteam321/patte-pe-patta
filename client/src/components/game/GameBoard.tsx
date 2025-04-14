import React, { useEffect, useState } from "react";
import { useSocket, GameState, Card } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users, RefreshCw, Play, Clock, AlertTriangle, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Add these animation styles
const styles = `
  @keyframes card-play {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) translate(0, -100px) rotate(360deg);
      opacity: 0;
    }
  }
  
  .card-in-motion {
    z-index: 10000;
    transform-origin: center;
  }
  
  .animate-card-play {
    animation: card-play 1s ease-out forwards;
  }
  
  .central-pile {
    position: relative;
    transition: transform 0.3s ease;
  }
  
  .central-pile:hover {
    transform: scale(1.05);
  }
  
  .animated-card {
    position: fixed;
    width: 64px;
    height: 96px;
    z-index: 1000;
    transform: translate(-50%, -50%);
    transition: left 0.8s ease-out, top 0.8s ease-out, transform 0.8s ease-out;
  }
  
  .card-content {
    width: 100%;
    height: 100%;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border: 2px solid #e5e7eb;
  }
  
  @keyframes match-animation {
    0% {
      transform: scale(1);
      opacity: 0;
    }
    50% {
      transform: scale(1.5);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
  
  .match-animation {
    animation: match-animation 1.5s ease-out forwards;
  }
  
  @keyframes bounce-once {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .animate-bounce-once {
    animation: bounce-once 0.5s ease-in-out;
  }
  
  @keyframes distribute-cards {
    0% {
      transform: translateY(0) rotate(0);
      opacity: 1;
    }
    100% {
      transform: translateY(100px) rotate(var(--rotate-deg));
      opacity: 0;
    }
  }
  
  .animate-distribute {
    animation: distribute-cards 1s ease-out forwards;
    animation-fill-mode: both;
  }
  
  @keyframes turn-flash {
    0% {
      box-shadow: 0 0 0 rgba(59, 130, 246, 0);
    }
    50% {
      box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
    }
    100% {
      box-shadow: 0 0 0 rgba(59, 130, 246, 0);
    }
  }
  
  .turn-flash {
    animation: turn-flash 1s ease-out;
  }
  
  @keyframes card-collect {
    0% {
      transform: translate(0, 0) rotate(0deg) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(var(--collect-x), var(--collect-y)) rotate(360deg) scale(0.2);
      opacity: 0;
    }
  }
  
  .card-collect {
    animation: card-collect 1s ease-out forwards;
    position: absolute;
  }
  
  .match-highlight {
    animation: pulse 0.8s ease-out infinite;
    box-shadow: 0 0 15px 5px rgba(59, 130, 246, 0.7);
  }
  
  @keyframes pulse {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
`;

interface GameBoardProps {
  userId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  // Move state declarations inside the component
  const [isPlayingCard, setIsPlayingCard] = useState(false);
  const [cardInMotion, setCardInMotion] = useState<Card | null>(null);
  const [cardStartPosition, setCardStartPosition] = useState({ x: 0, y: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionComplete, setDistributionComplete] = useState(false);
  const [gameTimer, setGameTimer] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [syncRate, setSyncRate] = useState(3000);
  const [lastPlayedCard, setLastPlayedCard] = useState<Card | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastMatchPlayer, setLastMatchPlayer] = useState<string | null>(null);
  const [matchedCards, setMatchedCards] = useState<Card[]>([]);
  const [showCardCollection, setShowCardCollection] = useState(false);

  const { 
    gameState, 
    currentRoom,
    playCard, 
    shuffleDeck, 
    joinRoom, 
    startGame, 
    kickInactivePlayer, 
    endGame, 
    canStartGame: canStart,
    socket
  } = useSocket();

  const players = gameState.players;
  const userPlayer = players.find(p => p.userId === userId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  
  // Add debug logging for game state
  console.log('Game state:', {
    currentPlayerIndex: gameState.currentPlayerIndex,
    currentPlayer,
    userPlayer,
    userId,
    gameStarted: gameState.gameStarted,
    players: gameState.players.map(p => ({
      id: p.id,
      userId: p.userId,
      username: p.username,
      cards: p.cards?.length || 0,
      cardDetails: p.cards?.map(c => `${c.value}-${c.suit}`)
    })),
    centralPile: gameState.centralPile?.length || 0,
    centralPileCards: gameState.centralPile?.map(c => `${c.value}-${c.suit}`)
  });
  
  const isUserTurn = gameState.gameStarted && currentPlayer?.id === userPlayer?.id;
  const isHost = gameState.players.length > 0 && gameState.players[0].userId === userId;
  const hasMultiplePlayers = players.length > 1;

  // Log the result of turn check
  console.log('Turn check result:', {
    isUserTurn,
    gameStarted: gameState.gameStarted,
    currentPlayerId: currentPlayer?.id,
    userPlayerId: userPlayer?.id,
    match: currentPlayer?.id === userPlayer?.id
  });

  useEffect(() => {
    if (gameState?.gameStarted && currentPlayer) {
      console.log('Current turn:', {
        currentPlayer: currentPlayer.username,
        isUserTurn,
        userId,
        currentPlayerUserId: currentPlayer.id
      });
    }
  }, [gameState?.currentPlayerIndex, currentPlayer, isUserTurn, userId]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (gameState && !gameState.gameStarted) {
        handleRefreshGameState();
      }
    }, syncRate);
    
    return () => clearInterval(refreshInterval);
  }, [gameState, syncRate]);

  useEffect(() => {
    if (gameState && gameState.players.length > 1) {
      console.log(`Game has ${gameState.players.length} players`);
      const playerNames = gameState.players.map(p => `${p.username} (${p.id})`).join(", ");
      console.log(`Current players: ${playerNames}`);
      setSyncRate(2000);
    }
  }, [gameState?.players.length]);

  useEffect(() => {
    if (gameState?.gameStarted && !distributionComplete) {
      setShowDistribution(true);
      console.log("Showing distribution animation");
      
      // Show distribution animation for 3 seconds
      const timer = setTimeout(() => {
        setShowDistribution(false);
        setDistributionComplete(true);
        console.log("Distribution animation complete");
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStarted, distributionComplete]);

  useEffect(() => {
    if (gameState && !gameState.gameStarted) {
      setDistributionComplete(false);
      setShowDistribution(false);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState?.gameStarted && gameState.gameStartTime && gameState.roomDuration) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - gameState.gameStartTime;
        const remaining = Math.max(0, gameState.roomDuration - elapsed);
        
        setGameTimer(Math.floor(remaining / 1000));
        
        if (remaining <= 0 && gameState && !gameState.isGameOver) {
          clearInterval(interval);
          // When time is up, determine winner based on most cards
          const timeUpWinner = gameState.players.reduce((prev, current) => 
            (prev.cards.length > current.cards.length) ? prev : current
          );
          
          // End the game with the time up winner
          endGame(timeUpWinner.id);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState?.gameStarted, gameState?.gameStartTime, gameState?.roomDuration, endGame]);

  useEffect(() => {
    if (gameState?.gameStarted && gameState.turnEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, gameState.turnEndTime - now);
        
        setTurnTimer(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      // Reset turn timer when not in a turn
      setTurnTimer(null);
    }
  }, [gameState?.gameStarted, gameState?.turnEndTime]);

  // Add effect to handle game over state
  useEffect(() => {
    if (gameState?.isGameOver) {
      // Clear any existing timers
      setGameTimer(null);
      setTurnTimer(null);
    }
  }, [gameState?.isGameOver]);

  useEffect(() => {
    if (gameState?.players) {
      const inactivePlayers = gameState.players.filter(p => p.autoPlayCount >= 2);
      
      if (inactivePlayers.length > 0) {
        inactivePlayers.forEach(player => {
          if (gameState.players[0].id === userId) {
            kickInactivePlayer(player.id);
            
            toast({
              title: "Player removed",
              description: `${player.username} was removed for inactivity`,
              variant: "destructive"
            });
          }
        });
      }
    }
  }, [gameState?.players, kickInactivePlayer, userId]);

  useEffect(() => {
    if (gameState?.matchAnimation?.isActive) {
      console.log("Match animation started, disabling actions");
      setShowMatchAnimation(true);
      setActionsDisabled(true);
      
      const timer = setTimeout(() => {
        console.log("Match animation ended, enabling actions");
        setShowMatchAnimation(false);
        setActionsDisabled(false);
      }, 2000);
      
      return () => {
        console.log("Cleaning up match animation timer");
        clearTimeout(timer);
      };
    } else {
      // If match animation is not active, ensure actions are enabled and match text is hidden
      console.log("No match animation, ensuring actions are enabled and match text is hidden");
      setActionsDisabled(false);
      setShowMatchAnimation(false);
    }
  }, [gameState?.matchAnimation]);

  // Reset match animation state when game state changes
  useEffect(() => {
    if (!gameState?.matchAnimation?.isActive) {
      setShowMatchAnimation(false);
    }
  }, [gameState]);

  // Add this effect to handle dealing card screen duration
  useEffect(() => {
    if (showDistribution) {
      const timer = setTimeout(() => {
        setShowDistribution(false);
      }, 2000); // Show for 2 seconds only
      return () => clearTimeout(timer);
    }
  }, [showDistribution]);

  // Add this effect to prevent game restarts
  useEffect(() => {
    if (gameState?.gameStarted && !gameState.isGameOver) {
      // If game is already started and not over, prevent any restart attempts
      return;
    }
  }, [gameState?.gameStarted, gameState?.isGameOver]);

  useEffect(() => {
    if (gameState) {
      console.log('GameBoard: Current game state:', {
        hasGameState: !!gameState,
        gameStarted: gameState.gameStarted,
        playersCount: gameState.players.length,
        currentPlayerIndex: gameState.currentPlayerIndex,
        centralPile: gameState.centralPile.length
      });
    } else {
      console.log('GameBoard: No game state available');
    }
  }, [gameState]);

  // Add debug logging for turn state
  useEffect(() => {
    if (gameState?.gameStarted) {
      console.log('Turn Debug:', {
        currentPlayerIndex: gameState.currentPlayerIndex,
        currentPlayerId: currentPlayer?.id,
        currentPlayerName: currentPlayer?.username,
        userPlayerId: userId,
        isUserTurn,
        gameStarted: gameState.gameStarted,
        status: gameState.status
      });
    }
  }, [gameState?.currentPlayerIndex, currentPlayer, userId, isUserTurn, gameState?.gameStarted]);

  // Add event listener for turn changes
  useEffect(() => {
    if (!socket) return;

    // Listen for turn changes
    const handleTurnChange = (data: any) => {
      console.log('Turn changed event received:', data);
      // Flash animation for the new current player
      const playerElement = document.querySelector(`.player-deck-${data.currentPlayerIndex}`);
      if (playerElement) {
        playerElement.classList.add('turn-flash');
        setTimeout(() => {
          playerElement.classList.remove('turn-flash');
        }, 1000);
      }
      
      // Disable actions if it's not the user's turn
      if (userPlayer && data.currentPlayerId !== userPlayer.id) {
        setActionsDisabled(true);
      } else {
        // It's the user's turn, enable actions after a short delay
        setTimeout(() => {
          setActionsDisabled(false);
        }, 500);
      }
    };

    socket.on('turn_changed', handleTurnChange);

    return () => {
      socket.off('turn_changed', handleTurnChange);
    };
  }, [socket, userPlayer]);

  // Reset actionsDisabled when game starts
  useEffect(() => {
    if (gameState?.gameStarted) {
      setActionsDisabled(false);
    }
  }, [gameState?.gameStarted]);

  useEffect(() => {
    if (gameState.centralPile.length > 0) {
      const newCard = gameState.centralPile[gameState.centralPile.length - 1];
      if (newCard && (!lastPlayedCard || newCard.id !== lastPlayedCard.id)) {
        setLastPlayedCard(newCard);
        setIsAnimating(true);
        
        // Reset animation after it completes
        setTimeout(() => {
          setIsAnimating(false);
        }, 1000);
      }
    }
  }, [gameState.centralPile]);

  // Add effect listener for card matches
  useEffect(() => {
    if (!socket) return;

    const handleCardMatch = (data: { playerId: string, cards: Card[] }) => {
      console.log('Card match detected:', {
        playerId: data.playerId,
        matchedCards: data.cards.map(c => `${c.value}-${c.suit}`),
        matchCount: data.cards.length,
        isUserMatch: data.playerId === userPlayer?.id
      });
      
      // Play match animation
      setShowMatchAnimation(true);
      setActionsDisabled(true);
      setLastMatchPlayer(data.playerId);
      setMatchedCards(data.cards);
      
      // Show which player got the match
      const matchPlayer = players.find(p => p.id === data.playerId);
      if (matchPlayer) {
        toast({
          title: `Match!`,
          description: `${matchPlayer.username} matched the top card and collected all ${data.cards.length} cards from the pile!`,
          variant: "default"
        });
      }
      
      // Show the match animation first
      setTimeout(() => {
        setShowMatchAnimation(false);
        setShowCardCollection(true);
        
        // After showing the collection animation, hide it
        setTimeout(() => {
          setShowCardCollection(false);
          setActionsDisabled(false);
        }, 1500);
      }, 1500);
    };

    socket.on('card_match', handleCardMatch);
    
    return () => {
      socket.off('card_match', handleCardMatch);
    };
  }, [socket, players, userPlayer]);

  const handleRefreshGameState = async () => {
    if (!gameState) return;

    setIsRefreshing(true);

    const roomId = window.location.pathname.split("/").pop();
    if (roomId) {
      await joinRoom(roomId);
    }

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!gameState) {
    console.log('GameBoard: Rendering loading state');
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#0B0C10] border border-blue-900/20 rounded-lg">
        <div className="text-xl font-semibold text-white mb-4">Loading game...</div>
        <div className="animate-pulse text-blue-300">Please wait while the game loads</div>
      </div>
    );
  }

  // Handle different game states
  const renderGameStateMessage = () => {
    if (!gameState.gameStarted) {
      if (gameState.status === 'waiting') {
        return (
          <div className="w-full mb-4 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-md text-center">
            <p className="text-lg text-yellow-400">
              Waiting for players to join... ({gameState.players.length}/{gameState.requiredPlayers})
            </p>
            <p className="text-sm text-yellow-300 mt-2">
              Share the room code to invite friends!
            </p>
          </div>
        );
      } else if (gameState.status === 'ready') {
        return (
          <div className="w-full mb-4 p-4 bg-green-600/20 border border-green-500/30 rounded-md text-center">
            <p className="text-lg text-green-400">
              All players have joined! Ready to start the game.
            </p>
            {isHost && (
              <Button
                onClick={handleStartGame}
                disabled={actionsDisabled}
                className="mt-2 bg-green-600 hover:bg-green-700 text-white"
              >
                Start Game
              </Button>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const getPlayerPositions = () => {
    const userIndex = players.findIndex(p => p.id === userId);
    if (userIndex === -1) return [];
    
    const reorderedPlayers = [...players.slice(userIndex), ...players.slice(0, userIndex)];
    
    return reorderedPlayers.map((player, index) => {
      const isUser = player.id === userId;
      
      if (isUser) {
        return { player, position: "bottom" as const, isUser: true };
      }
      
      if (players.length === 2) {
        return { player, position: "top" as const, isUser: false };
      }
      
      if (players.length === 3) {
        return { 
          player, 
          position: index === 1 ? "left" as const : "right" as const, 
          isUser: false 
        };
      }
      
      if (players.length === 4) {
        if (index === 1) return { player, position: "left" as const, isUser: false };
        if (index === 2) return { player, position: "top" as const, isUser: false };
        return { player, position: "right" as const, isUser: false };
      }
      
      return { player, position: "top" as const, isUser: false };
    });
  };

  const handleStartGame = () => {
    if (!gameState || gameState.gameStarted || !hasMultiplePlayers || !isHost) {
      console.log('Cannot start game:', {
        hasGameState: !!gameState,
        gameStarted: gameState?.gameStarted,
        hasMultiplePlayers,
        isHost
      });
      return;
    }

    console.log('Starting game...');
    setActionsDisabled(true);
    startGame();
    toast({
      title: "Starting game",
      description: "Initializing game state...",
    });
  };

  const handleShuffleDeck = () => {
    if (!isUserTurn || actionsDisabled || !userPlayer) {
      console.log('Cannot shuffle deck:', {
        isUserTurn,
        actionsDisabled,
        hasUserPlayer: !!userPlayer
      });
      return;
    }
    
    setActionsDisabled(true);
    
    // Shuffle the player's cards locally first for immediate feedback
    const shuffledCards = [...userPlayer.cards];
    for (let i = shuffledCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCards[i], shuffledCards[j]] = [shuffledCards[j], shuffledCards[i]];
    }
    
    // Update local state
    userPlayer.cards = shuffledCards;
    
    // Send shuffle request to server
    shuffleDeck();
    
    // Re-enable actions after a short delay
    setTimeout(() => {
      setActionsDisabled(false);
    }, 1000);
  };

  const handlePlayCard = () => {
    if (!isUserTurn || actionsDisabled || !userPlayer) {
      console.log('Cannot play card:', {
        isUserTurn,
        actionsDisabled,
        hasUserPlayer: !!userPlayer
      });
      return;
    }

    // Get the top card from player's deck
    const cardToPlay = userPlayer.cards[0];
    if (!cardToPlay) {
      console.error('No card to play');
      return;
    }

    console.log('Playing card:', {
      playerId: userPlayer.id,
      card: cardToPlay,
      isUserTurn,
      currentPlayerIndex: gameState.currentPlayerIndex
    });

    // Start the animation sequence
    setIsPlayingCard(true);
    setCardInMotion(cardToPlay);
    setActionsDisabled(true);
    setLastPlayedCard(cardToPlay);

    // Get the starting position of the card (player's deck)
    const playerDeckElement = document.querySelector('.player-deck-bottom');
    const centralPileElement = document.querySelector('.central-pile');
    
    if (playerDeckElement && centralPileElement) {
      const playerRect = playerDeckElement.getBoundingClientRect();
      const pileRect = centralPileElement.getBoundingClientRect();
      
      setCardStartPosition({
        x: playerRect.left + playerRect.width / 2,
        y: playerRect.top + playerRect.height / 2
      });
      
      // Calculate animation to central pile
      const cardElement = document.createElement('div');
      cardElement.className = 'animated-card';
      cardElement.style.left = `${playerRect.left + playerRect.width / 2}px`;
      cardElement.style.top = `${playerRect.top + playerRect.height / 2}px`;
      
      // Create card content
      const cardContent = document.createElement('div');
      cardContent.className = 'card-content';
      cardElement.appendChild(cardContent);
      
      document.body.appendChild(cardElement);
      
      // Animate to central pile
      setTimeout(() => {
        cardElement.style.left = `${pileRect.left + pileRect.width / 2}px`;
        cardElement.style.top = `${pileRect.top + pileRect.height / 2}px`;
        cardElement.style.transform = 'rotate(360deg)';
      }, 50);
      
      // Remove element after animation
      setTimeout(() => {
        document.body.removeChild(cardElement);
      }, 1000);
    }

    // After animation completes, send the card to server
    setTimeout(() => {
      // Remove the card from player's deck locally for immediate feedback
      const updatedCards = [...userPlayer.cards];
      updatedCards.shift(); // Remove first card
      userPlayer.cards = updatedCards;
      
      // Send the card to server
      playCard(userPlayer.id, cardToPlay);
      
      // Reset animation states
      setIsPlayingCard(false);
      setCardInMotion(null);
      
      // Add a slight delay before enabling actions again
      // to ensure server has time to process and update game state
      setTimeout(() => {
        setActionsDisabled(false);
      }, 500);
    }, 1000);
  };

  // Check if there's a potential match
  const checkPotentialMatch = () => {
    if (!gameState.centralPile || gameState.centralPile.length < 1) return null;
    
    // Get the top card of the central pile
    const topCard = gameState.centralPile[gameState.centralPile.length - 1];
    
    // If the user has a card matching the top card value, it's a potential match
    const matchingCardInHand = userPlayer?.cards.some(card => card.value === topCard.value);
    
    if (matchingCardInHand) {
      return {
        topCardValue: topCard.value,
        hasMatchingCard: true
      };
    }
    
    return null;
  };

  // Render match potential info
  const renderMatchInfo = () => {
    const potentialMatch = checkPotentialMatch();
    
    if (!potentialMatch) return null;
    
    return (
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-500/80 text-black px-3 py-1 text-xs rounded-full font-medium z-20 whitespace-nowrap">
        You have a <strong>{potentialMatch.topCardValue}</strong> to match the top card!
      </div>
    );
  };

  // Update the match animation UI in the central pile area
  const renderMatchAnimation = () => {
    if (!showMatchAnimation) return null;
    
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-green-500/90 text-white px-8 py-4 rounded-lg text-3xl font-bold animate-bounce match-animation">
          MATCH! COLLECT ALL!
        </div>
      </div>
    );
  };

  const renderCardCollection = () => {
    if (!showCardCollection || !lastMatchPlayer) return null;
    
    // Find target player deck position
    const targetPlayerPosition = positionedPlayers.find(p => p.player.id === lastMatchPlayer)?.position || 'bottom';
    
    let targetX = 0, targetY = 0;
    
    // Set target coordinates based on player position
    switch(targetPlayerPosition) {
      case 'top': 
        targetX = 0; 
        targetY = -200;
        break;
      case 'bottom': 
        targetX = 0; 
        targetY = 200;
        break;
      case 'left': 
        targetX = -200; 
        targetY = 0;
        break;
      case 'right': 
        targetX = 200; 
        targetY = 0;
        break;
    }
    
    // Show collecting all cards animation with fanning effect
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {matchedCards.map((card, index) => {
          // Calculate spread for fanning effect
          const spreadX = (index % 5) * 10 - 20;
          const spreadY = Math.floor(index / 5) * 10 - 10;
          const rotation = (index * 7) % 30 - 15;
          
          return (
            <div 
              key={card.id}
              className="card-collect"
              style={{
                '--collect-x': `${targetX}px`,
                '--collect-y': `${targetY}px`,
                top: `calc(50% + ${spreadY}px)`,
                left: `calc(50% + ${spreadX}px)`,
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                animationDelay: `${index * 0.05}s`,
                zIndex: 1000 + index
              } as React.CSSProperties}
            >
              <PlayingCard card={card} />
            </div>
          );
        })}
      </div>
    );
  };

  if (gameState.isGameOver) {
    const winner = gameState.winner;
    const isUserWinner = winner?.id === userId;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-[#0B0C10] p-8 rounded-lg max-w-md w-full mx-4">
          <h2 className="text-3xl font-bold text-center text-blue-300 mb-4">
            Game Over!
          </h2>
          <div className="text-xl text-center text-white mb-6">
            {isUserWinner ? (
              <span className="text-green-400">Congratulations! You won! 🎉</span>
            ) : (
              <span className="text-yellow-400">{winner?.username} won the game!</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg ${
                  player.id === winner?.id
                    ? "bg-green-500/20 border-2 border-green-500"
                    : "bg-gray-800/50"
                }`}
              >
                <div className="text-lg font-semibold text-white">
                  {player.username}
                </div>
                <div className="text-sm text-gray-300">
                  Cards: {player.cards.length}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <Button
              onClick={() => window.location.href = "/lobby"}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2"
            >
              Return to Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const positionedPlayers = getPlayerPositions();

  // Debug logging for Hit button conditions
  console.log('Hit button conditions:', {
    gameStarted: gameState.gameStarted,
    hasUserPlayer: !!userPlayer,
    isUserTurn,
    actionsDisabled,
    currentPlayerId: currentPlayer?.id,
    userPlayerId: userPlayer?.id
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-[#1F2937] p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-300">
              Players: {players.length}/{gameState.requiredPlayers}
            </div>
            {gameTimer !== null && (
              <div className="text-sm text-gray-300">
                Time: {formatTime(gameTimer)}
              </div>
            )}
          </div>
          
          {/* Player deck counts scoreboard */}
          {gameState.gameStarted && (
            <div className="flex items-center space-x-4">
              <div className="text-sm font-semibold text-white">
                Card Counts:
              </div>
              <div className="flex space-x-2">
                {players.map((player) => (
                  <div 
                    key={player.id} 
                    className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                      currentPlayer?.id === player.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    <span className="font-medium">{player.username}:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-1 ${
                        player.cards.length > 10 
                          ? 'bg-green-900/50 text-green-300 border-green-500/30' 
                          : player.cards.length > 5 
                            ? 'bg-blue-900/50 text-blue-300 border-blue-500/30'
                            : 'bg-red-900/50 text-red-300 border-red-500/30'
                      }`}
                    >
                      {player.cards.length}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {renderGameStateMessage()}

        <div className="relative bg-[#0B0C10] border border-blue-900/20 rounded-lg p-4">
          <div className="flex justify-between items-center px-4 py-2">
            <h1 className="text-2xl font-bold text-yellow-400">Patte pe Patta</h1>
            
            {gameState.gameStarted && gameTimer !== null && (
              <div className="bg-transparent border border-yellow-500 rounded-full px-4 py-1">
                <span className="text-xl font-mono text-yellow-400">{formatTime(gameTimer)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center mb-4">
            {positionedPlayers
              .filter(p => p.position === "top")
              .map(({ player, position, isUser }) => (
                <PlayerDeck
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer?.id}
                  isUser={isUser}
                  position={position}
                  turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                  className={`player-deck-${position}`}
                />
              ))}
          </div>

          <div className="relative flex justify-center items-stretch mb-4">
            <div className="w-1/5 flex items-center">
              {positionedPlayers
                .filter(p => p.position === "left")
                .map(({ player, position, isUser }) => (
                  <PlayerDeck
                    key={player.id}
                    player={player}
                    isCurrentPlayer={player.id === currentPlayer?.id}
                    isUser={isUser}
                    position={position}
                    turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                    className={`player-deck-${position}`}
                  />
                ))}
            </div>
            
            <div className="w-3/5 flex flex-col justify-center items-center">
              <div className="bg-game-card p-4 relative border-2 border-[#4169E1] rounded-lg min-h-[240px] w-full flex flex-col justify-center items-center">
                <div className="flex justify-center items-center">
                  <div className="relative w-24 h-36 central-pile">
                    {cardInMotion && (
                      <div 
                        className="card-in-motion"
                        style={{
                          position: 'fixed',
                          left: `${cardStartPosition.x}px`,
                          top: `${cardStartPosition.y}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <PlayingCard 
                          card={cardInMotion}
                          className="animate-card-play"
                        />
                      </div>
                    )}
                    
                    {gameState.centralPile && gameState.centralPile.length > 0 ? (
                      // Display last 3 cards stacked if there are enough cards
                      <div className="relative">
                        {gameState.centralPile.length > 2 && (
                          <div className="absolute" style={{ transform: 'rotate(-5deg) translateX(-5px)', zIndex: 1 }}>
                            <PlayingCard 
                              card={gameState.centralPile[gameState.centralPile.length - 3]} 
                              className="opacity-60"
                            />
                          </div>
                        )}
                        {gameState.centralPile.length > 1 && (
                          <div className="absolute" style={{ transform: 'rotate(3deg) translateX(3px)', zIndex: 2 }}>
                            <PlayingCard 
                              card={gameState.centralPile[gameState.centralPile.length - 2]} 
                              className="opacity-80"
                            />
                          </div>
                        )}
                        <div 
                          className={`absolute ${lastPlayedCard && lastPlayedCard.id === gameState.centralPile[gameState.centralPile.length - 1].id ? 'animate-bounce-once' : ''}`}
                          style={{ transform: 'rotate(0deg)', zIndex: 3 }}
                        >
                          <PlayingCard 
                            card={gameState.centralPile[gameState.centralPile.length - 1]} 
                          />
                        </div>
                        
                        {/* Card count badge */}
                        {gameState.centralPile.length > 0 && (
                          <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-800 z-10">
                            {gameState.centralPile.length}
                          </div>
                        )}
                        
                        {/* Display match info */}
                        {renderMatchInfo()}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-400 text-sm italic">Empty Pile</div>
                      </div>
                    )}
                  </div>
                  
                  {renderMatchAnimation()}
                  {renderCardCollection()}
                </div>
                
                <div className="mt-3 mb-1 text-center">
                  <Badge variant="outline" className="bg-gray-800/50 text-blue-300 text-xs border-blue-500/30">
                    Central Pile: {gameState.centralPile.length} cards
                  </Badge>
                </div>
                
                <div className="mt-2 w-full">
                  <div className="flex items-center justify-center gap-2 text-center">
                    <Timer className="h-4 w-4 text-blue-300" />
                    <div className="text-white text-sm">
                      {isUserTurn ? (
                        <span className="text-blue-300 font-bold">
                          Your Turn! {turnTimer !== null ? formatTime(Math.floor(turnTimer / 1000)) : '00:00'}
                        </span>
                      ) : (
                        <span className="text-gray-300">
                          {currentPlayer?.username}'s turn - {turnTimer !== null ? formatTime(Math.floor(turnTimer / 1000)) : '00:00'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded overflow-hidden mt-1">
                    <div 
                      className={`h-full ${turnTimer !== null && turnTimer < 5000 ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{
                        width: `${turnTimer !== null ? Math.min(100, (turnTimer / 15000) * 100) : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                {userPlayer && userPlayer.autoPlayCount > 0 && gameState.gameStarted && (
                  <div className="mt-2">
                    <div className="flex items-center justify-center gap-1 text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">
                        Auto-play count: {userPlayer.autoPlayCount}/2
                        {userPlayer.autoPlayCount === 1 && " - One more will kick you!"}
                      </span>
                    </div>
                  </div>
                )}
                
                {gameState.gameStarted && userPlayer && (
                  <div className="mt-2 flex justify-center space-x-4">
                    <Button
                      onClick={handlePlayCard}
                      disabled={!isUserTurn || actionsDisabled}
                      className={`${
                        isUserTurn && !actionsDisabled
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600'
                      } text-white transition-colors duration-200`}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isUserTurn 
                        ? "Your Turn - Hit!" 
                        : `Wait for ${currentPlayer?.username}'s turn`}
                    </Button>
                    
                    <Button
                      onClick={handleShuffleDeck}
                      disabled={!isUserTurn || actionsDisabled}
                      className={`${
                        isUserTurn && !actionsDisabled
                          ? 'bg-[#4169E1] hover:bg-[#3158c4]'
                          : 'bg-gray-600'
                      } text-white`}
                    >
                      <Shuffle className="h-5 w-5 mr-1" /> 
                      Shuffle
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="w-1/5 flex items-center justify-end">
              {positionedPlayers
                .filter(p => p.position === "right")
                .map(({ player, position, isUser }) => (
                  <PlayerDeck
                    key={player.id}
                    player={player}
                    isCurrentPlayer={player.id === currentPlayer?.id}
                    isUser={isUser}
                    position={position}
                    turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                    className={`player-deck-${position}`}
                  />
                ))}
            </div>
          </div>

          <div className="flex justify-center">
            {positionedPlayers
              .filter(p => p.position === "bottom")
              .map(({ player, position, isUser }) => (
                <PlayerDeck
                  key={player.id}
                  player={player}
                  isCurrentPlayer={player.id === currentPlayer?.id}
                  isUser={isUser}
                  position={position}
                  turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                  className={`player-deck-${position}`}
                />
              ))}
          </div>

          {showDistribution && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
              <div className="text-center">
                <div className="relative h-48 w-48 mb-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 left-0 animate-card-distribute"
                      style={{
                        animationDelay: `${i * 0.15}s`,
                        transform: `translateY(-100px) rotate(${(i - 4) * 5}deg)`,
                      }}
                    >
                      <PlayingCard isBack={true} />
                    </div>
                  ))}
                </div>
                <div className="text-xl font-bold text-blue-300 animate-pulse">
                  Dealing cards...
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-2 right-4 flex items-center">
          <Badge variant={hasMultiplePlayers ? "default" : "outline"} className={
            hasMultiplePlayers 
            ? "bg-green-600 text-white" 
            : "border-yellow-500 text-yellow-400"
          }>
            <Users className="h-3 w-3 mr-1" />
            {players.length} Player{players.length !== 1 ? 's' : ''}
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshGameState}
            disabled={isRefreshing}
            className="ml-2 text-blue-300 hover:text-blue-200"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <style>{styles}</style>
    </>
  );
};

export default GameBoard;
