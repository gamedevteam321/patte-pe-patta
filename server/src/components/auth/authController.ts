import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Initialize Supabase clients - one with anon key for auth, one with service role for admin operations
const supabaseAuth = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_KEY || ''
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '', 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
const jwtSecret = process.env.JWT_SECRET || 'secret_2025';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest extends LoginRequest {
  username: string;
}

export const authController = {
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginRequest;
      
      // Try to sign in
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.log(error);
        // Return login failed message with status NG
        res.status(401).json({ 
          status: 'NG',
          error: 'Login failed: Invalid email or password' 
        });
        return;
      }
      
      // After successful login, check if profile exists
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      // If profile doesn't exist, create one
      if (profileError) {
        // Create a default profile
        await supabaseAdmin
          .from('profiles')
          .insert([{
            id: data.user.id,
            username: email.split('@')[0],
            avatar_url: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`
          }]);
      }
      
      // Successful login
      const mockUser = {
        id: data.user.id,
        username: email.split('@')[0],
        email,
        avatar: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`,
        coins: 1000,
        wins: 0,
        losses: 0
      };
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      res.json({
        status: 'OK',
        user: mockUser,
        token
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'NG',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  },

  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body as RegisterRequest;
      
      const { data, error } = await supabaseAuth.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;

      // Check if user exists
      if (!data?.user) {
        throw new Error('User not found after registration');
      }

      // Create a profile using admin client
      await supabaseAdmin
        .from('profiles')
        .insert([{
          id: data.user.id,
          username,
          avatar_url: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`
        }]);
      
      const mockUser = {
        id: data.user.id,
        username,
        email,
        avatar: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`,
        coins: 1000,
        wins: 0,
        losses: 0
      };
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: mockUser.id, email: mockUser.email },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      res.json({
        user: mockUser,
        token
      });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    try {
      const { error } = await supabaseAuth.auth.signOut();
      
      if (error) throw error;
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  },

  verifyToken: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }
      
      const decoded = jwt.verify(token, jwtSecret);
      
      // Get user data from Supabase
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      
      if (error || !user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      
      // Get profile data
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: profile?.username || user.email?.split('@')[0] || 'user'
        }
      });
    } catch (error) {
      res.status(401).json({ 
        error: error instanceof Error ? error.message : 'Invalid token'
      });
    }
  }
}; 