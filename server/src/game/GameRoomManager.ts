import { GameStateManager } from './GameStateManager';
import { GameState, Player, Card } from '../types/game';
import { GameError } from '../utils/errors';
import { logError, logInfo } from '../utils/logger';

export class GameRoomManager {
  private gameInstances: Map<string, GameStateManager>;

  constructor() {
    this.gameInstances = new Map();
  }

  public createGame(roomId: string, initialPlayers: Player[]): void {
    if (this.gameInstances.has(roomId)) {
      throw new GameError('ROOM_EXISTS', 'Game room already exists');
    }

    const gameManager = new GameStateManager(roomId, initialPlayers);
    this.gameInstances.set(roomId, gameManager);
    logInfo(`Created new game room: ${roomId}`);
  }

  public getGameState(roomId: string): GameState {
    const gameManager = this.gameInstances.get(roomId);
    if (!gameManager) {
      throw new GameError('ROOM_NOT_FOUND', 'Game room not found');
    }

    return gameManager.getState();
  }

  public setPlayerReady(roomId: string, playerId: string): void {
    const gameManager = this.gameInstances.get(roomId);
    if (!gameManager) {
      throw new GameError('ROOM_NOT_FOUND', 'Game room not found');
    }

    try {
      gameManager.setPlayerReady(playerId);
    } catch (error) {
      logError(`Error setting player ready in room ${roomId}`, error as Error);
      throw error;
    }
  }

  public playCard(roomId: string, playerId: string, card: Card): void {
    const gameManager = this.gameInstances.get(roomId);
    if (!gameManager) {
      throw new GameError('ROOM_NOT_FOUND', 'Game room not found');
    }

    try {
      gameManager.playCard(playerId, card);
    } catch (error) {
      logError(`Error playing card in room ${roomId}`, error as Error);
      throw error;
    }
  }

  public addPlayer(roomId: string, player: Player): void {
    const gameManager = this.gameInstances.get(roomId);
    if (!gameManager) {
      throw new GameError('ROOM_NOT_FOUND', 'Game room not found');
    }

    try {
      gameManager.addPlayer(player);
    } catch (error) {
      logError(`Error adding player to room ${roomId}`, error as Error);
      throw error;
    }
  }

  public removePlayer(roomId: string, playerId: string): void {
    const gameManager = this.gameInstances.get(roomId);
    if (!gameManager) {
      throw new GameError('ROOM_NOT_FOUND', 'Game room not found');
    }

    try {
      gameManager.removePlayer(playerId);
    } catch (error) {
      logError(`Error removing player from room ${roomId}`, error as Error);
      throw error;
    }
  }

  public deleteGame(roomId: string): void {
    if (!this.gameInstances.has(roomId)) {
      throw new GameError('ROOM_NOT_FOUND', 'Game room not found');
    }

    this.gameInstances.delete(roomId);
    logInfo(`Deleted game room: ${roomId}`);
  }
} 