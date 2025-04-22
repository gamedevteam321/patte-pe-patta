import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(400, message);
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string) {
        super(401, message);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string) {
        super(403, message);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(404, message);
    }
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: {
                message: err.message,
                code: err.statusCode,
                timestamp: new Date().toISOString()
            }
        });
    }

    // Handle unexpected errors
    return res.status(500).json({
        error: {
            message: 'Internal server error',
            code: 500,
            timestamp: new Date().toISOString()
        }
    });
}; 