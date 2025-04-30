-- Migration: Add room type support
-- Description: Adds room type and configuration columns to rooms table
-- Date: 2024-04-01

-- Add room_type column to rooms table
ALTER TABLE rooms
ADD COLUMN room_type TEXT NOT NULL DEFAULT 'casual'
CHECK (room_type IN ('casual', 'quick', 'competitive'));

-- Add config column to store room configuration
ALTER TABLE rooms
ADD COLUMN config JSONB NOT NULL DEFAULT '{
    "turnTime": 15000,
    "gameDuration": 300000,
    "maxPlayers": 4,
    "minBet": 50,
    "maxBet": 10000,
    "shufflesAllowed": 2,
    "description": "Relaxed gameplay with longer turn times",
    "cardDistribution": {
        "2": 26,
        "3": 17,
        "4": 13
    }
}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN rooms.room_type IS 'Type of room: casual, quick, or competitive';
COMMENT ON COLUMN rooms.config IS 'JSON configuration for room settings';

-- Set default room type and config for existing rooms
UPDATE rooms 
SET 
    room_type = 'casual',
    config = CASE
        WHEN room_type = 'casual' THEN '{
            "turnTime": 15000,
            "gameDuration": 300000,
            "maxPlayers": 4,
            "minBet": 50,
            "maxBet": 10000,
            "shufflesAllowed": 2,
            "description": "Relaxed gameplay with longer turn times",
            "cardDistribution": {
                "2": 26,
                "3": 17,
                "4": 13
            }
        }'::jsonb
        WHEN room_type = 'quick' THEN '{
            "turnTime": 10000,
            "gameDuration": 180000,
            "maxPlayers": 4,
            "minBet": 50,
            "maxBet": 10000,
            "shufflesAllowed": 1,
            "description": "Fast-paced games with quick turns",
            "cardDistribution": {
                "2": 26,
                "3": 17,
                "4": 13
            }
        }'::jsonb
        WHEN room_type = 'competitive' THEN '{
            "turnTime": 20000,
            "gameDuration": 480000,
            "maxPlayers": 4,
            "minBet": 50,
            "maxBet": 10000,
            "shufflesAllowed": 1,
            "description": "High-stakes games with strategic gameplay",
            "cardDistribution": {
                "2": 26,
                "3": 17,
                "4": 13
            }
        }'::jsonb
    END;

-- Add constraint to ensure bet amount is within valid range
ALTER TABLE rooms
ADD CONSTRAINT check_bet_amount
CHECK (amount_stack BETWEEN 50 AND 10000); 