
import React from "react";
import { Player } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Clock, Coins } from "lucide-react";

interface PlayerDeckProps {
  player: Player;
  isCurrentPlayer: boolean;
  isUser: boolean;
  position?: "top" | "left" | "right" | "bottom";
}

const PlayerDeck: React.FC<PlayerDeckProps> = ({ player, isCurrentPlayer, isUser, position = "bottom" }) => {
  // Get player profile color based on position or status
  const getProfileColor = () => {
    if (isUser) return "bg-game-blue text-white";
    
    switch(position) {
      case "top": return "bg-red-500 text-white";
      case "left": return "bg-blue-600 text-white";
      case "right": return "bg-orange-500 text-white";
      default: return "bg-yellow-600 text-white border-2 border-yellow-400";
    }
  };

  // Layout classes based on position
  const getContainerClasses = () => {
    switch(position) {
      case "top":
        return "flex flex-col items-center";
      case "left":
      case "right":
        return "flex flex-row items-center";
      default: // bottom
        return "flex flex-col items-center";
    }
  };

  // Card layout classes based on position
  const getCardClasses = () => {
    switch(position) {
      case "left":
      case "right":
        return "ml-4"; // Add margin for side positions
      default:
        return "mt-2"; // Add margin for top/bottom positions
    }
  };

  return (
    <div className={`${getContainerClasses()} p-2`}>
      {/* Player Avatar */}
      <div className={`relative rounded-full w-16 h-16 flex items-center justify-center ${getProfileColor()} ${isCurrentPlayer ? 'ring-2 ring-yellow-400' : ''}`}>
        <span className="text-2xl font-bold">P</span>
        {isCurrentPlayer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
            <Clock className="h-3 w-3 text-black" />
          </div>
        )}
      </div>
      
      {/* Player Name */}
      <div className="text-center text-white mt-1 text-sm font-medium">
        {player.username} {isUser && "(You)"}
      </div>
      
      {/* Cards Count Badge */}
      <div className="flex items-center space-x-2 mt-1">
        <Badge variant="outline" className="text-white text-xs border-white/20 bg-[#0B0C10]/80">
          {player.cards.length} cards
        </Badge>
        {player.coins !== undefined && (
          <Badge variant="outline" className="text-yellow-300 border-yellow-500/30 flex items-center text-xs">
            <Coins className="h-3 w-3 mr-1 text-yellow-400" />
            {player.coins}
          </Badge>
        )}
      </div>
      
      {/* Cards */}
      <div className={`relative ${getCardClasses()}`}>
        {(position === "left" || position === "right") ? (
          // Horizontal layout for left/right positions
          <div className="h-24 w-16">
            <PlayingCard isBack={true} />
          </div>
        ) : (
          // Default vertical layout
          player.cards.length > 0 ? (
            <div className="h-24">
              {/* Show up to 3 card backs in a stack */}
              {[...Array(Math.min(1, player.cards.length))].map((_, i) => (
                <div key={i} className="absolute" style={{ left: `${i * 5}px`, zIndex: i }}>
                  <PlayingCard isBack={true} />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-white/60">
              No cards
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default PlayerDeck;
