import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key to bypass RLS
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

export const gameController = {
  getGames: async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*');
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  },

  createGame: async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([req.body])
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  },

  getGame: async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', req.params.id)
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  },

  updateGame: async (req: Request, res: Response): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update(req.body)
        .eq('id', req.params.id)
        .select();
      
      if (error) throw error;
      res.json(data[0]);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  }
}; 