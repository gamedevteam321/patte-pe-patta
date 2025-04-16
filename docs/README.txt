Patte Pe Patta - Multiplayer Card Game
=====================================

Project Overview
---------------
Patte Pe Patta is a real-time multiplayer card game built with modern web technologies. The game allows players to create rooms, join games, and play in real-time with other players.

Tech Stack
----------
Frontend:
- React + TypeScript
- Vite
- Socket.IO Client
- Tailwind CSS
- Shadcn UI Components
- React Router v6
- React Query
- Zustand (State Management)

Backend:
- Node.js + Express
- TypeScript
- Socket.IO Server
- Supabase (PostgreSQL)
- JWT Authentication

Database:
- Supabase (PostgreSQL)
- Real-time subscriptions
- Row Level Security
- Profiles and Game History Tables

Project Structure
----------------
/client
├── src/
│   ├── components/     # React components
│   │   ├── game/      # Game-related components
│   │   ├── rooms/     # Room management
│   │   ├── auth/      # Authentication components
│   │   └── ui/        # Reusable UI components
│   ├── context/       # React Context providers
│   ├── pages/         # Application pages
│   ├── services/      # API services
│   ├── hooks/         # Custom React hooks
│   ├── store/         # Zustand stores
│   └── lib/           # Utilities and types

/server
├── src/
│   ├── components/    # Core server components
│   │   ├── socket/   # Socket.IO handlers
│   │   └── auth/     # Authentication handlers
│   ├── middleware/    # Express middleware
│   ├── routing/       # API routes
│   └── helpers/       # Utility functions
├── types/            # TypeScript type definitions
└── config/           # Configuration files

Key Features
-----------
1. Authentication
   - User registration and login
   - Session management with JWT
   - Protected routes
   - Profile management
   - Avatar customization

2. Room Management
   - Create public/private rooms
   - Join rooms by code
   - Room listing and filtering
   - Player capacity management
   - Room chat functionality
   - Player ready system

3. Game Features
   - Real-time card game
   - Turn-based gameplay
   - Card matching mechanics
   - Score tracking
   - Game state synchronization
   - Auto-play for inactive players
   - Match animations
   - Game history tracking

4. Real-time Communication
   - Live game updates
   - Player status
   - Chat functionality
   - Match notifications
   - Room events
   - Connection recovery

Game Rules
---------
1. Players take turns playing cards
2. Match the top card's value to collect the pile
3. Last player with cards wins
4. Time limits for turns (15 seconds)
5. Auto-play for inactive players
6. Collect all cards on a match
7. Game ends when one player has all cards

Development Setup
---------------
1. Clone the repository
2. Install dependencies:
   - Client: cd client && npm install
   - Server: cd server && npm install
3. Set up environment variables:
   - Create .env files in both client and server
   - Configure Supabase credentials
   - Set JWT secret
4. Start development servers:
   - Client: npm run dev
   - Server: npm run dev

Deployment
---------
1. Client:
   - Build: npm run build
   - Deploy to static hosting (Vercel/Netlify)

2. Server:
   - Build: npm run build
   - Deploy to Node.js hosting (Heroku/DigitalOcean)

3. Database:
   - Supabase cloud hosting
   - Configure production environment variables
   - Set up Row Level Security policies

Security Features
---------------
1. JWT authentication
2. Protected API routes
3. Socket authentication
4. Input validation
5. Rate limiting
6. Row Level Security in Supabase
7. Password hashing
8. Session management

Performance Optimizations
-----------------------
1. Optimized WebSocket connections
2. Efficient state updates
3. Lazy loading components
4. Caching strategies
5. Connection recovery
6. Error handling
7. Type safety with TypeScript

Error Handling
------------
1. Socket disconnections
2. API failures
3. Game state inconsistencies
4. Network issues
5. Invalid actions
6. Authentication errors
7. Room management errors

Contributing
-----------
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

License
-------
MIT License

Contact
-------
For any queries or support, please contact the development team. 