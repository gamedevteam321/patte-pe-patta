import React, { useState } from "react";
import { Card, Player } from "../../types/game";
import PlayingCard from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Clock, Coins, Timer, Award, ChevronDown, ChevronUp } from "lucide-react";

interface PlayerDeckProps {
  player: Player;
  position?: Player['position'];
  isCurrentPlayer?: boolean;
  isUser?: boolean;
  onCardClick?: (card: Card) => void;
  turnTimeRemaining?: number;
  className?: string;
}

const PlayerDeck: React.FC<PlayerDeckProps> = ({
  player,
  position = "bottom",
  isCurrentPlayer,
  isUser,
  onCardClick,
  turnTimeRemaining,
  className = ""
}) => {
  const [showCardStats, setShowCardStats] = useState(false);
  
  // Calculate score based on card count (in a real game, this might be more complex)
  const cardScore = player.cards?.length || 0;
  const hasCardsInDeck = player.cards && player.cards.length > 0;
  
  // Calculate fan effect for cards
  const getFanAngle = (index: number, total: number) => {
    if (total <= 1) return 0;
    
    // For positions with different card layouts
    switch(position) {
      case "top": return (index - (total - 1) / 2) * (total > 5 ? 5 : 8);
      case "top-left": return (index - (total - 1) / 2) * (total > 5 ? 5 : 8) - 15;
      case "top-right": return (index - (total - 1) / 2) * (total > 5 ? 5 : 8) + 15;
      case "bottom": return (index - (total - 1) / 2) * (total > 5 ? 5 : 8);
      case "left": return index * 3;
      case "right": return index * 3;
      default: return 0;
    }
  };

  // Card offset calculation
  const getCardOffset = (index: number, total: number) => {
    const baseOffset = total > 5 ? 15 : 20;
    switch(position) {
      case "left":
        return { x: 0, y: index * baseOffset };
      case "right":
        return { x: 0, y: index * baseOffset };
      default:
        return { x: 0, y: 0 };
    }
  };

  const getPositionStyles = (position: PlayerDeckProps['position']): string => {
    switch (position) {
      case 'bottom':
        return 'bottom-0';
      case 'top':
        return 'top-0';
      case 'top-left':
        return 'top-0 left-1/4';
      case 'top-right':
        return 'top-0 right-1/4';
      case 'left':
        return 'left-0 top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-0 top-1/2 -translate-y-1/2';
      default:
        return 'bottom-0';
    }
  };

  const getPositionLabel = (position: PlayerDeckProps['position']): string => {
    switch (position) {
      case 'bottom': return 'You';
      case 'top': return 'Top';
      case 'top-left': return 'Top-Left';
      case 'top-right': return 'Top-Right';
      case 'left': return 'Left';
      case 'right': return 'Right';
      default: return '';
    }
  };

  return (
    <div className={`flex flex-col items-center ${getPositionStyles(position)} ${isCurrentPlayer ? "player-active" : ""} ${className}`}>
      <div className={`flex items-center space-x-2 mb-2 p-2 rounded-full ${isCurrentPlayer ? "bg-blue-500/20 border border-blue-400" : ""}`}>
        <UserCircle className={`h-5 w-5 ${isCurrentPlayer ? "text-blue-400 animate-pulse" : "text-gray-400"}`} />
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${isCurrentPlayer ? "text-blue-300" : "text-white"}`}>
            {player.username}
          </span>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-orange-500/20 text-orange-300">
              <Award className="h-3 w-3 mr-1 text-yellow-400" />
              {cardScore} cards
            </Badge>
            <button 
              onClick={() => setShowCardStats(!showCardStats)} 
              className="text-gray-400 hover:text-gray-300 focus:outline-none"
            >
              {showCardStats ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
        {isCurrentPlayer && (
          <Badge variant="default" className="ml-1 bg-blue-600">
            <Timer className="h-3 w-3 mr-1" />
            Current
          </Badge>
        )}
        
        {/* Position indicator */}
        <Badge variant="outline" className="ml-1 text-xs bg-gray-800/70 text-gray-300 border-gray-600">
          {getPositionLabel(position)}
        </Badge>
      </div>
      
      {showCardStats && (
        <div className="mb-2 text-xs text-gray-300 bg-gray-800/50 p-1.5 rounded-md">
          <div className="flex justify-between gap-4">
            <span>Cards in deck: <strong className="text-blue-300">{player.cards?.length || 0}</strong></span>
            <span>Score: <strong className="text-green-300">{cardScore}</strong></span>
          </div>
          <div className="mt-1 pt-1 border-t border-gray-700 text-center">
            <span className="text-xs text-yellow-300">
              Acquire 3 matching cards to win!
            </span>
          </div>
        </div>
      )}

      <div className={`relative ${isCurrentPlayer ? "scale-105" : ""} transition-all duration-300`}>
        {hasCardsInDeck ? (
          <div className={`flex justify-center ${position === "left" || position === "right" ? "flex-col" : "flex-row"}`}>
            {player.cards.map((card, index) => {
              const fanAngle = getFanAngle(index, player.cards.length);
              const offset = getCardOffset(index, player.cards.length);
              
              return (
                <div
                  key={card.id}
                  className="relative inline-block card-in-deck"
                  style={{
                    transform: `rotate(${fanAngle}deg)`,
                    marginLeft: position !== "left" && position !== "right" ? (index === 0 ? 0 : -40) : 0,
                    marginTop: (position === "left" || position === "right") ? (index === 0 ? 0 : -60) : 0,
                    zIndex: index,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <PlayingCard 
                    card={card} 
                    isBack={!isUser}
                    className={`${isCurrentPlayer && index === 0 && isUser ? "first-card-highlight" : ""}`}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-400 p-4 border border-dashed border-gray-700 rounded-lg">No cards</div>
        )}
        
        {/* Card count badge */}
        {hasCardsInDeck && (
          <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-800 group">
            {player.cards.length}
            <span className="absolute -bottom-8 right-0 hidden group-hover:block bg-black/80 text-white text-xs p-1 rounded whitespace-nowrap">
              {player.username}'s deck
            </span>
          </div>
        )}
      </div>

      {turnTimeRemaining !== undefined && isCurrentPlayer && (
        <div className="mt-2">
          <Badge variant="outline" className={`text-xs ${turnTimeRemaining < 5000 ? "border-red-500 text-red-400 animate-pulse" : "border-green-500 text-green-400"}`}>
            <Clock className="h-3 w-3 mr-1" />
            {Math.ceil(turnTimeRemaining / 1000)}s
          </Badge>
        </div>
      )}
      
      <style>{`
        .player-active {
          position: relative;
        }
        .player-active::after {
          content: '';
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #3b82f6;
          animation: bounce 1s infinite;
        }
        .first-card-highlight {
          box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.6);
          transform: translateY(-5px);
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
        .card-in-deck:hover {
          transform: translateY(-8px) !important;
          z-index: 10 !important;
        }
      `}</style>
    </div>
  );
};

export default PlayerDeck;
