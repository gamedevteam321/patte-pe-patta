const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import controllers and middleware
const gameController = require('../components/game/gameController');
const authController = require('../components/auth/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Check database connection
    const { data, error } = await supabase
      .from('rooms')
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
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
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

module.exports = router; 