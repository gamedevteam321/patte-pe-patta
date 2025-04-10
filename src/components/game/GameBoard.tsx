import React, { useEffect, useState } from "react";
import { useSocket, GameState } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users, RefreshCw, Play, Clock, AlertTriangle, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GameBoardProps {
  userId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const { gameState, playCard, shuffleDeck, joinRoom, startGame, kickInactivePlayer } = useSocket();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [distributionComplete, setDistributionComplete] = useState(false);
  const [gameTimer, setGameTimer] = useState<number | null>(null);
  const [turnTimer, setTurnTimer] = useState<number | null>(null);
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [actionsDisabled, setActionsDisabled] = useState(false);
  const [syncRate, setSyncRate] = useState(3000);

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
      
      const timer = setTimeout(() => {
        setShowDistribution(false);
        setDistributionComplete(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStarted, distributionComplete]);

  useEffect(() => {
    if (gameState?.gameStarted && gameState.gameStartTime && gameState.roomDuration) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - gameState.gameStartTime;
        const remaining = Math.max(0, gameState.roomDuration - elapsed);
        
        setGameTimer(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          if (gameState && !gameState.isGameOver) {
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
    if (gameState?.gameStarted && gameState.turnEndTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, gameState.turnEndTime - now);
        
        setTurnTimer(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [gameState?.turnEndTime, gameState?.gameStarted]);

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
      setShowMatchAnimation(true);
      setActionsDisabled(true);
      
      const timer = setTimeout(() => {
        setShowMatchAnimation(false);
        setActionsDisabled(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState?.matchAnimation]);

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
  
  const players = gameState.players;
  
  const userPlayer = players.find(p => p.id === userId);
  
  const hasMultiplePlayers = players.length > 1;
  const canStartGame = !gameState.gameStarted && hasMultiplePlayers && isHost;

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

  const positionedPlayers = getPlayerPositions();

  return (
    <div className="space-y-2">
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
              />
            ))}
        </div>
        
        <div className="w-3/5 flex flex-col justify-center items-center">
          <div className="bg-game-card p-4 relative border-2 border-[#4169E1] rounded-lg min-h-[240px] w-full flex flex-col justify-center items-center">
            <div className="flex justify-center items-center">
              {gameState.centralPile.length > 0 ? (
                <div className="relative h-36">
                  {gameState.centralPile.slice(-3).map((card, i, arr) => (
                    <div
                      key={card.id}
                      className={`absolute transition-all duration-300 ${
                        gameState.matchAnimation?.isActive && 
                        gameState.matchAnimation.cardId === card.id ? 
                        'animate-card-match' : ''
                      }`}
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
            
            {showMatchAnimation && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-yellow-500/30 px-6 py-3 rounded-full animate-pulse">
                  <span className="text-2xl font-bold text-white">MATCH!</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-2 w-full">
            <div className="flex items-center justify-center gap-2 text-center">
              <Timer className="h-4 w-4 text-blue-300" />
              <div className="text-white text-sm">
                {isUserTurn ? (
                  <span className="text-blue-300 font-bold">Your turn! {turnTimer}s</span>
                ) : (
                  <span className="text-gray-300">{currentPlayer?.username}'s turn - {turnTimer}s</span>
                )}
              </div>
            </div>
            <div className="h-2 w-full bg-gray-700 rounded overflow-hidden mt-1">
              <div 
                className={`h-full ${turnTimer < 5 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{width: `${Math.min(100, (turnTimer / 15) * 100)}%`}}
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
                onClick={() => playCard()}
                disabled={!isUserTurn || actionsDisabled}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Hit
              </Button>
              
              <Button
                onClick={() => shuffleDeck()}
                disabled={!isUserTurn || actionsDisabled}
                className="bg-[#4169E1] hover:bg-[#3158c4] text-white"
              >
                <Shuffle className="h-5 w-5 mr-1" /> 
                <span>1</span>
              </Button>
            </div>
          )}
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
            />
          ))}
      </div>

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
