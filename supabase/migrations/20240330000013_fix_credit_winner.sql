-- Migration: Fix credit winner functionality
-- Description: Updates process_game_result_with_notification to work without VIP levels
-- Date: 2024-03-30

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.process_game_result_with_notification TO authenticated; 