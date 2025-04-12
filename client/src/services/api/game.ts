import { apiClient } from './config';
import { GameRoom, CreateGameRoomRequest, GameState } from './types/game';

export const gameService = {
  getGames: async (): Promise<GameRoom[]> => {
    try {
      const response = await apiClient.get<GameRoom[]>('/games');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch games');
    }
  },

  createGame: async (data: CreateGameRoomRequest): Promise<GameRoom> => {
    try {
      const response = await apiClient.post<GameRoom>('/games', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create game');
    }
  },

  getGame: async (gameId: string): Promise<GameRoom> => {
    try {
      const response = await apiClient.get<GameRoom>(`/games/${gameId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch game');
    }
  },

  updateGame: async (gameId: string, data: Partial<GameRoom>): Promise<GameRoom> => {
    try {
      const response = await apiClient.put<GameRoom>(`/games/${gameId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update game');
    }
  },

  getGameState: async (roomId: string): Promise<GameState> => {
    try {
      const response = await apiClient.get<GameState>(`/games/${roomId}/state`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch game state');
    }
  }
}; 