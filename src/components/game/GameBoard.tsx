
import React from "react";
import { useSocket, GameState } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Send, Shuffle } from "lucide-react";

interface GameBoardProps {
  userId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const { gameState, playCard, shuffleDeck } = useSocket();

  if (!gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-64 glass-panel">
        <div className="text-xl font-semibold text-game-cyan mb-4">Loading game...</div>
        <div className="animate-pulse text-muted-foreground">Please wait while the game loads</div>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isUserTurn = currentPlayer?.id === userId;

  return (
    <div className="space-y-8">
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
          onClick={playCard}
          disabled={!isUserTurn}
          className={isUserTurn 
            ? "bg-game-cyan hover:bg-game-cyan/80 text-black" 
            : "bg-muted text-muted-foreground"}
          size="lg"
        >
          <Send className="mr-2 h-5 w-5" />
          Play Card
        </Button>
        
        <Button
          onClick={shuffleDeck}
          disabled={!isUserTurn}
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
        {gameState.players.map((player) => (
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
