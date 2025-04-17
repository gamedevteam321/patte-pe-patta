import { Server } from 'http';
import { CleanupManager } from './CleanupManager';
import { logInfo, logError } from './logger';

export class ServerShutdownHandler {
  private static instance: ServerShutdownHandler;
  private server: Server | null = null;
  private isShuttingDown: boolean = false;

  private constructor() {}

  public static getInstance(): ServerShutdownHandler {
    if (!ServerShutdownHandler.instance) {
      ServerShutdownHandler.instance = new ServerShutdownHandler();
    }
    return ServerShutdownHandler.instance;
  }

  public initialize(server: Server): void {
    this.server = server;

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (error) => this.handleUncaughtException(error));
    process.on('unhandledRejection', (reason) => this.handleUnhandledRejection(reason));
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logInfo(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new connections
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server!.close(() => {
            logInfo('HTTP server closed');
            resolve();
          });
        });
      }

      // Clean up resources
      const cleanupManager = CleanupManager.getInstance();
      await cleanupManager.cleanupAll();

      logInfo('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logError(error as Error, 'Error during graceful shutdown');
      process.exit(1);
    }
  }

  private handleUncaughtException(error: Error): void {
    logError(error, 'Uncaught Exception');
    this.gracefulShutdown('uncaughtException').catch(() => {
      process.exit(1);
    });
  }

  private handleUnhandledRejection(reason: unknown): void {
    logError(new Error(`Unhandled Rejection: ${reason}`), 'Unhandled Rejection');
    this.gracefulShutdown('unhandledRejection').catch(() => {
      process.exit(1);
    });
  }
} 