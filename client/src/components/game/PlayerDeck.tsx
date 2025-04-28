import React, { useState } from "react";
import { Card, Player } from "../../types/game";
import PlayingCard from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Clock, Coins, Timer, Award, ChevronDown, ChevronUp, Send, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlayerDeckProps {
  player: Player;
  position?: Player['position'];
  isCurrentPlayer?: boolean;
  isUser?: boolean;
  onCardClick?: (card: Card) => void;
  turnTimeRemaining?: number;
  className?: string;
  gameState?: any;
  isUserTurn?: boolean;
  actionsDisabled?: boolean;
  handleShuffleDeck?: () => void;
  MAX_SHUFFLE_COUNT?: number;
  MAX_TURN_TIME?: number;
}

const PlayerDeck: React.FC<PlayerDeckProps> = ({
  player,
  position = "bottom",
  isCurrentPlayer,
  isUser,
  onCardClick,
  turnTimeRemaining,
  className = "",
  gameState,
  isUserTurn,
  actionsDisabled,
  handleShuffleDeck,
  MAX_SHUFFLE_COUNT,
  MAX_TURN_TIME
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
      <div className={`relative ${isCurrentPlayer ? "scale-105" : ""} transition-all duration-300`}>
        {hasCardsInDeck ? (
          <div className={`flex justify-center ${position === "left" || position === "right" ? "flex-col" : "flex-row"}`}>
            {/* Show only one card */}
            <div className="relative inline-block card-in-deck">
              <PlayingCard 
                card={player.cards[0]} 
                isBack={!isUser}
                className={`${isCurrentPlayer && isUser ? "first-card-highlight" : ""}`}
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-400 p-4 border border-dashed border-gray-700 rounded-lg">No cards</div>
        )}
        
        {/* Card count badge */}
        {hasCardsInDeck && (
          <div className="absolute -top-4 -right-4 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-gray-800 group">
            {player.cards.length}
            <span className="absolute -bottom-8 right-0 hidden group-hover:block bg-black/80 text-white text-xs p-1 rounded whitespace-nowrap">
              {player.username}'s deck
            </span>
          </div>
        )}

        {/* Username display for non-left/right positions */}
        {turnTimeRemaining !== undefined && isCurrentPlayer && !["left", "right"].includes(position) && (
          <div className="absolute -left-44 top-1/2 -translate-y-1/2 mr-4">
            <div className={`flex flex-col items-center space-y-1 p-2 rounded-full ${isCurrentPlayer ? "bg-blue-500/20 border border-blue-400" : ""}`}>
              <div className="flex items-center space-x-2">
                <UserCircle className={`h-4 w-4 ${isCurrentPlayer ? "text-blue-400 animate-pulse" : "text-gray-400"}`} />
                <span className={`text-xs font-medium ${isCurrentPlayer ? "text-blue-300" : "text-white"}`}>
                  {player.username}
                </span>
              </div>
            </div>
            {!!player.autoPlayCount && (player.autoPlayCount > 0) && (
              <div className="mt-2 bg-red-500/20 border border-red-400/30 rounded-full px-4 py-1 whitespace-nowrap min-w-[120px] text-center">
                <span className="text-xs text-red-300">
                  Auto-play: {player.autoPlayCount}/2
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {turnTimeRemaining !== undefined && isCurrentPlayer && (
        <div className="mt-2 w-full max-w-[120px]">
          <div className="text-center">
            <span className="text-xs text-gray-300">
              {Math.ceil(turnTimeRemaining / 1000)}s
            </span>
          </div>
        </div>
      )}

      {showCardStats && (
        <div className="mb-2 text-xs text-gray-300 bg-gray-800/50 p-1.5 rounded-md">
          <div className="flex justify-between gap-4">
            <span>Cards in deck: <strong className="text-blue-300">{player.cards?.length || 0}</strong></span>
            <span>Score: <strong className="text-green-300">{cardScore}</strong></span>
          </div>
          <div className="mt-1 pt-1 border-t border-gray-700 text-center">
            <span className="text-xs text-yellow-300">
              Acquire 1 matching cards to win!
            </span>
          </div>
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

      {/* Hit and Shuffle buttons for left and right players */}
      {(position === "left" || position === "right") && isUser && gameState?.gameStarted && (
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 flex flex-col space-y-2">
          <Button
            onClick={() => onCardClick?.(player.cards[0])}
            disabled={!isUserTurn || actionsDisabled}
            className={`hit-button ${isUserTurn && !actionsDisabled
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600'
              } text-white transition-colors duration-200`}
          >
            <Send className="h-4 w-4 mr-2" />
            Your Turn - Hit!
          </Button>

          <Button
            onClick={handleShuffleDeck}
            disabled={!isUserTurn || actionsDisabled || (player?.shuffleCount ?? 0) >= 2}
            className={`${isUserTurn && !actionsDisabled && (player?.shuffleCount ?? 0) < 2
              ? 'bg-[#4169E1] hover:bg-[#3158c4]'
              : 'bg-gray-600'
              } text-white`}
          >
            <Shuffle className="h-5 w-5 mr-1" />
            Shuffle ({MAX_SHUFFLE_COUNT - (player?.shuffleCount ?? 0)} left)
          </Button>
        </div>
      )}

      {/* Name and autoplay count for left and right players */}
      {(position === "left" || position === "right") && (
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="flex items-center space-x-2 bg-blue-500/20 border border-blue-400 rounded-full px-3 py-1">
            <UserCircle className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">
              {player.username}
            </span>
          </div>
          {!!player.autoPlayCount && (player.autoPlayCount > 0) && (
            <div className="mt-2 bg-red-500/20 border border-red-400/30 rounded-full px-4 py-1 whitespace-nowrap min-w-[120px] text-center">
              <span className="text-xs text-red-300">
                Auto-play: {player.autoPlayCount}/2
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerDeck;
