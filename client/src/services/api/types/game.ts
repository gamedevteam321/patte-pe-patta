export interface GameRoom {
  id: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
  createdBy: string;
  createdAt: string;
}

export interface CreateGameRoomRequest {
  name: string;
  maxPlayers: number;
}

export interface GameState {
  roomId: string;
  players: {
    id: string;
    username: string;
    avatar: string;
    cards: number[];
    coins: number;
  }[];
  currentPlayer: string;
  status: 'waiting' | 'playing' | 'finished';
  winner?: string;
} 