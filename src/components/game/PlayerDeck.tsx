
import React from "react";
import { Player } from "@/context/SocketContext";
import PlayingCard from "./PlayingCard";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Clock } from "lucide-react";

interface PlayerDeckProps {
  player: Player;
  isCurrentPlayer: boolean;
  isUser: boolean;
}

const PlayerDeck: React.FC<PlayerDeckProps> = ({ player, isCurrentPlayer, isUser }) => {
  return (
    <div className={`relative p-4 rounded-lg transition-all ${
      isCurrentPlayer ? "bg-blue-900/30 border border-blue-500" : 
      isUser ? "bg-blue-800/20 border border-blue-400/30" : "glass-panel border border-blue-900/50"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <UserCircle className={`h-6 w-6 mr-2 ${isUser ? "text-blue-400" : "text-blue-300"}`} />
          <span className={`font-semibold ${isUser ? "text-blue-300" : "text-white"}`}>
            {player.username} {isUser && "(You)"}
          </span>
          {!isUser && (
            <Badge variant="outline" className="ml-2 text-xs bg-blue-900/50 border-blue-700/50 text-blue-200">
              Online Player
            </Badge>
          )}
        </div>
        <Badge variant={isCurrentPlayer ? "default" : "outline"} className={
          isCurrentPlayer ? "bg-blue-500 text-white" : "text-blue-200"
        }>
          {isCurrentPlayer ? (
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
                className="absolute"
                style={{
                  left: `${i * 10}px`,
                  zIndex: i,
                }}
              >
                <PlayingCard isBack={true} />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-blue-300">
            No cards left
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDeck;
