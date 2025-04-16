-- Add passkey column to rooms table (nullable)
ALTER TABLE rooms
ADD COLUMN passkey VARCHAR(6) NULL;

-- Add comment to explain the column
COMMENT ON COLUMN rooms.passkey IS '6-digit code for private rooms, NULL for public rooms';

-- Update existing private rooms to have a passkey
UPDATE rooms
SET passkey = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE is_private = true AND passkey IS NULL;

-- Add constraint to ensure passkey is 6 digits when present
ALTER TABLE rooms
ADD CONSTRAINT check_passkey_format 
CHECK (passkey IS NULL OR (passkey ~ '^[0-9]{6}$')); 