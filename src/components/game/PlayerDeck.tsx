
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
      isCurrentPlayer ? "bg-game-cyan/10 border border-game-cyan" : "glass-panel"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <UserCircle className="h-6 w-6 mr-2 text-game-cyan" />
          <span className={`font-semibold ${isUser ? "text-game-yellow" : "text-white"}`}>
            {player.username} {isUser && "(You)"}
          </span>
        </div>
        <Badge variant={isCurrentPlayer ? "default" : "outline"} className={
          isCurrentPlayer ? "bg-game-cyan text-black" : ""
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
          <div className="h-24 flex items-center justify-center text-muted-foreground">
            No cards left
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerDeck;
