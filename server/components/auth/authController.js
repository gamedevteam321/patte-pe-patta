const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const jwtSecret = process.env.JWT_SECRET || 'secret_2025';

const authController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.log(error);
        // Return login failed message with status NG
        return res.status(401).json({ 
          status: 'NG',
          error: 'Login failed: Invalid email or password' 
        });
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
        error: error.message 
      });
    }
  },

  register: async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (error) throw error;
      
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
      res.status(500).json({ error: error.message });
    }
  },

  logout: async (req, res) => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  verifyToken: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const decoded = jwt.verify(token, jwtSecret);
      
      // Get user data from Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.email.split('@')[0]
        }
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};

module.exports = authController; 