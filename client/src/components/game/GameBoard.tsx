import React, { useEffect, useState } from "react";
import { useSocket, GameState, Card } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users, RefreshCw, Play, Clock, AlertTriangle, Timer, UserCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';

// Add these animation styles
const styles = `
  @keyframes card-play {
    0% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 1;
    }
    50% {
      transform: translate(0, -100px) scale(1.2) rotate(180deg);
      opacity: 1;
    }
    100% {
      transform: translate(0, 0) scale(1) rotate(360deg);
      opacity: 0.8;
    }
  }
  
  .card-in-motion {
    position: absolute;
    z-index: 10000;
    transform-origin: center;
    pointer-events: none;
    transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    user-select: none;
  }
  
  .animate-card-play {
    animation: card-play 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
  
  /* Enhanced animation for card appearing in pool */
  @keyframes card-appear {
    0% {
      transform: scale(0.5) rotate(-10deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(5deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(0);
      opacity: 1;
    }
  }
  
  .card-appear {
    animation: card-appear 0.5s ease-out forwards;
  }
  
  .center-pool {
    position: relative;
    transition: transform 0.3s ease;
  }
  
  .center-pool:hover {
    transform: scale(1.05);
  }
  
  .animated-card {
    position: fixed;
    width: 64px;
    height: 96px;
    z-index: 1000;
    transform: translate(-50%, -50%);
    transform-origin: center;
  }
  
  .card-content {
    width: 100%;
    height: 100%;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border: 2px solid #e5e7eb;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    user-select: none;
  }

  .card-value-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: Arial, sans-serif;
    user-select: none;
  }

  .card-value-display .value {
    font-size: 24px;
    font-weight: bold;
    line-height: 1;
  }

  .card-value-display .suit {
    font-size: 28px;
    line-height: 1;
    margin-top: 2px;
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
      transform: translate(-50%, -50%) scale(1) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translate(var(--collect-x), var(--collect-y)) scale(0.2) rotate(360deg);
      opacity: 0;
    }
  }
  
  .card-collect {
    position: fixed;
    animation: card-collect 1s ease-out forwards;
    pointer-events: none;
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

  .player-container {
    background-color: #e2e2e2;
    border-radius: 50%;
    padding: 10px;
    width: 160px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    border: 2px solid #4169E1;
    position: relative;
    z-index: 10;
    transform: scale(0.85);
    margin: 10px;
    user-select: none;
  }

  /* Timer progress circle styles */
  .timer-progress {
    position: absolute;
    top: -10px;
    left: -10px;
    width: calc(100% + 20px);
    height: calc(100% + 20px);
    transform: rotate(-90deg);
  }

  .timer-progress circle {
    fill: none;
    stroke-width: 8;
    stroke-linecap: round;
  }

  .timer-progress .progress-bg {
    stroke: rgba(59, 130, 246, 0.2);
  }

  .timer-progress .progress-bar {
    stroke: #22c55e;
    transition: stroke-dashoffset 0.1s linear, stroke 0.1s linear;
  }

  .timer-progress .progress-bar.warning {
    stroke: #ef4444;
  }

  /* Left and right player containers specific styles */
  .left-player .player-container,
  .right-player .player-container {
    transform: scale(0.7);
    width: 140px;
    height: 140px;
  }

  .empty-player-slot {
    background-color: rgba(100, 100, 100, 0.15);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    padding: 10px;
    width: 160px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
    opacity: 0.5;
    margin: 10px;
    transform: scale(0.85);
  }

  /* Left and right empty slots specific styles */
  .left-player .empty-player-slot,
  .right-player .empty-player-slot {
    transform: scale(0.7);
    width: 140px;
    height: 140px;
  }

  .player-name {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 4px;
    text-align: center;
    color: #000;
  }

  .game-board {
    position: relative;
    display: grid;
    grid-template-areas:
      ". top-player ."
      "left-player center right-player"
      ". bottom-player .";
    grid-template-columns: 1fr 2fr 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px;
    width: 100%;
    height: 100%;
    min-height: 500px;
  }

  /* Compact game board when pool is empty */
  .game-board-empty-pool {
    grid-template-rows: auto auto auto;
    gap: 5px;
    min-height: 400px;
  }

  .top-player { grid-area: top-player; }
  .left-player { grid-area: left-player; }
  .right-player { grid-area: right-player; }
  .bottom-player { grid-area: bottom-player; }
  .center-area { grid-area: center; }

  /* Center area when empty */
  .center-empty-pool {
    background-color: #004080;
    border-radius: 6px;
    padding: 20px;
    width: 100%;
    min-height: 300px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(100, 149, 237, 0.5);
  }

  .center-empty-pool .text-gray-300 {
    font-size: 24px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  .center-empty-pool .text-white {
    font-size: 14px;
    opacity: 0.7;
  }

  // Add a new animation keyframe for card traveling to pool
  @keyframes card-travel {
    0% {
      transform: scale(1) rotate(0deg);
      box-shadow: 0 0 0 rgba(0, 0, 0, 0);
    }
    40% {
      transform: scale(1.2) rotate(180deg) translateY(-80px);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.7);
    }
    100% {
      transform: scale(1) rotate(360deg);
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
    }
  }
  
  .card-travel {
    animation: card-travel 1s ease-out forwards;
    position: fixed;
    z-index: 1000;
    width: 80px;
    height: 120px;
    pointer-events: none;
  }

  /* Remove any specific positioning styles for left and right players */
  .left-player, .right-player {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Update top-left and top-right positioning */
  .top-left-player, .top-right-player {
    position: absolute;
    top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .top-left-player {
    left: 20px;
  }

  .top-right-player {
    right: 20px;
  }

  .hit-button, .shuffle-button {
    user-select: none;
  }
`;

