import { Router } from 'express';
import { supabase } from '../utils/supabase';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

// Database health check
router.get('/db', async (req, res) => {
    try {
        const { data, error } = await supabase.from('user_balance').select('count').limit(1);
        if (error) throw error;
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
});

// System metrics
router.get('/metrics', (req, res) => {
    const metrics = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
    };
    res.json({ status: 'ok', metrics });
});

export default router; 