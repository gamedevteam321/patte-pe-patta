
import React, { useEffect } from "react";
import { useSocket, GameState } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import PlayerDeck from "./PlayerDeck";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Shuffle, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GameBoardProps {
  userId: string;
}

const GameBoard: React.FC<GameBoardProps> = ({ userId }) => {
  const { gameState, playCard, shuffleDeck } = useSocket();

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
  
  // Separate real players from AI players for display purposes
  const realPlayers = gameState.players.filter(p => !p.id.startsWith('ai_player_'));
  const aiPlayers = gameState.players.filter(p => p.id.startsWith('ai_player_'));
  
  // Check if we have multiple human players
  const hasMultiplePlayers = realPlayers.length > 1;

  return (
    <div className="space-y-8">
      {/* Players counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="h-5 w-5 mr-2 text-game-yellow" />
          <span className="text-sm font-medium text-game-yellow">
            {realPlayers.length} Human Player{realPlayers.length !== 1 ? 's' : ''} + {aiPlayers.length} AI
          </span>
        </div>
        {hasMultiplePlayers && (
          <Badge className="bg-green-600 text-black">Multiplayer Mode</Badge>
        )}
        {realPlayers.length === 1 && (
          <Badge className="bg-yellow-600 text-black">Waiting for players to join</Badge>
        )}
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
            ? "bg-game-magenta hover:bg-game-magenta/80 text-black" 
            : "bg-muted text-muted-foreground"}
          size="lg"
        >
          <Shuffle className="mr-2 h-5 w-5" />
          Shuffle
        </Button>
      </div>
      
      {/* Player Decks - Human players first */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Human players first for better visibility */}
        {realPlayers.map((player) => (
          <PlayerDeck
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === currentPlayer?.id}
            isUser={player.id === userId}
          />
        ))}
        
        {/* AI players */}
        {aiPlayers.map((player) => (
          <PlayerDeck
            key={player.id}
            player={player}
            isCurrentPlayer={player.id === currentPlayer?.id}
            isUser={false}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;
