export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: number;  // Numeric rank value
  id: string;    // Unique identifier for the card
  value: string; // String representation of the card value
  isHitButton?: boolean; // Flag to indicate if card was played via hit button
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  cards: Card[];
  isHost?: boolean;
  isReady?: boolean;
  isActive?: boolean;
  autoPlayCount?: number;
  score?: number;  // Made optional since not all players will have a score immediately
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
export enum RoomType {
  CASUAL = 'casual',
  QUICK = 'quick',
  COMPETITIVE = 'competitive'
}

export interface RoomConfig {
  turnTime: number;
  gameDuration: number;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  shufflesAllowed: number;
  description: string;
  cardDistribution: {
    [key: string]: number;
  };
}

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
  roomType: RoomType;
  config: RoomConfig;
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
  roomType: RoomType;
  players?: {
    id: string;
    username: string;
    isReady: boolean;
  }[];
} 