import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import dotenv from 'dotenv';
import { socketHandler } from './components/socket/socketHandler';
import { createClient } from '@supabase/supabase-js';
import { ServerShutdownHandler } from './utils/ServerShutdownHandler';
import { logInfo } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Configure CORS
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Initialize Socket.io with CORS settings
const io = new Server(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  cookie: false
} as Partial<ServerOptions>);

// Test Supabase connection before starting server
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

// Set fetch timeout for Supabase
const originalFetch = global.fetch;
// Use any to avoid TypeScript errors with the fetch types
global.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const { signal } = controller;
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const newInit = init ? { ...init, signal } : { signal };
    const response = await originalFetch(input, newInit);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Verify Supabase connection before starting server
async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('rooms').select('count');
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    console.log('Successfully connected to Supabase. Rooms count:', data);
    return true;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
}

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.send('Game Server API is running');
});

// API Routes
import apiV1Router from './routing/api_v1';
app.use('/api/v1', apiV1Router);

// Initialize socket handlers
socketHandler(io);

// Initialize shutdown handler
const shutdownHandler = ServerShutdownHandler.getInstance();
shutdownHandler.initialize(server);

// Start server
const PORT = process.env.PORT || 3000;

(async () => {
  // Test connection with retry
  let connected = false;
  let retries = 0;
  
  while (!connected && retries < 3) {
    connected = await testSupabaseConnection();
    if (!connected) {
      console.log(`Connection attempt ${retries + 1} failed. Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      retries++;
    }
  }
  
  if (!connected) {
    console.warn('Warning: Server starting without verified Supabase connection');
  }
  
  server.listen(PORT, () => {
    logInfo(`Server running on port ${PORT}`);
  });
})(); 