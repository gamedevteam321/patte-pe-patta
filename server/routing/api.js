const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import controllers
const gameController = require('../components/game/gameController');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    
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
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Game routes
router.get('/games', gameController.getGames);
router.post('/games', gameController.createGame);
router.get('/games/:id', gameController.getGame);
router.put('/games/:id', gameController.updateGame);

module.exports = router; 