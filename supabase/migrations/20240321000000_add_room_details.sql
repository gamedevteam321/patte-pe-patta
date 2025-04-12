-- Migration: Add room details
-- Description: Adds amount stack and max players fields to rooms table
-- Date: 2024-03-21

-- First, check if columns don't exist to make migration idempotent
DO $$ 
BEGIN
    -- Add amount_stack column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rooms' 
        AND column_name = 'amount_stack'
    ) THEN
        ALTER TABLE rooms
        ADD COLUMN amount_stack INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add max_players column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rooms' 
        AND column_name = 'max_players'
    ) THEN
        ALTER TABLE rooms
        ADD COLUMN max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players IN (2, 4));
    END IF;
END $$;

-- Update existing rooms to have default values
UPDATE rooms 
SET 
    amount_stack = COALESCE(amount_stack, 0),
    max_players = COALESCE(max_players, 2)
WHERE 
    amount_stack IS NULL 
    OR max_players IS NULL;

-- Add comment to columns for documentation
COMMENT ON COLUMN rooms.amount_stack IS 'The amount of stack required to enter the game room';
COMMENT ON COLUMN rooms.max_players IS 'Maximum number of players allowed in the room (2 or 4)'; 