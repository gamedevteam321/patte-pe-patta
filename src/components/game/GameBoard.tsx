
import React, { useEffect, useState } from "react";
import { useSocket, GameState } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users, RefreshCw, Star, Trophy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GameBoardProps {
  userId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const { gameState, playCard, shuffleDeck, joinRoom } = useSocket();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showShuffle, setShowShuffle] = useState(false);

  useEffect(() => {
    // Keep track of player count changes for user feedback
    if (gameState && gameState.players.length > 1) {
      // When another player joins
      console.log(`Game has ${gameState.players.length} players`);
      
      // Log all player names for debugging
      const playerNames = gameState.players.map(p => `${p.username} (${p.id})`).join(", ");
      console.log(`Current players: ${playerNames}`);
    }
    
    // Show game over dialog when game ends
    if (gameState?.isGameOver && !showGameOver) {
      setShowGameOver(true);
    }
    
    // Show shuffle animation when game starts
    if (gameState?.gameStarted && !showShuffle) {
      setShowShuffle(true);
      setTimeout(() => setShowShuffle(false), 3000);
    }
  }, [gameState?.players.length, gameState?.isGameOver, showGameOver, gameState?.gameStarted, showShuffle]);

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

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-panel">
        <div className="text-xl font-semibold text-game-cyan mb-4">Loading game...</div>
        <div className="animate-pulse text-muted-foreground">Please wait while the game loads</div>
      </div>
    );
  }
  
  if (showShuffle) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-panel">
        <div className="relative w-64 h-64">
          {/* Shuffle animation */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute"
              style={{
                animation: `shuffleCard 3s ease-in-out ${i * 0.1}s`,
                transformOrigin: 'center',
              }}
            >
              <PlayingCard isBack />
            </div>
          ))}
        </div>
        <div className="text-xl font-semibold text-game-cyan mt-4">Shuffling cards...</div>
        <div className="text-muted-foreground mt-2">Get ready to play!</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isUserTurn = currentPlayer?.id === userId;
  
  // Only show real players, no AI players
  const players = gameState.players;
  
  // Check if we have multiple human players
  const hasMultiplePlayers = players.length > 1;

  return (
    <div className="space-y-8">
      {/* Game Over Dialog */}
      <Dialog open={showGameOver} onOpenChange={setShowGameOver}>
        <DialogContent className="bg-black/90 border-game-cyan">
          <DialogHeader>
            <DialogTitle className="text-2xl text-game-yellow flex items-center justify-center">
              <Trophy className="h-6 w-6 mr-2" /> Game Over!
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="text-lg text-white mb-2">
              {gameState.winner?.id === userId ? (
                <span className="text-game-yellow font-bold">You won the game!</span>
              ) : (
                <span>{gameState.winner?.username} won the game!</span>
              )}
            </div>
            <div className="flex items-center justify-center mt-8">
              <div className="relative">
                <Star className="absolute -top-6 -left-6 h-8 w-8 text-yellow-400 animate-pulse" />
                <Star className="absolute -top-4 -right-6 h-6 w-6 text-yellow-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="h-20 w-20 rounded-full bg-game-yellow/20 border-4 border-game-yellow flex items-center justify-center">
                  <span className="text-3xl font-bold text-game-yellow">{gameState.winner?.cards.length}</span>
                </div>
                <Star className="absolute -bottom-4 -right-6 h-7 w-7 text-yellow-300 animate-pulse" style={{ animationDelay: '1s' }} />
                <Star className="absolute -bottom-6 -left-6 h-5 w-5 text-yellow-400 animate-pulse" style={{ animationDelay: '1.5s' }} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Players counter and refresh button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-game-yellow" />
          <span className="text-sm font-medium text-game-yellow">
            {players.length} Player{players.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshGameState}
            disabled={isRefreshing}
            className="border-green-500 hover:bg-green-900/20"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Syncing..." : "Refresh Players"}
          </Button>

          {hasMultiplePlayers ? (
            <Badge className="bg-green-600 text-black">Multiplayer Active</Badge>
          ) : (
            <Badge className="bg-yellow-600 text-black">Waiting for players</Badge>
          )}
        </div>
      </div>

      {/* Central Card Pile */}
      <div className="glass-panel p-6 relative">
        <h3 className="text-lg font-semibold text-game-cyan mb-4">Central Pile</h3>
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
                  <span className="text-sm text-muted-foreground">+{gameState.centralPile.length - 5} more</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">No cards yet</div>
          )}
        </div>
        
        {gameState.lastMatchWinner && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-game-yellow text-black">
              Last match won by: {gameState.players.find(p => p.id === gameState.lastMatchWinner)?.username}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Game Controls */}
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
          disabled={!isUserTurn || gameState.isGameOver}
          className={isUserTurn 
            ? "bg-game-cyan hover:bg-game-cyan/80 text-black" 
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
          disabled={!isUserTurn || gameState.isGameOver}
          className={isUserTurn 
            ? "bg-game-magenta hover:bg-game-magenta/80 text-black" 
            : "bg-muted text-muted-foreground"}
          size="lg"
        >
          <Shuffle className="mr-2 h-5 w-5" />
          Shuffle
        </Button>
      </div>
      
      {/* Player Decks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((player) => (
          <PlayerDeck
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === currentPlayer?.id}
            isUser={player.id === userId}
            gameState={gameState}
          />
        ))}
      </div>
      
      {/* Add global styles for animations */}
      <style jsx global>{`
        @keyframes cardPulse {
          0% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0); }
        }
        
        @keyframes shuffleCard {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          25% { transform: translate(50px, -20px) rotate(45deg); opacity: 0.8; }
          50% { transform: translate(-50px, 20px) rotate(-90deg); opacity: 0.6; }
          75% { transform: translate(30px, 30px) rotate(180deg); opacity: 0.8; }
          100% { transform: translate(0, 0) rotate(360deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GameBoard;
