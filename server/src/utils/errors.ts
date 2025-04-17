export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class ValidationError extends GameError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends GameError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RoomError extends GameError {
  constructor(message: string, details?: any) {
    super('ROOM_ERROR', message, 400, details);
    this.name = 'RoomError';
  }
}

export class DatabaseError extends GameError {
  constructor(message: string, details?: any) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class SocketError extends GameError {
  constructor(message: string, details?: any) {
    super('SOCKET_ERROR', message, 500, details);
    this.name = 'SocketError';
  }
}

export function isGameError(error: any): error is GameError {
  return error instanceof GameError;
}

export function createErrorResponse(error: any) {
  if (isGameError(error)) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }
  };
} 