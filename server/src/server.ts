import express, { Request, Response, Application, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server, ServerOptions } from 'socket.io';
import dotenv from 'dotenv';
import { socketHandler } from './components/socket/socketHandler';
import { supabase } from './utils/supabase';
import { ServerShutdownHandler } from './utils/ServerShutdownHandler';
import { logInfo, logError } from './utils/logger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import balanceRoutes from './routes/balance.routes';
import compression from 'compression';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { validateRequestMiddleware } from './middleware/validateRequest.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import healthCheck from './routes/health.routes';
import apiV1Router from './routing/api_v1';

// Load environment variables
dotenv.config();

const app: Application = express();
const server = createServer(app);

// Security middleware
app.use(helmet());

// Request ID middleware for tracking
app.use(requestIdMiddleware);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
const compressionMiddleware = compression({
    level: 6,
    threshold: 1024,
    filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
});
app.use(compressionMiddleware);

// Configure CORS
const corsOptions = {
    origin: ['http://localhost:8080', 'http://192.168.1.15:8080'], // Specific origins instead of wildcard
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-request-id'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Cache preflight requests for 10 minutes
};

// Enable CORS for all routes
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // increased from 100 to 1000
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// Apply rate limiting to all routes except auth
app.use((req, res, next) => {
    // Skip rate limiting for auth routes during development
    if (req.path.includes('/auth/')) {
        return next();
    }
    
    // Apply rate limiting to other routes
    limiter(req, res, next);
});

// Request validation
app.use(validateRequestMiddleware);

// Request timeout
app.use((req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(30000, () => {
        logError('Request timeout', undefined, {
            request: {
                url: req.url,
                method: req.method,
                ip: req.ip
            }
        });
        res.status(504).json({ error: 'Request timeout' });
    });
    next();
});

// Health check endpoint
app.use('/health', healthCheck);

// API Routes
app.use('/api/v1', apiV1Router);


// Error handling
app.use(errorHandler);

// Initialize Socket.io with CORS settings
const io = new Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    cookie: false
} as Partial<ServerOptions>);

// Initialize socket handlers
socketHandler(io);

// Initialize shutdown handler
const shutdownHandler = ServerShutdownHandler.getInstance();
shutdownHandler.initialize(server);

// Start server
const PORT = process.env.PORT || 3000;

(async () => {
    try {
        // Test Supabase connection
        const { data, error } = await supabase.from('user_balance').select('count').limit(1);
        if (error) throw error;
        logInfo('Database connection established');
        
        server.listen(PORT, () => {
            logInfo(`Server running on port ${PORT}`);
        });
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logError('Failed to start server', err);
        process.exit(1);
    }
})();

// Graceful shutdown
process.on('SIGTERM', () => {
    logInfo('SIGTERM received. Shutting down gracefully...');
    shutdownHandler.shutdown();
});

process.on('SIGINT', () => {
    logInfo('SIGINT received. Shutting down gracefully...');
    shutdownHandler.shutdown();
}); 