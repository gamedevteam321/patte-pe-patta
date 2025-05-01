import React, { useEffect, useState } from "react";
import { useSocket, GameState, Card, Player } from "@/context/SocketContext";
import { RoomType } from "@/types/game";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users, RefreshCw, Play, Clock, AlertTriangle, Timer, UserCircle, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import GameOverPanel from './GameOverPanel';
import { useBalance } from "@/context/BalanceContext";

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
    background-image: url('/cardback.png');
    background-size: cover;
    background-position: center;
  }

  .card-content.opponent-card {
    background-image: url('/cardback.png');
    background-size: cover;
    background-position: center;
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
    background-color: transparent;
    border-radius: 50%;
    padding: 10px;
    width: 160px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: none;
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
    top: -15px;
    left: -15px;
    width: calc(100% + 30px);
    height: calc(100% + 30px);
    transform: rotate(-90deg);
    background: transparent;
  }

  .timer-progress circle {
    fill: transparent;
    stroke-width: 10;
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
    min-height: 200px;
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

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const navigate = useNavigate();
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showGameTable, setShowGameTable] = useState(true);
  const [disabledPlayers, setDisabledPlayers] = useState<Set<string>>(new Set());
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [hideTopCard, setHideTopCard] = useState(false);
  const [animatingNewCard, setAnimatingNewCard] = useState<Card | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [previousTopCard, setPreviousTopCard] = useState<Card | null>(null);
  const [animationLocked, setAnimationLocked] = useState(false);
  const [displayedCenterCard, setDisplayedCenterCard] = useState<Card | null>(null);
  // Add state for initial player count
  const [initialPlayerCount, setInitialPlayerCount] = useState<number>(0);
  const [showShufflePurchasePopup, setShowShufflePurchasePopup] = useState(false);
  const [hasPurchasedShuffleThisTurn, setHasPurchasedShuffleThisTurn] = useState(false);

  const MAX_TURN_TIME = isDebugMode ? 2000 : (currentRoom?.config?.turnTime || 15000);; // 1 second in debug mode, 15 seconds in normal mode
  const MAX_SHUFFLE_COUNT = 2;

  

  const players = gameState.players;
  const userPlayer = players.find(p => p.userId === userId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const isUserTurn = gameState.gameStarted && currentPlayer?.id === userPlayer?.id;
  const isHost = gameState.players.length > 0 && gameState.players[0].userId === userId && !gameState.gameStarted;
  const hasMultiplePlayers = players.length > 1;
  //const positionedPlayers = getPlayerPositions();
  const getPlayerPositions = () => {
    // Find the player that matches the current user's ID
    const currentUserPlayer = players.find(p => p.userId === userId);
    if (!currentUserPlayer) {
      // Default fallback positioning if user not found
      return players.map((player, index) => {
        let position: "top" | "top-left" | "top-right" | "left" | "right" | "bottom" = "bottom";

        if (index === 0) position = "bottom";
        else if (index === 1) position = "top";
        else if (index === 2) position = "right";
        else if (index === 3) position = "left";
        else if (index === 4) position = "top-left";
        else if (index === 5) position = "top-right";

        return {
          player,
          position,
          isUser: player.userId === userId
        };
      });
    }

    // Reorder players to put current user first
    const currentUserIndex = players.findIndex(p => p.userId === userId);
    const reorderedPlayers = [
      ...players.slice(currentUserIndex, players.length),
      ...players.slice(0, currentUserIndex)
    ];

    // Display positions based on how many players there are
    return reorderedPlayers.map((player, index) => {
      const isCurrentUser = player.userId === userId;
      const totalPlayers = players.length;

      // Current user is always at the bottom
      if (isCurrentUser) {
        return { player, position: "bottom" as const, isUser: true };
      }

      // Position other players based on their relative position to the current user
      switch (totalPlayers) {
        case 2:
          // With 2 players, other player is at the top
          return { player, position: "top" as const, isUser: false };

        case 3:
          // With 3 players, positions are: bottom (user), top-left, top-right
          if (index === 1) return { player, position: "top-left" as const, isUser: false };
          else return { player, position: "top-right" as const, isUser: false };

        case 4:
          // With 4 players, positions are: bottom (user), left, top, right
          if (index === 1) return { player, position: "left" as const, isUser: false };
          else if (index === 2) return { player, position: "top" as const, isUser: false };
          else return { player, position: "right" as const, isUser: false };

        case 5:
          // With 5 players, positions are: bottom (user), left, top-left, top-right, right
          if (index === 1) return { player, position: "left" as const, isUser: false };
          else if (index === 2) return { player, position: "top-left" as const, isUser: false };
          else if (index === 3) return { player, position: "top-right" as const, isUser: false };
          else return { player, position: "right" as const, isUser: false };

        case 6:
          // With 6 players, all positions are filled
          if (index === 1) return { player, position: "left" as const, isUser: false };
          else if (index === 2) return { player, position: "top-left" as const, isUser: false };
          else if (index === 3) return { player, position: "top" as const, isUser: false };
          else if (index === 4) return { player, position: "top-right" as const, isUser: false };
          else return { player, position: "right" as const, isUser: false };

        default:
          // Default to top for any other number of players
          return { player, position: "top" as const, isUser: false };
      }
    });
  };

  const positionedPlayers = getPlayerPositions();

  useEffect(() => {
    if (gameState?.gameStarted && currentPlayer) {
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
      setSyncRate(2000);
    }
  }, [gameState?.players.length]);

  useEffect(() => {
    if (gameState?.gameStarted && !distributionComplete) {
      setShowDistribution(true);

      // Show distribution animation for 3 seconds
      const timer = setTimeout(() => {
        setShowDistribution(false);
        setDistributionComplete(true);
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

          // Hide game table UI and stop all game activities
          setShowGameTable(false);
          setActionsDisabled(true);
          setIsPlayingCard(false);
          setCardInMotion(null);
          setShowDistribution(false);
          setDistributionComplete(true);
          setGameTimer(null);
          setTurnTimer(null);

          // Find player with maximum cards
          const maxCardsPlayer = gameState.players.reduce((prev, current) =>
            (prev.cards.length > current.cards.length) ? prev : current
          );

          // Set game over state and winner immediately
          gameState.isGameOver = true;
          gameState.winner = maxCardsPlayer;
          
          // Update game state
          if (socket) {
            socket.emit('end_game', {
              roomId: currentRoom?.id,
              winnerId: maxCardsPlayer.id,
              reason: 'time_up'
            });
          }

          // Show toast notification
          toast({
            title: "Time's Up!",
            description: `${maxCardsPlayer.username} wins with ${maxCardsPlayer.cards.length} cards!`,
            variant: "default",
            duration: 1000,
            className: "top-0"
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState?.gameStarted, gameState?.gameStartTime, gameState?.roomDuration, endGame, socket, currentRoom]);

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
      }, isDebugMode ? 50 : 1000); // Update every 50ms in debug mode for smoother updates

      return () => clearInterval(interval);
    } else {
      // Reset turn timer when not in a turn
      setTurnTimer(null);
    }
  }, [gameState?.gameStarted, gameState?.turnEndTime, currentPlayer, userPlayer, playCard, isDebugMode]);

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
              duration: 1000,
              className: "top-0"
            });
          }
        });
      }
    }
  }, [gameState?.players, kickInactivePlayer, userId]);

  useEffect(() => {
    if (gameState?.matchAnimation?.isActive) {
      setShowMatchAnimation(true);
      setActionsDisabled(true);

      const timer = setTimeout(() => {
        setShowMatchAnimation(false);
        setActionsDisabled(false);
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // If match animation is not active, ensure actions are enabled and match text is hidden
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
    }
  }, [gameState]);

  // Add debug logging for turn state
  useEffect(() => {
    if (gameState?.gameStarted) {
    }
  }, [gameState?.currentPlayerIndex, currentPlayer, userId, isUserTurn, gameState?.gameStarted]);

  // Add event listener for turn changes
  useEffect(() => {
    if (!socket) return;

    // Listen for turn changes
    const handleTurnChange = (data: any) => {
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

    // Listen for card play events from other players
    const handlePlayCardEvent = (data: { playerId: string, card: Card }) => {
      console.log('handlePlayCardEvent called with data:', data);
      console.log('Current players:', players);
      console.log('Current player:', currentPlayer);

      // Find the player who played the card
      const player = players.find(p => p.id === data.playerId);
      console.log('Found player:', player);

      if (!player) {
        console.log('Player not found for ID:', data.playerId);
        return;
      }

      // Get the player's position and deck element
      const playerPosition = positionedPlayers.find(p => p.player.id === player.id)?.position;
      console.log('Player position:', playerPosition);

      const playerDeck = document.querySelector(`.player-deck-${playerPosition}`);
      const poolArea = document.querySelector('.center-area');

      console.log('Found elements:', {
        playerDeck: !!playerDeck,
        poolArea: !!poolArea
      });

      if (playerDeck && poolArea) {
        const deckRect = playerDeck.getBoundingClientRect();
        const poolRect = poolArea.getBoundingClientRect();

        // Calculate start and end positions
        const startPosition = {
          x: deckRect.left + (deckRect.width / 2) - 40,
          y: deckRect.top + (deckRect.height / 2) - 60
        };
        const endPosition = {
          x: poolRect.left + (poolRect.width / 2) - 40,
          y: poolRect.top + (poolRect.height / 2) - 60
        };

        console.log('Animation positions:', { startPosition, endPosition });

        // Animate the card
        animateCardToPool(data.card, startPosition, endPosition);
      } else {
        console.log('Missing required DOM elements for animation');
      }
    };

    const handlePlayerDisabled = (data: any) => {
      const { playerId } = data;
      setDisabledPlayers(prev => new Set(Array.from(prev).concat(playerId)));
      
      // Show toast notification
      toast({
        title: "Player Disabled",
        description: `${data.username} has been disabled (no cards left)`,
        variant: "default",
        duration: 3000,
        className: "top-0"
      });
    };

    socket.on('turn_changed', handleTurnChange);
    socket.on('play_card', handlePlayCardEvent);
    socket.on('player_disabled', handlePlayerDisabled);

    return () => {
      socket.off('turn_changed', handleTurnChange);
      socket.off('play_card', handlePlayCardEvent);
      socket.off('player_disabled', handlePlayerDisabled);
    };
  }, [socket, userPlayer, players, positionedPlayers]);

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
        //setIsAnimating(true);

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
      const matchingCard = data.cards[data.cards.length - 2];
      if (matchedCard && matchingCard && matchedCard.value === matchingCard.value) {

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
              duration: 1000,
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

              // Clear the center pool and top card
              setDisplayedCenterCard(null);
              setLastPlayedCard(null);
              setCardInMotion(null);

              // If the current user is the one who matched, enable actions immediately
              if (userPlayer && userPlayer.id === data.playerId) {
                setActionsDisabled(false);
              }

              setMatchingCards([]);
            }, 1500);
          }, 800);
        }, 1000);
      }
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
    }
  }, [gameState, showCardCollection]);

  // Add this effect to handle automatic game start when status changes to 'ready'
  useEffect(() => {
    if (gameState?.status === 'ready' && isHost && !gameState.gameStarted) {
      console.log("Room is ready, automatically starting game");
      setTimeout(() => {
        startGame();

        toast({
          title: "Starting game",
          description: "Game is starting automatically...",
          duration: 1000,
          className: "top-0"
        });
      }, 1500); // Short delay for visual feedback
    }
  }, [gameState?.status, isHost, startGame, gameState?.gameStarted]);

  // Update the effect to set initialPlayerCount when game starts
  useEffect(() => {
    if (gameState?.gameStarted && !initialPlayerCount) {
      // Set initial player count to the number of players when game starts
      setInitialPlayerCount(gameState.players.length);

      // Debug log to verify the count
      console.log('Setting initial player count:', {
        playerCount: gameState.players.length,
        players: gameState.players
      });
    }
  }, [gameState?.gameStarted, gameState?.players, initialPlayerCount]);

  // Add effect to track room state changes specifically for auto-start
  useEffect(() => {
    if (!socket) return;

    const handleRoomReadyEvent = ({ roomId }: { roomId: string }) => {
      console.log("Received room:ready event for room:", roomId);
      if (isHost && !gameState.gameStarted) {
        console.log("Host detected, starting game");
        setTimeout(() => {
          startGame();
        }, 1500);
      }
    };

    socket.on('room:ready', handleRoomReadyEvent);

    return () => {
      socket.off('room:ready', handleRoomReadyEvent);
    };
  }, [socket, isHost, startGame, gameState?.gameStarted]);

  // Fix toast.error in handlePlayerAutoExited
  useEffect(() => {
    if (!socket) return;

    const handlePlayerAutoExited = (data: { playerId: string; username: string; reason: string }) => {
      setDisabledPlayers(prev => new Set(prev).add(data.playerId));
      toast({
        title: "Player removed",
        description: data.reason,
        variant: "destructive"
      });
    };

    socket.on('player_auto_exited', handlePlayerAutoExited);

    return () => {
      socket.off('player_auto_exited', handlePlayerAutoExited);
    };
  }, [socket]);

  // Add a manual start game check on component mount
  useEffect(() => {
    // Check if room is ready when component mounts or gameState changes
    if (gameState?.status === 'ready' && isHost && !gameState.gameStarted && hasMultiplePlayers) {
      console.log("Room is ready on mount/update, starting game");
      setTimeout(() => {
        startGame();
      }, 1500);
    }
  }, [gameState, isHost, hasMultiplePlayers]);

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
      if (gameState.status === 'ready') {
        return (
          <div className="w-full mb-4 p-4 bg-green-600/20 border border-green-500/30 rounded-md text-center">
            <p className="text-lg text-green-400 animate-pulse">
              All players have joined! Game starting automatically...
            </p>
          </div>
        );
      }
    }
    return null;
  };

  const handleStartGame = () => {
    if (!gameState || gameState.gameStarted || !hasMultiplePlayers || !isHost) {
      return;
    }

    setActionsDisabled(true);
    startGame();
    toast({
      title: "Starting game",
      description: "Initializing game state...",
      duration: 1000,
      className: "top-0"
    });
  };

  const handleShuffleDeck = () => {
    if (!isUserTurn || actionsDisabled || !userPlayer) {
      return;
    }

    // Check if player has reached shuffle limit
    if (userPlayer.shuffleCount >= MAX_SHUFFLE_COUNT) {
      toast({
        title: "Shuffle Limit Reached",
        description: "You have reached the maximum number of shuffles for this chance",
        variant: "destructive",
      });
      return;
    }

    setActionsDisabled(true);

    // Increment shuffle count
    userPlayer.shuffleCount = (userPlayer.shuffleCount || 0) + 1;

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

  const handlePlayCard = (card: Card) => {
    if (!socket || !currentRoom || !userPlayer || actionsDisabled || isPlayingCard) return;

    // Check if player is disabled
    if (disabledPlayers.has(userPlayer.id)) {
      toast({
        title: "Error",
        description: "You have been disabled for excessive auto-play",
        variant: "destructive"
      });
      return;
    }

    // Lock animations immediately
    setAnimationLocked(true);

    // Explicitly capture current top card before animation
    //if (gameState.centralPile && gameState.centralPile.length > 0) {
    //const currentTopCard = gameState.centralPile[gameState.centralPile.length - 1];
    //setDisplayedCenterCard(currentTopCard);
    //}

    setActionsDisabled(true);
    setLastPlayedCard(card);
    setCardInMotion(card);
    setIsAnimating(false); // Don't start appear animation yet

    // After animation completes, update game state
    setTimeout(() => {
      if (socket && currentRoom && userPlayer) {
        // Send play event to server with isHitButton flag
        playCard(userPlayer.id, { ...card, isHitButton: true });

        // Re-enable actions after a delay
        setTimeout(() => {
          // Now show the new card with appear animation
          setDisplayedCenterCard(card);
          //setIsAnimating(true);
          setActionsDisabled(false);

          // Reset animation state after a short delay
          setTimeout(() => {
            setIsAnimating(false);
            setAnimationLocked(false);
          }, 500);
        }, 1000);
      }
    }, 500);
  };

  const animateCardToPool = (card: Card, startPosition: { x: number, y: number }, endPosition: { x: number, y: number }) => {
    // Lock animations to prevent updates
    setAnimationLocked(true);

    // Create card element for animation
    const cardElement = document.createElement('div');
    cardElement.className = 'card-travel';

    // Position initially at start position
    cardElement.style.left = `${startPosition.x}px`;
    cardElement.style.top = `${startPosition.y}px`;

    // Create container for ReactDOM
    const cardContent = document.createElement('div');
    cardContent.className = 'w-full h-full relative';
    cardElement.appendChild(cardContent);

    // Add to body
    document.body.appendChild(cardElement);

    // Create root and render card
    const root = createRoot(cardContent);
    root.render(<PlayingCard card={card} />);

    // Start animation
    cardElement.style.transition = `transform 0.5s ease-out, left 0.5s ease-out, top 0.5s ease-out`;

    // After a small delay, move the card to the pool
    setTimeout(() => {
      cardElement.style.left = `${endPosition.x}px`;
      cardElement.style.top = `${endPosition.y}px`;
    }, 10);

    // After animation completes, update state and clean up
    setTimeout(() => {
      // Clean up animation elements first
      root.unmount();
      document.body.removeChild(cardElement);

      // Now show the new card with appear animation
      setDisplayedCenterCard(card);

      // Reset animation state after a short delay
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationLocked(false);
      }, 500);
    }, 500);
  };

  // Check if there's a potential match
  const checkPotentialMatch = () => {
    if (!gameState.centralPile || gameState.centralPile.length < 1) return null;

    // Get the top card of the center pool
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

  // Update the match animation UI in the center pool area
  const renderMatchAnimation = () => {
    // Only show the animation when showMatchAnimation is true AND we have a valid lastMatchPlayer
    if (!showMatchAnimation || !lastMatchPlayer) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-green-500/90 text-white px-8 py-4 rounded-lg text-3xl font-bold animate-bounce match-animation">
          MATCH! COLLECT ALL!
        </div>
      </div>
    );
  };

  const renderCardCollection = () => {
    if (!showCardCollection || !lastMatchPlayer || matchedCards.length === 0) return null;

    // Find target player deck position
    const targetPlayerPosition = positionedPlayers.find(p => p.player.id === lastMatchPlayer)?.position || 'bottom';

    let targetX = 0, targetY = 0;

    // Set target coordinates based on player position
    switch (targetPlayerPosition) {
      case 'top':
        targetX = 0;
        targetY = -300;
        break;
      case 'bottom':
        targetX = 0;
        targetY = 300;
        break;
      case 'left':
        targetX = -300;
        targetY = 0;
        break;
      case 'right':
        targetX = 300;
        targetY = 0;
        break;
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <p className="text-green-400 text-xl text-center mb-4 bg-black/80 p-2 rounded">
            {players.find(p => p.id === lastMatchPlayer)?.username} collects cards!
          </p>
        </div>
        {matchedCards.map((card, index) => {
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
                left: `calc(50% + ${spreadX}px)`,
                top: `calc(50% + ${spreadY}px)`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${index * 0.05}s`,
                zIndex: 9999 + index
              } as React.CSSProperties}
            >
              <PlayingCard card={card} />
            </div>
          );
        })}
      </div>
    );
  };

  // Update the center area display with simpler logic
  const renderCenterArea = () => {
    if (gameState.centralPile && gameState.centralPile.length > 0) {
      // Add null check for cardToShow
      const cardToShow = hideTopCard ? null : (displayedCenterCard || null);

      return (
        <div className="bg-[#0F212E] p-2 relative border-2 border-blue-500 rounded-lg w-full h-full flex flex-col min-h-[200px]">
          <div className="flex-1 flex flex-col justify-center items-center">
            {cardToShow && (  // Add conditional rendering
              <div className="relative">
                <PlayingCard
                  card={cardToShow}

                />
                <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-800 z-10">
                  {gameState.centralPile.length}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 mb-1 text-center">
            <div className="bg-blue-900/50 p-2 rounded text-white">
              {cardToShow ? (  // Add conditional rendering for card info
                `Top Card: ${cardToShow.value} of ${cardToShow.suit}`
              ) : (
                'Card in motion...'
              )}
            </div>
            {lastPlayedCard && currentPlayer && (
              <div className="mt-1 text-gray-300 text-sm">
                Played by: {currentPlayer.username}
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="center-empty-pool">
          {cardInMotion ? (
            <div className="">
              {/* <PlayingCard card={cardInMotion} /> */}
            </div>
          ) : (
            <>
              <div className="text-gray-300 text-lg italic mb-4">Empty Pool</div>
              <div className="text-white text-xs">No cards in pool</div>
            </>
          )}
        </div>
      );
    }
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

  // Add debug mode effect
  useEffect(() => {
    if (socket && isDebugMode) {
      socket.emit('set_debug_mode', { enabled: true });
    }
  }, [socket, isDebugMode]);

  // Auto-play effect with faster delay in debug mode
  useEffect(() => {
    if (isDebugMode && gameState?.players && gameState.currentPlayerIndex >= 0) {
      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (currentPlayer?.userId === userId && currentPlayer?.cards?.length > 0) {
        const delay = isDebugMode ? 100 : 1000; // 100ms in debug mode, 1000ms in normal mode
        const timer = setTimeout(() => {
          const firstCard = currentPlayer.cards[0];
          if (firstCard) {
            handlePlayCard(firstCard);
          }
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState?.players, gameState?.currentPlayerIndex, isDebugMode, userId]);

  useEffect(() => {
    if (socket) {
      // Listen for debug mode changes from server
      const handleDebugModeChanged = ({ enabled }: { enabled: boolean }) => {
        setIsDebugMode(enabled);
      };

      socket.on('debug_mode_changed', handleDebugModeChanged);

      return () => {
        socket.off('debug_mode_changed', handleDebugModeChanged);
      };
    }
  }, [socket]);

  // Track central pile changes to store the previous top card, but respect animation lock
  useEffect(() => {
    if (!animationLocked && gameState.centralPile && gameState.centralPile.length > 0) {
      const currentTopCard = gameState.centralPile[gameState.centralPile.length - 1];

      // Only update if we're not in the middle of an animation
      if (!animatingNewCard) {
        setPreviousTopCard(currentTopCard);
      }
    }
  }, [gameState.centralPile, animatingNewCard, animationLocked]);

  // Initialize displayed center card from game state
  // useEffect(() => {
  //   if (!animationLocked && gameState.centralPile && gameState.centralPile.length > 0) {
  //     setDisplayedCenterCard(gameState.centralPile[gameState.centralPile.length - 1]);
  //   }
  // }, [gameState.centralPile, animationLocked]);

  const { deductBalance } = useBalance();

  // Add effect to reset hasPurchasedShuffleThisTurn when turn changes
  useEffect(() => {
    if (gameState?.currentPlayerIndex !== undefined && userPlayer) {
      const isUserTurn = gameState.players[gameState.currentPlayerIndex]?.id === userPlayer.id;
      if (!isUserTurn) {
        setHasPurchasedShuffleThisTurn(false);
      }
    }
  }, [gameState?.currentPlayerIndex, userPlayer]);

  const handlePurchaseShuffle = async () => {
    if (!socket || !currentRoom || !userPlayer) return;

    // Check if player has already purchased a shuffle this turn
    if (hasPurchasedShuffleThisTurn) {
      toast({
        title: "Purchase Limit Reached",
        description: "You can only purchase one shuffle per turn",
        variant: "destructive"
      });
      return;
    }

    try {
      // Emit event to server to purchase shuffle
      socket.emit('purchase_shuffle', {
        roomId: currentRoom.id,
        playerId: userPlayer.id,
        amount: 10
      });

      // Listen for the response
      socket.once('shuffle_purchased', (response) => {
        if (response.success) {
          // Update local state
          userPlayer.shuffleCount = (userPlayer.shuffleCount || 0) - 1; // Decrease shuffle count by 1
          setHasPurchasedShuffleThisTurn(true); // Mark that player has purchased a shuffle this turn
          setShowShufflePurchasePopup(false);
          
          toast({
            title: "Shuffle Purchased",
            description: "You have purchased an additional shuffle for ₹10",
            variant: "default"
          });
        } else {
          toast({
            title: "Error",
            description: response.message || "Failed to purchase shuffle. Please try again.",
            variant: "destructive"
          });
        }
      });

      // Listen for any errors
      socket.once('error', (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to purchase shuffle. Please try again.",
          variant: "destructive"
        });
      });

    } catch (error) {
      console.error("Error purchasing shuffle:", error);
      toast({
        title: "Error",
        description: "Failed to purchase shuffle. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (gameState.isGameOver) {
    const winner = gameState.winner;
    const isUserWinner = winner?.id === userId;
    const poolAmount = (currentRoom?.betAmount || 0) * (initialPlayerCount || gameState.players.length);
    console.log("currentRoom", currentRoom);
    return (
      <GameOverPanel
        gameState={gameState}
        currentRoom={currentRoom}
        userId={userId}
        socket={socket}
        initialPlayerCount={initialPlayerCount || gameState.players.length}
        reason={gameTimer === 0 ? 'time_up' : 'normal'}
      />
    );
  }

  return (
    <>
      {showGameTable && gameState.gameStarted && (
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
              <div className="text-sm text-gray-300 bg-blue-900/70 p-2 rounded-lg">
                Players: {players.length}/{gameState.requiredPlayers}
              </div>
              {gameTimer !== null && (
                <div className="text-sm text-gray-300 bg-blue-900/70 p-2 rounded-lg">
                  Time: {formatTime(gameTimer)}
                </div>
              )}
            </div>



            {/* Pool amount using initialPlayerCount */}
            <div className="text-sm text-gray-300 bg-green-900/70 p-2 rounded-lg">
              Pool: ₹{(currentRoom?.betAmount || 0) * (initialPlayerCount || gameState.players.length)}
            </div>
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
                        Player {idx + 1}: {player.username}
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
                    {positionedPlayers.map(({ player, position }, idx) => (
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

          <div className={`relative bg-blue border border-blue-900/20 rounded-lg p-4`}>
            <div className={`game-board ${!gameState.centralPile || gameState.centralPile.length === 0 ? 'game-board-empty-pool' : ''}`}>
              {/* Top player */}
              <div className="top-player flex justify-center">
                {positionedPlayers
                  .filter(p => p.position === "top")
                  .map(({ player, position, isUser }) => (
                    <div key={player.id} className="player-container">
                      {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                        <svg className="timer-progress" viewBox="0 0 200 200">
                          <circle
                            className="progress-bg"
                            cx="100"
                            cy="100"
                            r="90"
                          />
                          <circle
                            className={`progress-bar ${turnTimer <= (isDebugMode ? 500 : 5000) ? 'warning' : ''}`}
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
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
                        gameState={gameState}
                        isUserTurn={isUserTurn}
                        actionsDisabled={actionsDisabled}
                        handleShuffleDeck={handleShuffleDeck}
                        MAX_SHUFFLE_COUNT={MAX_SHUFFLE_COUNT}
                        onCardClick={handlePlayCard}
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
                        <svg className="timer-progress" viewBox="0 0 200 200">
                          <circle
                            className="progress-bg"
                            cx="100"
                            cy="100"
                            r="90"
                          />
                          <circle
                            className={`progress-bar ${turnTimer <= (isDebugMode ? 500 : 5000) ? 'warning' : ''}`}
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
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
                        gameState={gameState}
                        isUserTurn={isUserTurn}
                        actionsDisabled={actionsDisabled}
                        handleShuffleDeck={handleShuffleDeck}
                        MAX_SHUFFLE_COUNT={MAX_SHUFFLE_COUNT}
                        onCardClick={handlePlayCard}
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
                        <svg className="timer-progress" viewBox="0 0 200 200">
                          <circle
                            className="progress-bg"
                            cx="100"
                            cy="100"
                            r="90"
                          />
                          <circle
                            className={`progress-bar ${turnTimer <= (isDebugMode ? 500 : 5000) ? 'warning' : ''}`}
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
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
                        gameState={gameState}
                        isUserTurn={isUserTurn}
                        actionsDisabled={actionsDisabled}
                        handleShuffleDeck={handleShuffleDeck}
                        MAX_SHUFFLE_COUNT={MAX_SHUFFLE_COUNT}
                        onCardClick={handlePlayCard}
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
                        <svg className="timer-progress" viewBox="0 0 200 200">
                          <circle
                            className="progress-bg"
                            cx="100"
                            cy="100"
                            r="90"
                          />
                          <circle
                            className={`progress-bar ${turnTimer <= (isDebugMode ? 500 : 5000) ? 'warning' : ''}`}
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
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
                        gameState={gameState}
                        isUserTurn={isUserTurn}
                        actionsDisabled={actionsDisabled}
                        handleShuffleDeck={handleShuffleDeck}
                        MAX_SHUFFLE_COUNT={MAX_SHUFFLE_COUNT}
                        onCardClick={handlePlayCard}
                      />
                    </div>
                  ))}
              </div>

              {/* Center game area */}
              <div className="center-area flex items-center justify-center">
                {renderCenterArea()}
              </div>

              {/* Right player */}
              <div className="right-player flex items-center justify-start">
                {positionedPlayers
                  .filter(p => p.position === "right")
                  .map(({ player, position, isUser }) => (
                    <div key={player.id} className="player-container">
                      {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                        <svg className="timer-progress" viewBox="0 0 200 200">
                          <circle
                            className="progress-bg"
                            cx="100"
                            cy="100"
                            r="90"
                          />
                          <circle
                            className={`progress-bar ${turnTimer <= (isDebugMode ? 500 : 5000) ? 'warning' : ''}`}
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
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
                        gameState={gameState}
                        isUserTurn={isUserTurn}
                        actionsDisabled={actionsDisabled}
                        handleShuffleDeck={handleShuffleDeck}
                        MAX_SHUFFLE_COUNT={MAX_SHUFFLE_COUNT}
                        onCardClick={handlePlayCard}
                      />
                    </div>
                  ))}
              </div>

              {/* Bottom player (you) */}
              <div className="bottom-player flex justify-center">
                {positionedPlayers
                  .filter(p => p.position === "bottom")
                  .map(({ player, position, isUser }) => (
                    <div key={player.id} className="player-container flex flex-col items-center gap-4">
                      {gameState.gameStarted && player.id === currentPlayer?.id && turnTimer !== null && (
                        <svg className="timer-progress" viewBox="0 0 200 200">
                          <circle
                            className="progress-bg"
                            cx="100"
                            cy="100"
                            r="90"
                          />
                          <circle
                            className={`progress-bar ${turnTimer <= (isDebugMode ? 500 : 5000) ? 'warning' : ''}`}
                            cx="100"
                            cy="100"
                            r="90"
                            strokeDasharray={`${2 * Math.PI * 90}`}
                            strokeDashoffset={2 * Math.PI * 90 * (1 - (turnTimer || 0) / MAX_TURN_TIME)}
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
                        gameState={gameState}
                        isUserTurn={isUserTurn}
                        actionsDisabled={actionsDisabled}
                        handleShuffleDeck={handleShuffleDeck}
                        MAX_SHUFFLE_COUNT={MAX_SHUFFLE_COUNT}
                        onCardClick={handlePlayCard}
                      />

                      {gameState.gameStarted && userPlayer && (
                        <div className="absolute left-48 top-10 flex flex-col space-y-2">
                          <Button
                            onClick={() => handlePlayCard(userPlayer.cards[0])}
                            disabled={!isUserTurn || actionsDisabled}
                            className={`hit-button ${isUserTurn && !actionsDisabled
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-gray-600'
                              } text-white transition-colors duration-200`}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Your Turn - Hit!
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              onClick={handleShuffleDeck}
                              disabled={!isUserTurn || actionsDisabled || (userPlayer?.shuffleCount ?? 0) >= 2}
                              className={`${isUserTurn && !actionsDisabled && (userPlayer?.shuffleCount ?? 0) < 2
                                ? 'bg-[#4169E1] hover:bg-[#3158c4]'
                                : 'bg-gray-600'
                                } text-white flex-1`}
                            >
                              <Shuffle className="h-5 w-5 mr-1" />
                              Shuffle ({MAX_SHUFFLE_COUNT - (userPlayer?.shuffleCount ?? 0)} left)
                            </Button>

                            {(userPlayer?.shuffleCount ?? 0) >= 2 && !hasPurchasedShuffleThisTurn && (
                              <Button
                                onClick={() => setShowShufflePurchasePopup(true)}
                                className="bg-green-600 hover:bg-green-700 text-white p-2"
                                title="Purchase additional shuffle"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {renderMatchingCards()}
      {renderMatchAnimation()}
      {renderCardCollection()}

      {/* Shuffle Purchase Popup */}
      {showShufflePurchasePopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-[#1F2937] p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Purchase Additional Shuffle</h3>
            <p className="text-gray-300 mb-4">
              Would you like to purchase an additional shuffle for ₹10?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setShowShufflePurchasePopup(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePurchaseShuffle}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Purchase (₹10)
              </Button>
            </div>
          </div>
        </div>
      )}
      <style>{styles}</style>
    </>
  );
};

export default GameBoard;