interface GameBoardProps {
  userId: string;
}

const MAX_TURN_TIME = 15000; // 15 seconds in milliseconds

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const navigate = useNavigate();
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
  const [matchingCards, setMatchingCards] = useState<Card[]>([]);
  const [showMatchingCards, setShowMatchingCards] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false); // Debug mode enabled by default

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
    centerPool: gameState.centralPile?.length || 0,
    centerPoolCards: gameState.centralPile?.map(c => `${c.value}-${c.suit}`)
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
          // Auto play a card if it's the current player's turn
          if (currentPlayer && currentPlayer.id === userPlayer?.id) {
            // Get the first card from the player's hand
            const cardToPlay = userPlayer.cards[0];
            if (cardToPlay) {
              playCard(userPlayer.id, cardToPlay);
            }
          }
        }
      }, 50); // Update every 50ms instead of 1000ms for smoother updates
      
      return () => clearInterval(interval);
    } else {
      // Reset turn timer when not in a turn
      setTurnTimer(null);
    }
  }, [gameState?.gameStarted, gameState?.turnEndTime, currentPlayer, userPlayer, playCard]);

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
              variant: "destructive",
              duration: 3000,
              className: "top-0"
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
        centerPool: gameState.centralPile.length
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
        // It's the user's turn, enable actions immediately
        setActionsDisabled(false);
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

  // Update the handleCardMatch function
  useEffect(() => {
    if (!socket) return;

    const handleCardMatch = (data: { playerId: string, cards: Card[] }) => {
      // Find the matching cards (the last card played and its match)
      const matchedCard = data.cards[data.cards.length - 1];
      const matchingCard = data.cards.find(card => 
        card.id !== matchedCard.id && card.value === matchedCard.value
      );
      
      // First show matching cards
      setMatchingCards([matchedCard, matchingCard].filter(Boolean));
      setShowMatchingCards(true);
      setActionsDisabled(true);
      
      // Save the matched cards data
      setMatchedCards(data.cards);
      setLastMatchPlayer(data.playerId);
      
      // Show matching cards for 1 second
      setTimeout(() => {
        setShowMatchingCards(false);
        setShowMatchAnimation(true);
        
        // Toast notification
        const matchPlayer = players.find(p => p.id === data.playerId);
        if (matchPlayer) {
          toast({
            title: `Match!`,
            description: `${matchPlayer.username} matched ${matchedCard.value} of ${matchedCard.suit} with ${matchingCard?.value} of ${matchingCard?.suit}!`,
            variant: "default",
            duration: 3000,
            className: "top-0"
          });
        }
        
        // Show match animation for 0.8 seconds
        setTimeout(() => {
          setShowMatchAnimation(false);
          setShowCardCollection(true);
          
          // Show card collection for 1.5 seconds
          setTimeout(() => {
            setShowCardCollection(false);
            setActionsDisabled(false);
            setMatchingCards([]);
          }, 1500);
        }, 800);
      }, 1000);
    };

    socket.on('card_match', handleCardMatch);
    
    return () => {
      socket.off('card_match', handleCardMatch);
    };
  }, [socket, players, userPlayer]);

  // Also add an effect to reset match animation state when the game state changes
  useEffect(() => {
    // If there's no active match animation from the server, make sure we don't show any
    if (!gameState?.matchAnimation?.isActive) {
      setShowMatchAnimation(false);
      setShowCardCollection(false);
    }
  }, [gameState?.matchAnimation?.isActive]);

  // Update useEffect that handles game state changes
  useEffect(() => {
    if (gameState) {
      // Reset animation states when game state changes
      if (!gameState.matchAnimation?.isActive) {
        // Only reset if we're not in the middle of showing a match animation
        if (!showCardCollection) {
          setShowMatchAnimation(false);
          setLastMatchPlayer(null);
          setMatchedCards([]);
        }
      }
      
      console.log('Match animation state:', {
        serverMatchActive: gameState.matchAnimation?.isActive,
        clientShowMatchAnimation: showMatchAnimation,
        clientShowCardCollection: showCardCollection,
        lastMatchPlayer
      });
    }
  }, [gameState, showCardCollection]);

  // Add this effect to handle room updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdate = (updatedRoom: any) => {
      console.log('Room updated:', {
        players: updatedRoom.players.length,
        required: updatedRoom.requiredPlayers,
        status: updatedRoom.status
      });

      if (updatedRoom.players.length >= updatedRoom.requiredPlayers && isHost) {
        console.log('Room is full from room update, triggering auto-start');
        startGame();
      }
    };

    socket.on('room:update', handleRoomUpdate);
    
    return () => {
      socket.off('room:update', handleRoomUpdate);
    };
  }, [socket, isHost, startGame]);

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
      const playersNeeded = gameState.requiredPlayers - gameState.players.length;
      
      if (gameState.players.length >= gameState.requiredPlayers) {
        return (
          <div className="w-full mb-4 p-4 bg-green-600/20 border border-green-500/30 rounded-md text-center">
            <p className="text-lg text-green-400 animate-pulse">
              All players have joined! Game starting automatically...
            </p>
          </div>
        );
      } else {
        return (
          <div className="w-full mb-4 p-4 bg-yellow-600/20 border border-yellow-500/30 rounded-md text-center">
            <p className="text-lg text-yellow-400">
              Waiting for {playersNeeded} more player{playersNeeded !== 1 ? 's' : ''} to join...
            </p>
            <p className="text-sm text-yellow-300 mt-2">
              ({gameState.players.length}/{gameState.requiredPlayers} players)
            </p>
          </div>
        );
      }
    }
    return null;
        })}
      </div>
    );
  };

  // Update the matching cards display component
  const renderMatchingCards = () => {
    if (!showMatchingCards || matchingCards.length < 2) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-game-card p-8 rounded-lg border-2 border-blue-500">
          <h3 className="text-center text-xl font-bold text-blue-300 mb-4">Matching Cards!</h3>
          <div className="flex gap-4 justify-center">
            {matchingCards.map((card, index) => (
              <div key={card.id} className={`transform ${index === 0 ? '-rotate-12' : 'rotate-12'}`}>
                <PlayingCard card={card} className="scale-150" />
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-white">
            <span className="text-sm">Both cards are {matchingCards[0].value}s!</span>
          </div>
        </div>
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
              onClick={() => {
                // Clean up any game state
                if (socket) {
                  socket.emit('leave_room', currentRoom?.id);
                }
                // Navigate to lobby using React Router
                navigate('/lobby');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2"
            >
              Return to Lobby
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-[#1F2937] p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-blue-400" />
              <span className="text-white font-medium">
                {userPlayer?.username || "Loading..."}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-600" />
            <div className="text-sm text-gray-300">
              Players: {players.length}/{gameState.requiredPlayers}
            </div>
            {gameTimer !== null && (
              <div className="text-sm text-gray-300">
                Time: {formatTime(gameTimer)}
              </div>
            )}
            {/* <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
            >
              {showDebugInfo ? "Hide Debug" : "Show Debug"}
            </button> */}
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

        {/* Debug info panel */}
        {showDebugInfo && (
          <div className="bg-black/80 p-3 rounded border border-blue-500 mb-4">
            <h3 className="text-white text-lg mb-2">Debug Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-blue-300 font-medium">Players ({players.length}):</h4>
                <ul className="text-white text-sm">
                  {players.map((player, idx) => (
                    <li key={player.id} className="mb-1">
                      Player {idx+1}: {player.username} 
                      {player.id === userId ? " (YOU)" : ""} - 
                      Cards: {player.cards.length}, 
                      isHost: {player.isHost.toString()}, 
                      isReady: {player.isReady.toString()}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-blue-300 font-medium">Game State:</h4>
                <ul className="text-white text-sm">
                  <li>Game Started: {gameState.gameStarted.toString()}</li>
                  <li>Current Player: {currentPlayer?.username || "None"}</li>
                  <li>Is Your Turn: {isUserTurn.toString()}</li>
                  <li>Central Pile Cards: {gameState.centralPile?.length || 0}</li>
                  <li>Status: {gameState.status}</li>
                </ul>
                
                <h4 className="text-blue-300 font-medium mt-3">Positioned Players:</h4>
                <ul className="text-white text-sm">
                  {positionedPlayers.map(({player, position}, idx) => (
                    <li key={player.id}>
                      {position}: {player.username} {player.id === userId ? " (YOU)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {renderGameStateMessage()}

        <div className={`relative bg-[#0B0C10] border border-blue-900/20 rounded-lg p-4`}>
          <div className={`game-board ${!gameState.centralPile || gameState.centralPile.length === 0 ? 'game-board-empty-pool' : ''}`}>
            {/* Top player */}
            <div className="top-player flex justify-center">
        {positionedPlayers
          .filter(p => p.position === "top")
          .map(({ player, position, isUser }) => (
                  <div key={player.id} className="player-container">
                    {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                      <svg className="timer-progress" viewBox="0 0 170 170">
                        <circle
                          className="progress-bg"
                          cx="85"
                          cy="85"
                          r="75"
                        />
                        <circle
                          className={`progress-bar ${turnTimer <= 5000 ? 'warning' : ''}`}
                          cx="85"
                          cy="85"
                          r="75"
                          strokeDasharray={`${2 * Math.PI * 75}`}
                          strokeDashoffset={2 * Math.PI * 75 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
                        />
                      </svg>
                    )}
            <PlayerDeck
              player={player}
              isCurrentPlayer={player.id === currentPlayer?.id}
              isUser={isUser}
              position={position}
              turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                      className={`player-deck-${position}`}
            />
                  </div>
          ))}
      </div>

            {/* Top Left player */}
            <div className="top-left-player">
          {positionedPlayers
                .filter(p => p.position === "top-left")
            .map(({ player, position, isUser }) => (
                  <div key={player.id} className="player-container">
                    {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                      <svg className="timer-progress" viewBox="0 0 170 170">
                        <circle
                          className="progress-bg"
                          cx="85"
                          cy="85"
                          r="75"
                        />
                        <circle
                          className={`progress-bar ${turnTimer <= 5000 ? 'warning' : ''}`}
                          cx="85"
                          cy="85"
                          r="75"
                          strokeDasharray={`${2 * Math.PI * 75}`}
                          strokeDashoffset={2 * Math.PI * 75 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
                        />
                      </svg>
                    )}
              <PlayerDeck
                player={player}
                isCurrentPlayer={player.id === currentPlayer?.id}
                isUser={isUser}
                position={position}
                turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                      className={`player-deck-${position}`}
              />
                  </div>
            ))}
        </div>
        
            {/* Top Right player */}
            <div className="top-right-player">
              {positionedPlayers
                .filter(p => p.position === "top-right")
                .map(({ player, position, isUser }) => (
                  <div key={player.id} className="player-container">
                    {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                      <svg className="timer-progress" viewBox="0 0 170 170">
                        <circle
                          className="progress-bg"
                          cx="85"
                          cy="85"
                          r="75"
                        />
                        <circle
                          className={`progress-bar ${turnTimer <= 5000 ? 'warning' : ''}`}
                          cx="85"
                          cy="85"
                          r="75"
                          strokeDasharray={`${2 * Math.PI * 75}`}
                          strokeDashoffset={2 * Math.PI * 75 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
                        />
                      </svg>
                    )}
                    <PlayerDeck
                      player={player}
                      isCurrentPlayer={player.id === currentPlayer?.id}
                      isUser={isUser}
                      position={position}
                      turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                      className={`player-deck-${position}`}
                    />
                  </div>
                ))}
                </div>
            
            {/* Left player */}
            <div className="left-player flex items-center justify-end">
              {positionedPlayers
                .filter(p => p.position === "left")
                .map(({ player, position, isUser }) => (
                  <div key={player.id} className="player-container">
                    {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                      <svg className="timer-progress" viewBox="0 0 170 170">
                        <circle
                          className="progress-bg"
                          cx="85"
                          cy="85"
                          r="75"
                        />
                        <circle
                          className={`progress-bar ${turnTimer <= 5000 ? 'warning' : ''}`}
                          cx="85"
                          cy="85"
                          r="75"
                          strokeDasharray={`${2 * Math.PI * 75}`}
                          strokeDashoffset={2 * Math.PI * 75 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
                        />
                      </svg>
                    )}
                    <PlayerDeck
                      player={player}
                      isCurrentPlayer={player.id === currentPlayer?.id}
                      isUser={isUser}
                      position={position}
                      turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                      className={`player-deck-${position}`}
                    />
                  </div>
                ))}
            </div>
            
            {/* Center game area */}
            <div className="center-area flex items-center justify-center">
              {gameState.centralPile && gameState.centralPile.length > 0 ? (
                <div className="bg-[#004080] p-4 relative border-2 border-blue-500 rounded-lg w-full h-full flex flex-col min-h-[300px]">
                  <div className="flex-1 flex flex-col justify-center items-center">
                    <div className="relative">
                      <PlayingCard 
                        card={gameState.centralPile[gameState.centralPile.length - 1]} 
                      />
                      
                      <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-800 z-10">
                        {gameState.centralPile.length}
                </div>
              </div>
          </div>
          
                  <div className="mt-3 mb-1 text-center">
                    <div className="bg-blue-900/50 p-2 rounded text-white">
                      Top Card: {gameState.centralPile[gameState.centralPile.length - 1].value} of {gameState.centralPile[gameState.centralPile.length - 1].suit}
              </div>
                    {lastPlayedCard && currentPlayer && (
                      <div className="mt-1 text-gray-300 text-sm">
                        Played by: {currentPlayer.username}
            </div>
                    )}
            </div>
          </div>
              ) : (
                <div className="center-empty-pool">
                  {cardInMotion ? (
                    <div className="card-appear">
                      <PlayingCard card={cardInMotion} />
              </div>
                  ) : (
                    <>
                      <div className="text-gray-300 text-lg italic mb-4">Empty Pool</div>
                      <div className="text-white text-xs">No cards in pool</div>
                    </>
                  )}
            </div>
          )}
        </div>
        
            {/* Right player */}
            <div className="right-player flex items-center justify-start">
          {positionedPlayers
            .filter(p => p.position === "right")
            .map(({ player, position, isUser }) => (
                  <div key={player.id} className="player-container">
                    {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                      <svg className="timer-progress" viewBox="0 0 170 170">
                        <circle
                          className="progress-bg"
                          cx="85"
                          cy="85"
                          r="75"
                        />
                        <circle
                          className={`progress-bar ${turnTimer <= 5000 ? 'warning' : ''}`}
                          cx="85"
                          cy="85"
                          r="75"
                          strokeDasharray={`${2 * Math.PI * 75}`}
                          strokeDashoffset={2 * Math.PI * 75 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
                        />
                      </svg>
                    )}
              <PlayerDeck
                player={player}
                isCurrentPlayer={player.id === currentPlayer?.id}
                isUser={isUser}
                position={position}
                turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                      className={`player-deck-${position}`}
              />
                  </div>
            ))}
      </div>

            {/* Bottom player (you) */}
            <div className="bottom-player flex justify-center">
        {positionedPlayers
          .filter(p => p.position === "bottom")
          .map(({ player, position, isUser }) => (
                  <div key={player.id} className="player-container">
                    {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                      <svg className="timer-progress" viewBox="0 0 170 170">
                        <circle
                          className="progress-bg"
                          cx="85"
                          cy="85"
                          r="75"
                        />
                        <circle
                          className={`progress-bar ${turnTimer <= 5000 ? 'warning' : ''}`}
                          cx="85"
                          cy="85"
                          r="75"
                          strokeDasharray={`${2 * Math.PI * 75}`}
                          strokeDashoffset={2 * Math.PI * 75 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
                        />
                      </svg>
                    )}
            <PlayerDeck
              player={player}
              isCurrentPlayer={player.id === currentPlayer?.id}
              isUser={isUser}
              position={position}
              turnTimeRemaining={player.id === currentPlayer?.id ? turnTimer : undefined}
                      className={`player-deck-${position}`}
                    />
                    
                    {gameState.gameStarted && userPlayer && (
                      <div className="mt-4 flex justify-center space-x-4">
          <Button 
                          onClick={handlePlayCard}
                          disabled={!isUserTurn || actionsDisabled}
                          className={`hit-button ${
                            isUserTurn && !actionsDisabled
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600'
                          } text-white transition-colors duration-200`}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Your Turn - Hit!
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
                ))}
            </div>
          </div>
        </div>
      </div>

      {renderMatchingCards()}
      {renderMatchAnimation()}
      {renderCardCollection()}
      <style>{styles}</style>
    </>
  );
};

export default GameBoard;
