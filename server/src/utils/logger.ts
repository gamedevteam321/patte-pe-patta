import { Request } from 'express';
import winston from 'winston';
import path from 'path';
import 'winston-daily-rotate-file';

interface LogMetadata {
    [key: string]: any;
}

interface Logger {
    info(message: string, meta?: LogMetadata): void;
    error(message: string, error?: Error | string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    debug(message: string, meta?: LogMetadata): void;
}

const logDir = 'logs';

const balanceLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Balance-specific logs
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'balance-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'info'
        }),
        // Error logs
        new winston.transports.DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error'
        }),
        // Console output for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

export const logInfo = (message: string, meta?: LogMetadata) => {
    console.log(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...meta
    }));
};

export const logError = (message: string, error?: Error | string, meta?: LogMetadata) => {
    const errorDetails = error ? (error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
    } : error) : undefined;

    console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        error: errorDetails,
        ...meta
    }));
};

export const logWarn = (message: string, meta?: LogMetadata) => {
    console.warn(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...meta
    }));
};

export const logDebug = (message: string, meta?: LogMetadata) => {
    console.debug(JSON.stringify({
        level: 'debug',
        timestamp: new Date().toISOString(),
        message,
        ...meta
    }));
};

export const logBalanceOperation = (
    operation: string,
    userId: string,
    details: any
) => {
    balanceLogger.info('Balance Operation', {
        operation,
        userId,
        timestamp: new Date().toISOString(),
        ...details
    });
};

export const logBalanceError = (
    operation: string,
    userId: string,
    error: any,
    details?: any
) => {
    balanceLogger.error('Balance Error', {
        operation,
        userId,
        error: error.message || error,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...details
    });
};

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            logger?: Logger;
            requestId?: string;
        }
    }
}

export const logger = {
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
  info: (message: string) => {
    console.log(`[INFO] ${message}`);
  },
  warn: (message: string) => {
    console.warn(`[WARN] ${message}`);
  },
}; 