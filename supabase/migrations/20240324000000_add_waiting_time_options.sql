-- Migration: Add waiting time options to rooms
-- Description: Adds waiting time options with specific time intervals
-- Date: 2024-03-24

-- First, drop the existing waiting_time column if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'rooms' 
        AND column_name = 'waiting_time'
    ) THEN
        ALTER TABLE rooms DROP COLUMN waiting_time;
    END IF;
END $$;

-- Add waiting_time column with specific options
ALTER TABLE rooms
ADD COLUMN waiting_time INTEGER NOT NULL DEFAULT 60
CONSTRAINT rooms_waiting_time_check 
CHECK (waiting_time IN (30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630, 660, 690, 720, 750, 780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1200, 1230, 1260, 1290, 1320, 1350, 1380, 1410, 1440, 1470, 1500, 1530, 1560, 1590, 1620, 1650, 1680, 1710, 1740, 1770, 1800));

-- Add comment to explain the waiting time options
COMMENT ON COLUMN rooms.waiting_time IS 'Time in seconds to wait before auto-starting the game. Options: 30s, 1min, 1min30s, 2min, ..., up to 30min'; 