
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
    <div className={`relative p-3 md:p-4 rounded-lg transition-all ${
      isCurrentPlayer ? "bg-accent/30 border border-accent" : 
      isUser ? "bg-accent/20 border border-accent/30" : "bg-black/30 border border-accent/50"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <UserCircle className={`h-5 w-5 md:h-6 md:w-6 mr-2 ${isUser ? "text-accent" : "text-accent/80"}`} />
          <span className={`font-semibold text-sm md:text-base ${isUser ? "text-accent" : "text-white"}`}>
            {player.username} {isUser && "(You)"}
          </span>
          {!isUser && (
            <Badge variant="outline" className="ml-2 text-xs bg-black/50 border-accent/50 text-accent/90">
              Online
            </Badge>
          )}
        </div>
        <Badge variant={isCurrentPlayer ? "default" : "outline"} className={
          isCurrentPlayer ? "bg-accent text-white text-xs md:text-sm" : "text-accent/90 text-xs md:text-sm"
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
          <div className="h-24 flex items-center justify-center text-accent/80">
            No cards left
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDeck;
