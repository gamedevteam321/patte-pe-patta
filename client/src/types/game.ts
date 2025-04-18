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
  userId: string;
  username: string;
  cards: Card[];
  isReady: boolean;
  score: number;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right';
  shuffleCount: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  centralPile: Card[];
  lastMatchWinner?: string;
  isGameOver: boolean;
  winner?: Player;
  gameStarted: boolean;
  gameStartTime?: number;
  turnEndTime?: number;
  roomDuration?: number;
  status: 'waiting' | 'ready' | 'in_progress';
  requiredPlayers: number;
  matchAnimation?: {
    isActive: boolean;
    cardId: string;
    playerId: string;
  };
  waitingStartTime: number;
  waitingTimer: number;
  autoStartEnabled: boolean;
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
  gameState: GameState;
  players?: {
    id: string;
    username: string;
    isReady: boolean;
  }[];
} 