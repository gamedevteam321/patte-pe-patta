export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'ended';

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
}

export interface Player {
  id: string;
  name: string;
  cards: Card[];
  isReady: boolean;
  score: number;
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