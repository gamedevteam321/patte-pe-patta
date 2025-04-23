-- Migration: Add process_room_entry function
-- Description: Creates the process_room_entry function for handling room entry fees
-- Date: 2024-03-30

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.process_room_entry;

-- Create the process_room_entry function
CREATE OR REPLACE FUNCTION public.process_room_entry(
    p_user_id UUID,
    p_room_id UUID,
    p_amount INTEGER,
    p_balance_type TEXT,
    p_transaction_id TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_new_balance INTEGER;
    v_current_balance INTEGER;
BEGIN
    -- Start transaction
    BEGIN
        -- Get current balance
        IF p_balance_type = 'demo' THEN
            SELECT demo_balance INTO v_current_balance
            FROM user_balance
            WHERE user_id = p_user_id;
        ELSE
            SELECT real_balance INTO v_current_balance
            FROM user_balance
            WHERE user_id = p_user_id;
        END IF;

        -- Check if user exists
        IF v_current_balance IS NULL THEN
            RAISE EXCEPTION 'User not found';
        END IF;

        -- Check if user has sufficient balance
        IF v_current_balance < p_amount THEN
            RAISE EXCEPTION 'Insufficient balance';
        END IF;

        -- Process balance update
        v_new_balance := update_user_balance(
            p_user_id,
            -p_amount, -- Negative amount for deduction
            p_balance_type,
            'room_entry',
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
            RAISE EXCEPTION 'Failed to process room entry: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_room_entry TO authenticated; 