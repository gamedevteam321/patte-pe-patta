import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const cacheMiddleware = (duration: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;
        
        try {
            // Try to get cached response
            const cachedResponse = await redis.get(key);
            
            if (cachedResponse) {
                return res.json(JSON.parse(cachedResponse));
            }

            // Override res.json to cache the response
            const originalJson = res.json;
            res.json = function(body) {
                redis.setex(key, duration, JSON.stringify(body));
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            // If Redis fails, continue without caching
            next();
        }
    };
}; 