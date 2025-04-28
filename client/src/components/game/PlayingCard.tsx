import React from "react";
import { Card } from "@/context/SocketContext";

interface PlayingCardProps {
  card?: Card;
  isBack?: boolean;
  className?: string;
  isMatched?: boolean;
}

const PlayingCard: React.FC<PlayingCardProps> = ({ card, isBack = false, className = "", isMatched = false }) => {
  if (!card && !isBack) {
    return null;
  }

  if (isBack) {
    return (
      <div className={`w-16 h-24 rounded-lg shadow-lg border-2 border-white/20 flex items-center justify-center ${className}`} style={{
        backgroundImage: 'url(/cardback.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
      </div>
    );
  }

  const getSuitColor = (suit: string) => {
    return suit === "♥" || suit === "♦" || suit === "hearts" || suit === "diamonds" 
      ? "text-red-500" 
      : "text-black";
  };

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "♥": return "♥";
      case "♦": return "♦";
      case "♣": return "♣";
      case "♠": return "♠";
      case "hearts": return "♥";
      case "diamonds": return "♦";
      case "clubs": return "♣";
      case "spades": return "♠";
      default: return suit;
    }
  };

  return (
    <div className={`w-16 h-24 bg-white rounded-lg shadow-lg border-2 border-gray-200 flex flex-col p-1 ${className} ${isMatched ? 'animate-card-match' : ''}`}>
      <div className="flex justify-between items-start">
        <div className={`text-sm font-bold ${getSuitColor(card.suit)}`}>
          {card.value}
        </div>
        <div className={`text-sm ${getSuitColor(card.suit)}`}>
          {getSuitSymbol(card.suit)}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className={`text-2xl ${getSuitColor(card.suit)}`}>
          {getSuitSymbol(card.suit)}
        </div>
      </div>
      <div className="flex justify-between items-end">
        <div className={`text-sm ${getSuitColor(card.suit)}`}>
          {getSuitSymbol(card.suit)}
        </div>
        <div className={`text-sm font-bold ${getSuitColor(card.suit)}`}>
          {card.value}
        </div>
      </div>
    </div>
  );
};

export default PlayingCard;
