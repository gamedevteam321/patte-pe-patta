export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: number;  // Numeric rank value
  id: string;    // Unique identifier for the card
  value: string; // String representation of the card value
}

export interface Player {
  id: string;
  username: string;
  isReady: boolean;
  isHost: boolean;
  cards: Card[];
  position?: 'top' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom';
  isCurrentTurn: boolean;
  score?: number;
}

export interface GameState {
  players: Player[];
  centralPile: Card[];
  currentTurn: string;  // Player ID
  gameStatus: 'waiting' | 'playing' | 'finished';
  winner?: Player;
  lastPlayedCard?: Card;
}

// Room related types
export interface RoomData {
  id: string;
  name: string;
  hostName: string;
  maxPlayers: number;
  playerCount: number;
  isPrivate: boolean;
  betAmount: number;
  status: string;
  createdAt: string;
  code: string;
}

export interface Room {
  id: string;
  name: string;
  status: string;
  betAmount: number;
  hostName: string;
  isPrivate: boolean;
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
  code: string;
  players?: {
    id: string;
    username: string;
    isReady: boolean;
  }[];
} 