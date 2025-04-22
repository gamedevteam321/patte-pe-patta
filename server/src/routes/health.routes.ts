import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Basic health check
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Database health check
router.get('/database', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT 1');
        client.release();
        
        res.json({
            status: 'ok',
            database: 'connected'
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            error: error.message
        });
    }
});

// System metrics
router.get('/metrics', (req, res) => {
    const metrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime(),
        activeConnections: pool.totalCount
    };
    
    res.json(metrics);
});

export default router; 