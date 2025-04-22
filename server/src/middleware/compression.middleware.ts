import compression from 'compression';
import { Request, Response, NextFunction } from 'express';

export const compressionMiddleware = compression({
    level: 6, // Compression level (0-9)
    filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    threshold: 1024 // Only compress responses larger than 1KB
}); 