-- Migration: Remove VIP level functionality
-- Description: Removes VIP level related functions, tables, and dependencies
-- Date: 2024-03-30

-- Drop functions first to avoid dependency issues
DROP FUNCTION IF EXISTS process_vip_level_up(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_vip_level(UUID);

-- Remove vip_level column from users table
ALTER TABLE users DROP COLUMN IF EXISTS vip_level;

-- Remove min_vip_level from rooms table
ALTER TABLE rooms DROP COLUMN IF EXISTS min_vip_level;

-- Remove min_vip_level from tournaments table if it exists
ALTER TABLE tournaments DROP COLUMN IF EXISTS min_vip_level;

-- Drop the vip_levels table
DROP TABLE IF EXISTS vip_levels;

-- Clean up notifications
DELETE FROM notifications WHERE notification_type = 'vip_level_up';

-- Remove vip_level_up from notification_type enum if it exists
DO $$ 
BEGIN
    ALTER TYPE notification_type DROP VALUE IF EXISTS 'vip_level_up';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Remove vip_level_up from transaction_type enum if it exists
DO $$ 
BEGIN
    ALTER TYPE transaction_type DROP VALUE IF EXISTS 'vip_level_up';
EXCEPTION
    WHEN others THEN null;
END $$;

-- Update process_game_result function to remove vip_level dependencies
CREATE OR REPLACE FUNCTION process_game_result(
    p_room_id UUID,
    p_winner_id UUID,
    p_amount DECIMAL
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_balance_type TEXT;
BEGIN
    -- Get balance type from room
    SELECT balance_type INTO v_balance_type
    FROM rooms
    WHERE id = p_room_id;

    -- Insert transaction record
    INSERT INTO balance_transactions (
        user_id,
        transaction_type,
        amount,
        balance_type,
        room_id,
        metadata
    ) VALUES (
        p_winner_id,
        'game_win',
        p_amount,
        v_balance_type,
        p_room_id,
        jsonb_build_object(
            'room_id', p_room_id,
            'timestamp', NOW()
        )
    ) RETURNING id INTO v_transaction_id;

    -- Update user balance
    UPDATE user_balance
    SET 
        balance = balance + p_amount,
        total_wins = total_wins + 1,
        total_games = total_games + 1
    WHERE user_id = p_winner_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update process_game_result_with_notification to remove vip_level dependencies
CREATE OR REPLACE FUNCTION public.process_game_result_with_notification(
    p_user_id UUID,
    p_is_winner BOOLEAN,
    p_amount INTEGER,
    p_balance_type TEXT,
    p_room_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER AS $$
DECLARE
    v_final_amount INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
    v_sequence_number BIGINT;
BEGIN
    -- No VIP bonus multiplier anymore - use flat amount
    v_final_amount := CASE
        WHEN p_is_winner THEN p_amount
        ELSE -p_amount
    END;

    -- Update user stats
    UPDATE user_balance
    SET 
        total_games = total_games + 1,
        total_wins = total_wins + CASE WHEN p_is_winner THEN 1 ELSE 0 END,
        win_streak = CASE 
            WHEN p_is_winner THEN win_streak + 1
            ELSE 0
        END,
        max_win_streak = GREATEST(
            max_win_streak,
            CASE WHEN p_is_winner THEN win_streak + 1 ELSE 0 END
        )
    WHERE user_id = p_user_id;

    -- Process balance update and get transaction sequence
    INSERT INTO balance_transactions (
        user_id,
        transaction_type,
        amount,
        balance_type,
        room_id,
        metadata
    ) VALUES (
        p_user_id,
        CASE WHEN p_is_winner THEN 'game_win' ELSE 'game_loss' END,
        v_final_amount,
        p_balance_type,
        p_room_id,
        jsonb_build_object(
            'original_amount', p_amount,
            'metadata', p_metadata
        )
    ) RETURNING sequence_number INTO v_sequence_number;

    -- Update balance
    IF p_balance_type = 'demo' THEN
        UPDATE user_balance
        SET demo_balance = demo_balance + v_final_amount
        WHERE user_id = p_user_id
        RETURNING demo_balance INTO v_new_balance;
    ELSE
        UPDATE user_balance
        SET real_balance = real_balance + v_final_amount
        WHERE user_id = p_user_id
        RETURNING real_balance INTO v_new_balance;
    END IF;

    -- Record analytics event
    INSERT INTO analytics_events (
        user_id,
        event_type,
        event_data
    ) VALUES (
        p_user_id,
        'balance_change',
        jsonb_build_object(
            'amount', v_final_amount,
            'balance_type', p_balance_type,
            'transaction_type', CASE WHEN p_is_winner THEN 'game_win' ELSE 'game_loss' END,
            'room_id', p_room_id,
            'original_amount', p_amount,
            'metadata', p_metadata
        )
    );

    -- Create notification using the sequence number
    PERFORM create_transaction_notification(
        p_user_id,
        (SELECT id FROM balance_transactions WHERE sequence_number = v_sequence_number),
        CASE WHEN p_is_winner THEN 'win' ELSE 'loss' END,
        CASE WHEN p_is_winner 
            THEN format('You won %s %s coins!', v_final_amount, p_balance_type)
            ELSE format('You lost %s %s coins', p_amount, p_balance_type)
        END
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_game_result TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_game_result_with_notification TO authenticated;


