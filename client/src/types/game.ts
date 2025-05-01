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
  maxBet: number;
  minBet: number;
  turnTime: number;
  maxPlayers: number;
  description: string;
  gameDuration?: number;
  shufflesAllowed?: number;
  cardDistribution?: {
    [key: string]: number;
  };
}

export interface RoomData {
  id: string;
  name: string;
  roomName: string;
  hostName: string;
  host_name: string;
  host_id: string;
  max_players: number;
  player_count: number;
  isPrivate: boolean;
  is_private: boolean;
  betAmount?: number;
  amount_stack?: number;
  status: string;
  created_at: string;
  updated_at: string;
  code: string;
  room_type: string;
  game_mode: string;
  is_demo_mode: boolean;
  min_balance: number;
  waiting_time: number;
  passkey?: string | null;
  password?: string | null;
  current_turn: string | null;
  created_by: string;
  config: {
    maxBet: number;
    minBet: number;
    turnTime: number;
    maxPlayers: number;
    description: string;
  };
  gameState?: GameState;
  players?: Player[];
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