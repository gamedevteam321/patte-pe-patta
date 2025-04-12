const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const gameController = {
  getGames: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*');
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createGame: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .insert([req.body])
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getGame: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', req.params.id)
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateGame: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .update(req.body)
        .eq('id', req.params.id)
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = gameController; 