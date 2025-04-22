import { gameRoomManager } from '../game';
import { logInfo, logError } from './logger';
import { GameError } from './errors';

export class CleanupManager {
  private static instance: CleanupManager;
  private cleanupTasks: Map<string, () => Promise<void>>;
  private isShuttingDown: boolean;

  private constructor() {
    this.cleanupTasks = new Map();
    this.isShuttingDown = false;
  }

  public static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  public registerTask(id: string, task: () => Promise<void>): void {
    if (this.isShuttingDown) {
      throw new GameError('SHUTDOWN_IN_PROGRESS', 'Cannot register new tasks during shutdown');
    }
    this.cleanupTasks.set(id, task);
  }

  public unregisterTask(id: string): void {
    this.cleanupTasks.delete(id);
  }

  public async cleanupRoom(roomId: string): Promise<void> {
    try {
      // Remove game instance
      gameRoomManager.deleteGame(roomId);
      
      // Execute any registered cleanup tasks for this room
      const roomTasks = Array.from(this.cleanupTasks.entries())
        .filter(([id]) => id.startsWith(`room:${roomId}`));
      
      await Promise.all(roomTasks.map(([id, task]) => {
        this.cleanupTasks.delete(id);
        return task();
      }));

      logInfo(`Successfully cleaned up room: ${roomId}`);
    } catch (error) {
      logError(`Error cleaning up room: ${roomId}`, error as Error);
      throw error;
    }
  }

  public async cleanupAll(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logInfo('Starting global cleanup...');

    try {
      // Execute all cleanup tasks
      const tasks = Array.from(this.cleanupTasks.values());
      await Promise.all(tasks.map(task => task()));
      
      // Clear all tasks
      this.cleanupTasks.clear();
      
      logInfo('Global cleanup completed successfully');
    } catch (error) {
      logError('Error during global cleanup', error as Error);
      throw error;
    } finally {
      this.isShuttingDown = false;
    }
  }

  public getActiveTasks(): string[] {
    return Array.from(this.cleanupTasks.keys());
  }
} 