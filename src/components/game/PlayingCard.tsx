
import React from "react";
import { Card as CardType } from "@/context/SocketContext";

interface PlayingCardProps {
  card?: CardType;
  isBack?: boolean;
  className?: string;
  isMatched?: boolean;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ card, isBack = false, className = "", isMatched = false }) => {
  // If showing back of card or no card provided, render card back
  if (isBack || !card) {
    return (
      <div className={`card-back ${className} bg-[#142836] border border-white/10 rounded-md w-16 h-24 relative flex items-center justify-center shadow`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#0088cc]/30 flex items-center justify-center">
            <span className="text-xl font-bold text-white">♠</span>
          </div>
        </div>
      </div>
    );
  }

  // Determine card color based on suit
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const textColor = isRed ? "text-red-500" : "text-black";
  
  // Card animation class for matched cards
  const matchedClass = isMatched ? "animate-card-play" : "";

  // Get suit symbol
  const suitSymbol = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠"
  }[card.suit];

  return (
    <div className={`card-front ${className} ${matchedClass} bg-white border border-gray-200 rounded-md w-16 h-24 relative flex items-center justify-center shadow`}>
      <div className={`absolute top-1 left-1 text-xs font-bold ${textColor}`}>{card.rank}</div>
      <div className={`text-xl font-bold ${textColor}`}>{suitSymbol}</div>
      <div className={`absolute bottom-1 right-1 text-xs font-bold rotate-180 ${textColor}`}>{card.rank}</div>
    </div>
  );
};

export default PlayingCard;
