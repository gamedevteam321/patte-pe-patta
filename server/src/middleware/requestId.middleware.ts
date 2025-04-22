import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Add request ID to request object
    req.requestId = requestId;
    
    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);
    
    // Add request ID to logger metadata
    req.logger = {
        info: (message: string, meta?: any) => console.log(`[${requestId}] ${message}`, meta),
        error: (message: string, error?: Error, meta?: any) => console.error(`[${requestId}] ${message}`, { error, ...meta }),
        warn: (message: string, meta?: any) => console.warn(`[${requestId}] ${message}`, meta),
        debug: (message: string, meta?: any) => console.debug(`[${requestId}] ${message}`, meta)
    };
    
    next();
}; 