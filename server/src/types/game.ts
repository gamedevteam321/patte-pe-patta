export enum GamePhase {
  WAITING = 'waiting',
  READY = 'ready',
  PLAYING = 'playing',
  COMPLETED = 'completed'
}

export enum RoomType {
  CASUAL = 'casual',
  QUICK = 'quick',
  COMPETITIVE = 'competitive'
}

export interface RoomConfig {
  turnTime: number;        // Time per turn in milliseconds
  gameDuration: number;    // Total game duration in milliseconds
  initialCards: number;    // Number of cards per player at start
  maxPlayers: number;      // Maximum players allowed
  minBet: number;         // Minimum bet amount
  maxBet: number;         // Maximum bet amount
  shufflesAllowed: number; // Number of shuffles allowed per player
  description: string;     // Description of the room type
}

export const roomConfigs: Record<RoomType, RoomConfig> = {
  [RoomType.CASUAL]: {
    turnTime: 15000,        // 15 seconds per turn
    gameDuration: 300000,   // 5 minutes
    initialCards: 5,        // 5 cards per player
    maxPlayers: 4,
    minBet: 50,
    maxBet: 10000,
    shufflesAllowed: 2,
    description: "Relaxed gameplay with longer turn times"
  },
  [RoomType.QUICK]: {
    turnTime: 5000,        // 55 seconds per turn
    gameDuration: 180000,   // 3 minutes
    initialCards: 7,        // 7 cards per player
    maxPlayers: 4,
    minBet: 50,
    maxBet: 10000,
    shufflesAllowed: 1,
    description: "Fast-paced games with quick turns"
  },
  [RoomType.COMPETITIVE]: {
    turnTime: 20000,        // 20 seconds per turn
    gameDuration: 480000,   // 8 minutes
    initialCards: 10,       // 10 cards per player
    maxPlayers: 4,
    minBet: 50,
    maxBet: 10000,
    shufflesAllowed: 1,
    description: "High-stakes games with more initial cards"
  }
};

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  id?: string;
  rank?: number;
}

export interface Player {
  id: string;
  userId: string;
  username: string;
  isHost: boolean;
  isReady: boolean;
  cards: Card[];
  score: number;
  isActive: boolean;
  autoPlayCount: number;
  shuffleCount: number;
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  lastPlayedCard: Card | null;
  lastPlayedPlayer: string | null;
  lastSyncTime: number;
} 