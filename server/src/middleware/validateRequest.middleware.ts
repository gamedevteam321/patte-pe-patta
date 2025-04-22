import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'express-validator';

export const validateRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Validate request body
    if (req.body && typeof req.body === 'object') {
        // Remove any undefined or null values
        Object.keys(req.body).forEach(key => {
            if (req.body[key] === undefined || req.body[key] === null) {
                delete req.body[key];
            }
        });
    }

    // Validate content type for POST/PUT requests
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
        return res.status(415).json({
            error: 'Unsupported Media Type',
            message: 'Content-Type must be application/json'
        });
    }

    // Validate required headers
    const requiredHeaders = ['x-request-id'];
    const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
    
    if (missingHeaders.length > 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: `Missing required headers: ${missingHeaders.join(', ')}`
        });
    }

    next();
}; 