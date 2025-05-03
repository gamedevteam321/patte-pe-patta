import { Router } from 'express';
import { supabase } from '../utils/supabase';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
    try {
        logInfo('Health check request received', {
            headers: req.headers,
            ip: req.ip
        });
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        logError('Health check failed', error as Error);
        res.status(500).json({ status: 'error', error: 'Health check failed' });
    }
});

// Database health check
router.get('/db', async (req, res) => {
    try {
        logInfo('Database health check request received', {
            headers: req.headers,
            ip: req.ip
        });
        const { data, error } = await supabase.from('user_balance').select('count').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
        const err = error as Error;
        logError('Database health check failed', err);
        res.status(500).json({
            status: 'error',
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// System metrics
router.get('/metrics', (req, res) => {
    try {
        logInfo('Metrics request received', {
            headers: req.headers,
            ip: req.ip
        });
        const metrics = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            cpu: process.cpuUsage(),
            timestamp: new Date().toISOString()
        };
        res.json({ status: 'ok', metrics });
    } catch (error) {
        logError('Metrics check failed', error as Error);
        res.status(500).json({ status: 'error', error: 'Metrics check failed' });
    }
});

export default router; 