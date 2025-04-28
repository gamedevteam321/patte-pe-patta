-- Migration: Fix balance transaction sequence
-- Description: Adds a sequence for balance transactions and modifies the table to use it
-- Date: 2024-03-30

-- Create the sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS balance_transactions_id_seq;

-- Add a new column for the sequence number if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'balance_transactions' 
        AND column_name = 'sequence_number'
    ) THEN
        ALTER TABLE balance_transactions 
        ADD COLUMN sequence_number BIGINT DEFAULT nextval('balance_transactions_id_seq');
    END IF;
END $$;

-- Create an index on the sequence number for better performance if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_balance_transactions_sequence'
    ) THEN
        CREATE INDEX idx_balance_transactions_sequence ON balance_transactions(sequence_number);
    END IF;
END $$;

-- Modify the process_game_result_with_notification function to use the new sequence
CREATE OR REPLACE FUNCTION public.process_game_result_with_notification(
    p_user_id UUID,
    p_is_winner BOOLEAN,
    p_amount INTEGER,
    p_balance_type TEXT,
    p_room_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER AS $$
DECLARE
    v_bonus_multiplier DECIMAL(5,2);
    v_final_amount INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
    v_sequence_number BIGINT;
BEGIN
    -- Get VIP bonus multiplier
    SELECT bonus_multiplier INTO v_bonus_multiplier
    FROM vip_levels
    WHERE level = (
        SELECT vip_level
        FROM user_balance
        WHERE user_id = p_user_id
    );

    -- Calculate final amount with bonus
    v_final_amount := CASE
        WHEN p_is_winner THEN FLOOR(p_amount * v_bonus_multiplier)
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
            'bonus_multiplier', v_bonus_multiplier,
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
            'bonus_multiplier', v_bonus_multiplier,
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
            THEN format('You won %s %s coins! (Bonus: x%s)', v_final_amount, p_balance_type, v_bonus_multiplier)
            ELSE format('You lost %s %s coins', p_amount, p_balance_type)
        END
    );

    -- Update VIP level
    PERFORM update_vip_level(p_user_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_game_result_with_notification TO authenticated; 