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

-- Create function to process VIP level up
CREATE OR REPLACE FUNCTION process_vip_level_up(
    p_user_id UUID,
    p_new_level INTEGER
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Insert transaction record
    INSERT INTO balance_transactions (
        user_id,
        transaction_type,
        amount,
        balance_type,
        metadata
    ) VALUES (
        p_user_id,
        'vip_level_up',
        0,
        'demo',
        jsonb_build_object(
            'new_level', p_new_level,
            'timestamp', NOW()
        )
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify update_vip_level function to use process_vip_level_up
CREATE OR REPLACE FUNCTION update_vip_level(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_total_games INTEGER;
    v_total_wins INTEGER;
    v_win_rate DECIMAL(5,2);
    v_new_level INTEGER;
    v_old_level INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get current stats
    SELECT total_games, total_wins, vip_level
    INTO v_total_games, v_total_wins, v_old_level
    FROM user_balance
    WHERE user_id = p_user_id;

    -- Calculate win rate
    v_win_rate := CASE 
        WHEN v_total_games > 0 THEN (v_total_wins::DECIMAL / v_total_games) * 100
        ELSE 0
    END;

    -- Find new VIP level
    SELECT level INTO v_new_level
    FROM vip_levels
    WHERE min_games <= v_total_games
    AND min_wins <= v_total_wins
    AND win_rate <= v_win_rate
    ORDER BY level DESC
    LIMIT 1;

    -- Update VIP level if changed
    IF v_new_level > v_old_level THEN
        -- Create transaction first
        v_transaction_id := process_vip_level_up(p_user_id, v_new_level);
        
        -- Update user balance
        UPDATE user_balance
        SET vip_level = v_new_level
        WHERE user_id = p_user_id;

        -- Create notification with transaction ID
        PERFORM create_transaction_notification(
            p_user_id,
            v_transaction_id,
            'vip_level_up',
            format('Congratulations! You reached VIP Level %s!', v_new_level)
        );
    END IF;

    RETURN COALESCE(v_new_level, v_old_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_vip_level_up TO authenticated;
GRANT EXECUTE ON FUNCTION update_vip_level TO authenticated; 