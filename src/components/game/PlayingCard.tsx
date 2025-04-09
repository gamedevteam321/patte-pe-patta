
import React from "react";
import { Card as CardType } from "@/context/SocketContext";

interface PlayingCardProps {
  card?: CardType;
  isBack?: boolean;
  className?: string;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ card, isBack = false, className = "" }) => {
  // If showing back of card or no card provided, render card back
  if (isBack || !card) {
    return (
      <div className={`card-back ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-game-magenta/30 flex items-center justify-center">
            <span className="text-xl font-bold text-white">♠</span>
          </div>
        </div>
      </div>
    );
  }

  // Determine card color based on suit
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const textColor = isRed ? "text-red-500" : "text-black";

  // Get suit symbol
  const suitSymbol = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠"
  }[card.suit];

  return (
    <div className={`card-front ${className}`}>
      <div className={`absolute top-1 left-1 text-xs font-bold ${textColor}`}>{card.rank}</div>
      <div className={`text-xl font-bold ${textColor}`}>{suitSymbol}</div>
      <div className={`absolute bottom-1 right-1 text-xs font-bold rotate-180 ${textColor}`}>{card.rank}</div>
    </div>
  );
};

export default PlayingCard;
