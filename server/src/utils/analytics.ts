import { Request } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

interface AnalyticsEvent {
    type: string;
    user_id?: string | null;
    ip_address: string;
    user_agent: string;
    path: string;
    method: string;
    status_code: number;
    response_time: number;
    metadata?: Record<string, any> | null;
}

export const trackEvent = async (event: AnalyticsEvent) => {
    try {
        await pool.query(
            `INSERT INTO analytics_events 
            (type, user_id, ip_address, user_agent, path, method, status_code, response_time, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                event.type,
                event.user_id || null,
                event.ip_address,
                event.user_agent,
                event.path,
                event.method,
                event.status_code,
                event.response_time,
                event.metadata ? JSON.stringify(event.metadata) : null
            ]
        );
    } catch (error) {
        console.error('Failed to track analytics event:', error);
    }
};

export const trackRequest = (req: Request, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        
        trackEvent({
            type: 'request',
            user_id: req.user?.id || null,
            ip_address: req.ip || 'unknown',
            user_agent: req.headers['user-agent'] || 'unknown',
            path: req.path,
            method: req.method,
            status_code: res.statusCode,
            response_time: duration,
            metadata: {
                query: req.query,
                params: req.params,
                body: req.body
            }
        });
    });

    next();
};

export const trackError = (error: Error, req: Request) => {
    trackEvent({
        type: 'error',
        user_id: req.user?.id || null,
        ip_address: req.ip || 'unknown',
        user_agent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        method: req.method,
        status_code: 500,
        response_time: 0,
        metadata: {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        }
    });
}; 