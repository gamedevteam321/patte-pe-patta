-- Migration: Add Room Refund Functionality
-- Description: Adds functionality to refund room creator if no other players join
-- Date: 2024-03-31

-- Create function to process room refund
CREATE OR REPLACE FUNCTION public.process_room_refund(
    p_room_id UUID,
    p_user_id UUID,
    p_amount INTEGER,
    p_balance_type TEXT,
    p_transaction_id TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Start transaction
    BEGIN
        -- Process balance update (refund)
        v_new_balance := update_user_balance(
            p_user_id,
            p_amount, -- Positive amount for refund
            p_balance_type,
            'room_refund',
            p_room_id,
            jsonb_build_object(
                'room_id', p_room_id,
                'amount', p_amount,
                'transaction_id', p_transaction_id
            )
        );

        RETURN v_new_balance;
    EXCEPTION 
        WHEN OTHERS THEN
            -- Log the error details
            RAISE EXCEPTION 'Failed to process room refund: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_room_refund TO authenticated;

-- Add room_refund to allowed transaction types
ALTER TABLE balance_transactions
    DROP CONSTRAINT IF EXISTS balance_transactions_transaction_type_check;

ALTER TABLE balance_transactions
    ADD CONSTRAINT balance_transactions_transaction_type_check
    CHECK (transaction_type IN (
        'deposit', 'withdrawal', 'game_win', 'game_loss', 
        'room_entry', 'room_exit', 'room_refund', 'referral_bonus', 
        'daily_bonus', 'achievement_bonus', 'tournament_entry', 
        'tournament_prize', 'event_bonus'
    )); 