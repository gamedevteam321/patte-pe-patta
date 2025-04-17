-- Create room_history table
CREATE TABLE IF NOT EXISTS room_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('join', 'leave', 'reconnect')),
    socket_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS room_history_room_id_idx ON room_history(room_id);
CREATE INDEX IF NOT EXISTS room_history_user_id_idx ON room_history(user_id);
CREATE INDEX IF NOT EXISTS room_history_created_at_idx ON room_history(created_at);

-- Add RLS policies
ALTER TABLE room_history ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own history
CREATE POLICY "Users can view their own room history"
    ON room_history FOR SELECT
    USING (auth.uid() = user_id);

-- Allow service role to insert history records
CREATE POLICY "Service role can insert room history"
    ON room_history FOR INSERT
    WITH CHECK (true); 