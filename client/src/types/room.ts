import { Player } from './player';
import { GameState } from './game';

export interface RoomData {
  id: string;
  name: string;
  password?: string;
  players: Player[];
  maxPlayers: number;
  gameState?: GameState;
  betAmount?: number;
  amount_stack?: number;
} 