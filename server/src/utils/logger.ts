import winston from 'winston';
import { GameError } from './errors';

// Define log format
const logFormat = winston.format.printf((info: winston.Logform.TransformableInfo) => {
  const { level, message, timestamp, ...metadata } = info;
  let msg = `${timestamp} [${level}]: ${message}`;
  if (metadata.error) {
    const error = metadata.error as Error;
    msg += `\n${error.stack || error.message}`;
  }
  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Export logging functions
export const logError = (error: Error | GameError, context?: string) => {
  logger.error(context || 'Error occurred', { error });
};

export const logInfo = (message: string, metadata?: Record<string, unknown>) => {
  logger.info(message, metadata);
};

export const logDebug = (message: string, metadata?: Record<string, unknown>) => {
  logger.debug(message, metadata);
};

export default logger; 