-- Add missing columns to rooms table
ALTER TABLE rooms
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS host_name TEXT,
ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Game Room',
ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 2 CHECK (max_players IN (2, 4)),
ADD COLUMN IF NOT EXISTS player_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_stack INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN rooms.host_id IS 'ID of the room host';
COMMENT ON COLUMN rooms.host_name IS 'Display name of the room host';
COMMENT ON COLUMN rooms.name IS 'Display name of the room';
COMMENT ON COLUMN rooms.max_players IS 'Maximum number of players allowed (2 or 4)';
COMMENT ON COLUMN rooms.player_count IS 'Current number of players in the room';
COMMENT ON COLUMN rooms.amount_stack IS 'Bet amount for the game';
COMMENT ON COLUMN rooms.is_private IS 'Whether the room requires a password to join';

-- Update existing rooms to have default values
UPDATE rooms 
SET 
    host_id = created_by,
    host_name = COALESCE((
        SELECT username 
        FROM profiles 
        WHERE profiles.id = rooms.created_by
    ), 'Unknown Host'),
    name = COALESCE(name, 'Game Room'),
    max_players = COALESCE(max_players, 2),
    player_count = COALESCE(player_count, 0),
    amount_stack = COALESCE(amount_stack, 0),
    is_private = COALESCE(is_private, false); 