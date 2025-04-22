import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Add request ID to request object
    req.requestId = Array.isArray(requestId) ? requestId[0] : requestId;
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.requestId);
    
    // Add request ID to logger metadata
    req.logger = {
        info: (message: string, meta?: any) => console.log(`[${req.requestId}] ${message}`, meta),
        error: (message: string, error?: Error, meta?: any) => console.error(`[${req.requestId}] ${message}`, { error, ...meta }),
        warn: (message: string, meta?: any) => console.warn(`[${req.requestId}] ${message}`, meta),
        debug: (message: string, meta?: any) => console.debug(`[${req.requestId}] ${message}`, meta)
    };
    
    next();
}; 