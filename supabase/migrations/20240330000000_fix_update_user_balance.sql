-- This migration fixes the "CASE statement is missing ELSE part" error in update_user_balance

-- Drop and recreate the function with a simpler implementation
DROP FUNCTION IF EXISTS update_user_balance;

CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount INTEGER,
  p_balance_type TEXT,
  p_transaction_type TEXT,
  p_room_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Check if user has sufficient balance for deductions
  IF p_amount < 0 THEN
    IF p_balance_type = 'demo' THEN
      IF (SELECT demo_balance FROM user_balance WHERE user_id = p_user_id) + p_amount < 0 THEN
        RAISE EXCEPTION 'Insufficient demo balance';
      END IF;
    ELSE
      IF (SELECT real_balance FROM user_balance WHERE user_id = p_user_id) + p_amount < 0 THEN
        RAISE EXCEPTION 'Insufficient real balance';
      END IF;
    END IF;
  END IF;

  -- Insert transaction record
  INSERT INTO balance_transactions (
    user_id,
    transaction_type,
    amount,
    balance_type,
    room_id,
    metadata
  ) VALUES (
    p_user_id,
    p_transaction_type,
    p_amount,
    p_balance_type,
    p_room_id,
    p_metadata
  );

  -- Update balance
  IF p_balance_type = 'demo' THEN
    UPDATE user_balance
    SET demo_balance = demo_balance + p_amount
    WHERE user_id = p_user_id
    RETURNING demo_balance INTO new_balance;
  ELSE
    UPDATE user_balance
    SET real_balance = real_balance + p_amount
    WHERE user_id = p_user_id
    RETURNING real_balance INTO new_balance;
  END IF;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_balance TO authenticated; 