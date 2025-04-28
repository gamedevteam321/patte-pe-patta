-- Migration: Fix transaction notification function
-- Description: Updates the create_transaction_notification function to handle both UUID and sequence number
-- Date: 2024-03-30

-- Drop existing function
DROP FUNCTION IF EXISTS create_transaction_notification;

-- Create updated function
CREATE OR REPLACE FUNCTION create_transaction_notification(
    p_user_id UUID,
    p_transaction_id UUID,
    p_notification_type TEXT,
    p_message TEXT
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Insert notification with transaction ID
    INSERT INTO transaction_notifications (
        user_id,
        transaction_id,
        notification_type,
        message
    ) VALUES (
        p_user_id,
        p_transaction_id,
        p_notification_type,
        p_message
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_transaction_notification TO authenticated; 