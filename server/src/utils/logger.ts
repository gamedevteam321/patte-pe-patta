import { Request } from 'express';

interface LogMetadata {
    [key: string]: any;
}

interface Logger {
    info(message: string, meta?: LogMetadata): void;
    error(message: string, error?: Error | string, meta?: LogMetadata): void;
    warn(message: string, meta?: LogMetadata): void;
    debug(message: string, meta?: LogMetadata): void;
}

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

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            logger?: Logger;
            requestId?: string;
        }
    }
} 