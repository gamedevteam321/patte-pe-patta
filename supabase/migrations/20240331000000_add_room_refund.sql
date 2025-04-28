-- Create the process_room_refund function
CREATE OR REPLACE FUNCTION process_room_refund(
    p_room_id UUID,
    p_user_id UUID,
    p_amount DECIMAL,
    p_balance_type TEXT,
    p_transaction_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_transaction_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Start a transaction
    BEGIN
        -- Insert the refund transaction
        INSERT INTO balance_transactions (
            id,
            user_id,
            amount,
            balance_type,
            transaction_type,
            status,
            metadata
        ) VALUES (
            p_transaction_id,
            p_user_id,
            p_amount,
            p_balance_type,
            'room_refund',
            'completed',
            jsonb_build_object('room_id', p_room_id)
        ) RETURNING id INTO v_transaction_id;

        -- Update user balance
        UPDATE user_balances
        SET balance = balance + p_amount,
            updated_at = NOW()
        WHERE user_id = p_user_id
        AND balance_type = p_balance_type
        RETURNING balance INTO v_new_balance;

        -- Insert notification
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            metadata,
            transaction_id
        ) VALUES (
            p_user_id,
            'room_refund',
            'Room Refund',
            'Your room entry fee has been refunded',
            jsonb_build_object(
                'room_id', p_room_id,
                'amount', p_amount,
                'balance_type', p_balance_type
            ),
            v_transaction_id
        );

        RETURN p_amount;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to process room refund: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 