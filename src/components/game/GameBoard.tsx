import React, { useEffect, useState } from "react";
import { useSocket, GameState } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users, RefreshCw, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GameBoardProps {
  userId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const { gameState, playCard, shuffleDeck, joinRoom, startGame } = useSocket();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionComplete, setDistributionComplete] = useState(false);
  const [gameTimer, setGameTimer] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);

  useEffect(() => {
    // Auto-refresh players every 7 seconds - less frequent to prevent continuous refresh
    const refreshInterval = setInterval(() => {
      if (gameState && !gameState.gameStarted) {
        handleRefreshGameState();
      }
    }, 7000);
    
    return () => clearInterval(refreshInterval);
  }, [gameState]);

  useEffect(() => {
    // Keep track of player count changes for user feedback
    if (gameState && gameState.players.length > 1) {
      // When another player joins
      console.log(`Game has ${gameState.players.length} players`);
      
      // Log all player names for debugging
      const playerNames = gameState.players.map(p => `${p.username} (${p.id})`).join(", ");
      console.log(`Current players: ${playerNames}`);
    }
  }, [gameState?.players.length]);

  useEffect(() => {
    if (gameState?.gameStarted && !distributionComplete) {
      setShowDistribution(true);
      
      // Hide distribution animation after 3 seconds
      const timer = setTimeout(() => {
        setShowDistribution(false);
        setDistributionComplete(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStarted, distributionComplete]);

  useEffect(() => {
    // Update game timer
    if (gameState?.gameStarted && gameState.gameStartTime && gameState.roomDuration) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - gameState.gameStartTime;
        const remaining = Math.max(0, gameState.roomDuration - elapsed);
        
        setGameTimer(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          // End game by timeout if not already ended
          if (gameState && !gameState.isGameOver) {
            // Game over by timeout
            toast({
              title: "Game Over",
              description: "Time's up! The game has ended."
            });
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState?.gameStarted, gameState?.gameStartTime, gameState?.roomDuration, gameState?.isGameOver]);

  useEffect(() => {
    // Update turn timer
    if (gameState?.gameStarted && gameState.turnEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, gameState.turnEndTime - now);
        
        setTurnTimer(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          // Auto-play will be handled by the server
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState?.turnEndTime, gameState?.gameStarted]);

  const handleRefreshGameState = async () => {
    if (!gameState) return;

    setIsRefreshing(true);

    // Use the window location to get the current room ID
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-[#0B0C10] border border-blue-900/20 rounded-lg">
        <div className="text-xl font-semibold text-white mb-4">Loading game...</div>
        <div className="animate-pulse text-blue-300">Please wait while the game loads</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isUserTurn = currentPlayer?.id === userId;
  const isHost = gameState.players.length > 0 && gameState.players[0].id === userId;
  
  // Only show real players, no AI players
  const players = gameState.players;
  
  // Get user player
  const userPlayer = players.find(p => p.id === userId);
  
  // Check if we have multiple human players
  const hasMultiplePlayers = players.length > 1;
  const canStartGame = !gameState.gameStarted && hasMultiplePlayers && isHost;

  // Layout players in the correct position based on how many players there are
  const getPlayerPositions = () => {
    // Find the index of the current user
    const userIndex = players.findIndex(p => p.id === userId);
    if (userIndex === -1) return [];
    
    // Reorder players so that the user is always at the bottom
    const reorderedPlayers = [...players.slice(userIndex), ...players.slice(0, userIndex)];
    
    // Assign positions based on player count
    return reorderedPlayers.map((player, index) => {
      const isUser = player.id === userId;
      
      if (isUser) {
        return { player, position: "bottom" as const, isUser: true };
      }
      
      if (players.length === 2) {
        // For 2 players: opponent is at the top
        return { player, position: "top" as const, isUser: false };
      }
      
      if (players.length === 3) {
        // For 3 players: opponents are at left and right
        return { 
          player, 
          position: index === 1 ? "left" as const : "right" as const, 
          isUser: false 
        };
      }
      
      if (players.length === 4) {
        // For 4 players: opponents are at left, top, and right
        if (index === 1) return { player, position: "left" as const, isUser: false };
        if (index === 2) return { player, position: "top" as const, isUser: false };
        return { player, position: "right" as const, isUser: false };
      }
      
      return { player, position: "top" as const, isUser: false };
    });
  };

  // Game over view
  if (gameState.isGameOver && gameState.winner) {
    return (
      <div className="space-y-8">
        <div className="bg-[#0B0C10] border border-[#4169E1] rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-blue-300 mb-4">Game Over!</h2>
          <div className="text-xl text-blue-200 mb-8">
            {gameState.winner.username === players.find(p => p.id === userId)?.username
              ? "Congratulations! You won the game! 🎉"
              : `${gameState.winner.username} won the game!`}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {players.map((player) => (
              <div 
                key={player.id} 
                className={`p-4 rounded-lg ${
                  player.id === gameState.winner?.id 
                    ? "bg-[#4169E1]/40 border-2 border-blue-500" 
                    : "bg-blue-900/20 border border-blue-800/50"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-blue-300">{player.username}</span>
                  <Badge
                    variant={player.id === gameState.winner?.id ? "secondary" : "outline"}
                  >
                    {player.id === gameState.winner?.id ? "Winner" : "Player"}
                  </Badge>
                </div>
                <div className="text-gray-300">Cards: {player.cards.length}</div>
                {player.coins !== undefined && (
                  <div className="text-gray-300">Coins: {player.coins}</div>
                )}
              </div>
            ))}
          </div>
          
          <Button 
            onClick={() => window.location.href = "/lobby"} 
            className="bg-[#4169E1] hover:bg-[#3158c4] text-white"
          >
            Return to Lobby
          </Button>
        </div>
      </div>
    );
  }

  // Get player positions
  const positionedPlayers = getPlayerPositions();

  return (
    <div className="space-y-2">
      {/* Game Header with Timer */}
      <div className="flex justify-between items-center px-4 py-2">
        <h1 className="text-2xl font-bold text-yellow-400">Patte pe Patta</h1>
        
        {gameState.gameStarted && gameTimer !== null && (
          <div className="bg-transparent border border-yellow-500 rounded-full px-4 py-1">
            <span className="text-xl font-mono text-yellow-400">{formatTime(gameTimer)}</span>
          </div>
        )}
      </div>

      {/* Top Players (based on layout) */}
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
            />
          ))}
      </div>

      {/* Middle section with left, center, and right */}
      <div className="relative flex justify-center items-stretch mb-4">
        {/* Left Player */}
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
              />
            ))}
        </div>
        
        {/* Central Card Area */}
        <div className="w-3/5 flex flex-col justify-center items-center">
          {/* Game Table - No hand decorations */}
          <div className="bg-game-card p-4 relative border-2 border-[#4169E1] rounded-lg min-h-[240px] w-full flex flex-col justify-center items-center">
            {/* Center Pile */}
            <div className="flex justify-center items-center">
              {gameState.centralPile.length > 0 ? (
                <div className="relative h-36">
                  {/* Show up to 3 cards in the pile */}
                  {gameState.centralPile.slice(-3).map((card, i, arr) => (
                    <div
                      key={card.id}
                      className="absolute transition-all duration-300"
                      style={{
                        left: `${i * 10}px`,
                        top: `${i * 2}px`,
                        zIndex: i,
                        transform: `rotate(${(i - 1) * 4}deg)`
                      }}
                    >
                      <PlayingCard 
                        card={card} 
                        isMatched={gameState.matchAnimation?.isActive && gameState.matchAnimation.cardId === card.id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-white">No cards yet</div>
              )}
            </div>
          </div>
          
          {/* Turn Timer */}
          {gameState.gameStarted && turnTimer !== null && (
            <div className="mt-2 w-full">
              <div className="text-center text-white text-sm">{turnTimer} Sec</div>
              <div className="h-2 w-full bg-gray-700 rounded overflow-hidden">
                <div 
                  className={`h-full ${turnTimer < 5 ? 'bg-red-500' : 'bg-green-500'}`} 
                  style={{width: `${Math.min(100, (turnTimer / 15) * 100)}%`}}
                ></div>
              </div>
            </div>
          )}
          
          {/* Game Controls */}
          {gameState.gameStarted && userPlayer && (
            <div className="mt-2 flex justify-center space-x-4">
              <Button
                onClick={() => playCard()}
                disabled={!isUserTurn}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Hit
              </Button>
              
              <Button
                onClick={() => shuffleDeck()}
                disabled={!isUserTurn}
                className="bg-[#4169E1] hover:bg-[#3158c4] text-white"
              >
                <Shuffle className="h-5 w-5 mr-1" /> 
                <span>1</span>
              </Button>
            </div>
          )}
        </div>
        
        {/* Right Player */}
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
              />
            ))}
        </div>
      </div>

      {/* Current user's cards (bottom) */}
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
            />
          ))}
      </div>

      {/* Card distribution animation */}
      {showDistribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="text-center">
            <div className="relative h-48 w-48 mb-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 left-0 animate-card-distribute"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    transform: `translateY(-100px) rotate(${(i - 2) * 5}deg)`,
                  }}
                >
                  <PlayingCard isBack={true} className="shadow-lg" />
                </div>
              ))}
            </div>
            <div className="text-xl font-bold text-blue-300 animate-pulse">Dealing cards...</div>
          </div>
        </div>
      )}

      {/* Start game button for host */}
      {canStartGame && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10">
          <Button 
            onClick={() => startGame()} 
            className="bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Game
          </Button>
        </div>
      )}
      
      {/* Players counter and info */}
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
  );
};

export default GameBoard;
