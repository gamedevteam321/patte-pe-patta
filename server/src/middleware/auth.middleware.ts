import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verify, sign } from 'jsonwebtoken';
import { createHmac } from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';
import { User } from '../types/user';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const jwtSecret = process.env.JWT_SECRET || 'secret_2025';

export interface AuthenticatedRequest extends Request {
  user: User;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest extends LoginRequest {
  username: string;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if this is a public route that doesn't need authentication
    if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
      return next();
    }
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT token
    const decoded = verify(token, config.jwt.secret) as { sub: string };
    if (!decoded.sub) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch user data from Supabase profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.sub)
      .single();

    if (error || !profile) {
      logger.error('Error fetching user profile from Supabase', error);
      return res.status(401).json({ error: 'User not found' });
    }

    // Create user object from profile
    const user = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      avatar: profile.avatar_url,
      coins: profile.coins || 1000,
      wins: profile.wins || 0,
      losses: profile.losses || 0
    };

    // Verify request signature for sensitive operations
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const requestId = req.headers['x-request-id'] as string;
      const timestamp = req.headers['x-request-timestamp'] as string;
      const signature = req.headers['x-request-signature'] as string;

      if (!requestId || !timestamp || !signature) {
        return res.status(400).json({ error: 'Missing required headers' });
      }

      // Check if timestamp is within 5 minutes
      const requestTime = parseInt(timestamp);
      const currentTime = Date.now();
      if (Math.abs(currentTime - requestTime) > 5 * 60 * 1000) {
        return res.status(400).json({ error: 'Request timestamp expired' });
      }

      // Verify signature
      const expectedSignature = createHmac('sha256', config.jwt.secret)
        .update(`${requestId}:${timestamp}:${req.method}:${req.path}`)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn(`Invalid request signature for request ${requestId}`);
        return res.status(401).json({ error: 'Invalid request signature' });
      }
    }

    (req as AuthenticatedRequest).user = user as User;
    next();
  } catch (error) {
    logger.error('Authentication error', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const authController = {
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginRequest;
      
      if (!email || !password) {
        res.status(400).json({ 
          status: 'NG',
          error: 'Email and password are required' 
        });
        return;
      }
      
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        logger.error('Login failed', error);
        res.status(401).json({ 
          status: 'NG',
          error: 'Invalid email or password' 
        });
        return;
      }
      
      if (!data?.user) {
        res.status(401).json({ 
          status: 'NG',
          error: 'User not found' 
        });
        return;
      }
      
      // After successful login, check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      // If profile doesn't exist, create one
      if (profileError) {
        await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            username: email.split('@')[0],
            avatar_url: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`
          }]);
      }

      // Check if balance exists, if not create one
      const { data: balance, error: balanceError } = await supabase
        .from('user_balance')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (balanceError && balanceError.code === 'PGRST116') {
        await supabase
          .from('user_balance')
          .insert([{
            user_id: data.user.id,
            real_balance: 0,
            demo_balance: 1000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
      }
      
      // Create user object
      const user = {
        id: data.user.id,
        email: data.user.email,
        username: profile?.username || email.split('@')[0],
        avatar: profile?.avatar_url || `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`,
        coins: profile?.coins || 1000,
        wins: profile?.wins || 0,
        losses: profile?.losses || 0
      };
      
      // Generate JWT token with user ID as sub
      const token = sign(
        { sub: user.id },
        config.jwt.secret,
        { expiresIn: '24h' }
      );
      
      res.json({
        status: 'OK',
        user,
        token
      });
    } catch (error) {
      logger.error('Login error', error);
      res.status(500).json({ 
        status: 'NG',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  },

  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, email, password } = req.body as RegisterRequest;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;

      if (!data?.user) {
        throw new Error('User not found after registration');
      }

      // Create a profile
      await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          username,
          avatar_url: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`
        }]);

      // Create initial balance
      await supabase
        .from('user_balance')
        .insert([{
          user_id: data.user.id,
          real_balance: 0,
          demo_balance: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
      const token = sign(
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
      const { error } = await supabase.auth.signOut();
      
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
      
      const decoded = verify(token, jwtSecret);
      
      // Get user data from Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      
      // Get profile data
      const { data: profile } = await supabase
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