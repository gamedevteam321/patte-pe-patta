
import React from "react";
import { Player, GameState } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Clock, AlertCircle } from "lucide-react";

interface PlayerDeckProps {
  player: Player;
  isCurrentPlayer: boolean;
  isUser: boolean;
  gameState?: GameState;
}

const PlayerDeck: React.FC<PlayerDeckProps> = ({ player, isCurrentPlayer, isUser, gameState }) => {
  const isGameStarted = gameState?.gameStarted || false;
  const isPlayerTurn = isCurrentPlayer && isGameStarted;
  
  // Calculate how much time is left for the current turn
  let turnTimeLeftPercent = 100;
  if (isPlayerTurn && gameState?.turnStartTime && gameState?.turnTimeLimit) {
    const timePassed = Date.now() - gameState.turnStartTime;
    const totalTime = gameState.turnTimeLimit * 1000;
    turnTimeLeftPercent = Math.max(0, 100 - (timePassed / totalTime * 100));
  }
  
  // Warning if player has auto-played once already
  const hasAutoPlayed = player.autoPlayCount > 0;
  
  return (
    <div className={`relative p-4 rounded-lg transition-all ${
      isPlayerTurn ? "bg-game-cyan/10 border border-game-cyan" : 
      isUser ? "bg-game-yellow/5 border border-game-yellow/30" : "glass-panel border border-green-500/30"
    }`}>
      {/* Time bar for current player's turn */}
      {isPlayerTurn && (
        <div className="absolute top-0 left-0 h-1 bg-game-cyan transition-all duration-100" 
          style={{ width: `${turnTimeLeftPercent}%` }} />
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <UserCircle className={`h-6 w-6 mr-2 ${isUser ? "text-game-yellow" : "text-green-500"}`} />
          <span className={`font-semibold ${isUser ? "text-game-yellow" : "text-white"}`}>
            {player.username} {isUser && "(You)"}
          </span>
          {!isUser && (
            <Badge variant="outline" className="ml-2 text-xs bg-green-800/30 border-green-500/50">
              Online Player
            </Badge>
          )}
          
          {hasAutoPlayed && (
            <Badge variant="outline" className="ml-2 text-xs bg-red-900/30 border-red-500/50 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
              Warning
            </Badge>
          )}
        </div>
        
        <Badge variant={isPlayerTurn ? "default" : "outline"} className={
          isPlayerTurn ? "bg-game-cyan text-black" : ""
        }>
          {isPlayerTurn ? (
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1 animate-pulse" />
              Turn
            </span>
          ) : (
            `${player.cards.length} cards`
          )}
        </Badge>
      </div>

      <div className="flex justify-center">
        {player.cards.length > 0 ? (
          <div className="relative h-24">
            {/* Show up to 3 card backs in a stack */}
            {[...Array(Math.min(3, player.cards.length))].map((_, i) => (
              <div
                key={i}
                className={`absolute ${isPlayerTurn ? 'animate-pulse' : ''}`}
                style={{
                  left: `${i * 10}px`,
                  zIndex: i,
                  transition: 'all 0.3s ease',
                  animation: isPlayerTurn ? `cardPulse 1.5s infinite ${i * 0.2}s` : 'none',
                }}
              >
                <PlayingCard 
                  isBack={!isUser} 
                  card={isUser ? player.cards[i] : undefined} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            No cards left
          </div>
        )}
      </div>
      
      {/* Show auto-play warning */}
      {hasAutoPlayed && (
        <div className="mt-2 text-center text-xs text-red-400">
          Missed {player.autoPlayCount} turn{player.autoPlayCount > 1 ? 's' : ''}. 
          {player.autoPlayCount === 1 && " One more miss and you'll be removed from the game."}
        </div>
      )}
    </div>
  );
};

export default PlayerDeck;
