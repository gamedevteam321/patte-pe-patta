-- Migration: Fix player readiness table
-- Description: Drops and recreates the player_readiness table to ensure correct structure
-- Date: 2024-03-23

-- Drop existing table and related objects
DROP TABLE IF EXISTS player_readiness CASCADE;

-- Recreate player_readiness table
CREATE TABLE player_readiness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES auth.users(id),
    is_ready BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, player_id)
);

-- Create indexes
CREATE INDEX idx_player_readiness_room_id ON player_readiness(room_id);
CREATE INDEX idx_player_readiness_player_id ON player_readiness(player_id);

-- Enable RLS
ALTER TABLE player_readiness ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Add comments
COMMENT ON COLUMN player_readiness.is_ready IS 'Whether the player is ready to start the game'; 