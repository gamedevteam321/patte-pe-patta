-- Migration: Add player readiness and waiting time
-- Description: Adds player readiness tracking and waiting time to rooms
-- Date: 2024-03-22

-- Drop existing table if it exists to ensure clean state
DROP TABLE IF EXISTS player_readiness CASCADE;

-- Add waiting_time column to rooms table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rooms' 
        AND column_name = 'waiting_time'
    ) THEN
        ALTER TABLE rooms
        ADD COLUMN waiting_time INTEGER NOT NULL DEFAULT 60; -- Default 60 seconds
    END IF;
END $$;

-- Create player_readiness table
CREATE TABLE player_readiness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES auth.users(id),
    is_ready BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

-- Create index for better performance
CREATE INDEX idx_player_readiness_room_id ON player_readiness(room_id);
CREATE INDEX idx_player_readiness_player_id ON player_readiness(player_id);

-- Enable RLS on player_readiness table
ALTER TABLE player_readiness ENABLE ROW LEVEL SECURITY;

-- Create policies for player_readiness
DROP POLICY IF EXISTS "Anyone can read player readiness" ON player_readiness;
DROP POLICY IF EXISTS "Players can update their own readiness" ON player_readiness;
DROP POLICY IF EXISTS "Players can create their own readiness" ON player_readiness;

CREATE POLICY "Anyone can read player readiness" ON player_readiness
  FOR SELECT USING (true);

CREATE POLICY "Players can update their own readiness" ON player_readiness
  FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Players can create their own readiness" ON player_readiness
  FOR INSERT WITH CHECK (auth.uid() = player_id);

-- Create trigger for updated_at
CREATE TRIGGER update_player_readiness_updated_at
  BEFORE UPDATE ON player_readiness
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to columns for documentation
COMMENT ON COLUMN rooms.waiting_time IS 'Time in seconds to wait before auto-starting the game';
COMMENT ON COLUMN player_readiness.is_ready IS 'Whether the player is ready to start the game'; 