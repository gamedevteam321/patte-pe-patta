
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
          // Game over logic
          const winner = [...gameState.players].sort((a, b) => b.cards.length - a.cards.length)[0];
          toast({
            title: "Game Over!",
            description: `${winner.username} wins with ${winner.cards.length} cards!`
          });
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState?.gameStarted, gameState?.gameStartTime, gameState?.roomDuration]);

  useEffect(() => {
    // Update turn timer
    if (gameState?.gameStarted && gameState.turnEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, gameState.turnEndTime - now);
        
        setTurnTimer(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          // Auto-play logic would go here
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState?.turnEndTime]);

  const handleRefreshGameState = async () => {
    if (!gameState) return;

    setIsRefreshing(true);
    toast({
      title: "Refreshing game state",
      description: "Syncing with other players..."
    });

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
      <div className="flex flex-col items-center justify-center h-64 glass-panel">
        <div className="text-xl font-semibold text-blue-400 mb-4">Loading game...</div>
        <div className="animate-pulse text-blue-300">Please wait while the game loads</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isUserTurn = currentPlayer?.id === userId;
  const isHost = gameState.players.length > 0 && gameState.players[0].id === userId;
  
  // Only show real players, no AI players
  const players = gameState.players;
  
  // Check if we have multiple human players
  const hasMultiplePlayers = players.length > 1;
  const canStartGame = !gameState.gameStarted && hasMultiplePlayers && isHost;

  return (
    <div className="space-y-8">
      {/* Game timers */}
      {gameState.gameStarted && (
        <div className="flex justify-between items-center">
          <div className="bg-blue-900/30 border border-blue-700/50 px-4 py-2 rounded-md">
            <span className="text-sm text-blue-300">Game time: </span>
            <span className="text-lg font-mono text-white">{gameTimer !== null ? formatTime(gameTimer) : "--:--"}</span>
          </div>
          
          {turnTimer !== null && (
            <div className={`px-4 py-2 rounded-md ${
              turnTimer < 5 ? "bg-red-900/30 border border-red-700/50" : "bg-blue-900/30 border border-blue-700/50"
            }`}>
              <span className="text-sm text-blue-300">Turn: </span>
              <span className={`text-lg font-mono ${turnTimer < 5 ? "text-red-300" : "text-white"}`}>{turnTimer}s</span>
            </div>
          )}
        </div>
      )}

      {/* Players counter and refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-400" />
          <span className="text-sm font-medium text-blue-400">
            {players.length} Player{players.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshGameState}
            disabled={isRefreshing}
            className="border-blue-500 hover:bg-blue-900/20 text-blue-300"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Syncing..." : "Refresh Players"}
          </Button>

          {hasMultiplePlayers ? (
            <Badge className="bg-blue-600 text-white">Multiplayer Active</Badge>
          ) : (
            <Badge className="bg-yellow-600 text-black">Waiting for players</Badge>
          )}
        </div>
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
        <div className="w-full mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg text-center">
          <p className="text-blue-300 mb-4">
            You're the host of this game. You can start the game when everyone is ready.
          </p>
          <Button 
            onClick={() => startGame()} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Play className="mr-2 h-5 w-5" />
            Start Game
          </Button>
        </div>
      )}

      {/* Central Card Pile */}
      <div className="glass-panel bg-gradient-to-br from-blue-950 to-black p-6 relative border border-blue-900/50">
        <h3 className="text-lg font-semibold text-blue-400 mb-4">Central Pile</h3>
        <div className="flex justify-center items-center min-h-32">
          {gameState.centralPile.length > 0 ? (
            <div className="relative h-32">
              {/* Show up to 5 cards in the pile */}
              {gameState.centralPile.slice(-5).map((card, i, arr) => (
                <div
                  key={card.id}
                  className="absolute transition-all duration-300"
                  style={{
                    left: `${i * 20}px`,
                    top: `${i * 2}px`,
                    zIndex: i,
                  }}
                >
                  <PlayingCard card={card} />
                </div>
              ))}
              {gameState.centralPile.length > 5 && (
                <div className="absolute right-0 top-0 transform translate-x-full">
                  <span className="text-sm text-blue-300">+{gameState.centralPile.length - 5} more</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-blue-300">No cards yet</div>
          )}
        </div>
        
        {gameState.lastMatchWinner && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-blue-500 text-white">
              Last match won by: {gameState.players.find(p => p.id === gameState.lastMatchWinner)?.username}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Game Controls */}
      {gameState.gameStarted && (
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => {
              if (isUserTurn) {
                playCard();
              } else {
                toast({
                  title: "Not your turn",
                  description: "Please wait for your turn to play",
                  variant: "destructive"
                });
              }
            }}
            disabled={!isUserTurn}
            className={isUserTurn 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-muted text-muted-foreground"}
            size="lg"
          >
            <Send className="mr-2 h-5 w-5" />
            Play Card
          </Button>
          
          <Button
            onClick={() => {
              if (isUserTurn) {
                shuffleDeck();
              } else {
                toast({
                  title: "Not your turn",
                  description: "Please wait for your turn to shuffle",
                  variant: "destructive"
                });
              }
            }}
            disabled={!isUserTurn}
            className={isUserTurn 
              ? "bg-blue-500 hover:bg-blue-600 text-white" 
              : "bg-muted text-muted-foreground"}
            size="lg"
          >
            <Shuffle className="mr-2 h-5 w-5" />
            Shuffle
          </Button>
        </div>
      )}
      
      {/* Player Decks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player) => (
          <PlayerDeck
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === currentPlayer?.id}
            isUser={player.id === userId}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
