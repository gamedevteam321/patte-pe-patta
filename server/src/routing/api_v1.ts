import express, { Request, Response, Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import balanceRoutes from '../routes/balance.routes';

// Load environment variables
dotenv.config();

// Import controllers and middleware
import { gameController } from '../components/game/gameController';
import { authController, authMiddleware } from '../middleware/auth.middleware';

const router: Router = express.Router();

// Health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || '', 
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Check database connection
    const { data, error } = await supabase
      .from('game_rooms')
      .select('count')
      .limit(1);
    
    const status = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: error ? 'disconnected' : 'connected',
      version: '1.0.0'
    };
    
    res.json(status);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message
      });
    } else {
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: 'An unknown error occurred'
      });
    }
  }
});

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.post('/auth/logout', authController.logout);
router.get('/auth/verify', authController.verifyToken);

// Protected game routes
router.get('/games', authMiddleware, gameController.getGames);
router.post('/games', authMiddleware, gameController.createGame);
router.get('/games/:id', authMiddleware, gameController.getGame);
router.put('/games/:id', authMiddleware, gameController.updateGame);


router.use('/balance', balanceRoutes);
export default router; 