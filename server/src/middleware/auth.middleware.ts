import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

interface User {
    id: string;
    email: string;
    role?: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Verify JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing authentication token'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as User;
        req.user = decoded;
    } catch (error) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid authentication token'
        });
    }

    // Verify request signature for sensitive operations
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const signature = req.headers['x-request-signature'];
        const timestamp = req.headers['x-request-timestamp'];
        
        if (!signature || !timestamp) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing request signature or timestamp'
            });
        }

        const data = `${req.method}${req.path}${JSON.stringify(req.body)}${timestamp}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.API_SECRET || '')
            .update(data)
            .digest('hex');

        if (signature !== expectedSignature) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid request signature'
            });
        }
    }

    next();
}; 