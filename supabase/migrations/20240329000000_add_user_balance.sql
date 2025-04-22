-- Migration: Add user balance system
-- Description: Adds user balance table with demo and real money support
-- Date: 2024-03-29

-- Create user_balance table with separate demo and real money columns
CREATE TABLE user_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    demo_balance INTEGER NOT NULL DEFAULT 1000, -- Start with 1000 demo coins
    real_balance INTEGER NOT NULL DEFAULT 0,    -- Start with 0 real coins
    daily_demo_limit INTEGER NOT NULL DEFAULT 10000, -- Maximum daily demo balance
    daily_real_limit INTEGER NOT NULL DEFAULT 1000,  -- Maximum daily real balance
    withdrawal_limit INTEGER NOT NULL DEFAULT 100,   -- Maximum withdrawal per transaction
    referral_bonus INTEGER NOT NULL DEFAULT 100,     -- Bonus for referring new users
    referral_count INTEGER NOT NULL DEFAULT 0,       -- Number of successful referrals
    vip_level INTEGER NOT NULL DEFAULT 0,            -- VIP level (0-10)
    total_wins INTEGER NOT NULL DEFAULT 0,           -- Total number of games won
    total_games INTEGER NOT NULL DEFAULT 0,          -- Total number of games played
    win_streak INTEGER NOT NULL DEFAULT 0,           -- Current win streak
    max_win_streak INTEGER NOT NULL DEFAULT 0,       -- Maximum win streak achieved
    last_daily_reward TIMESTAMP WITH TIME ZONE,      -- Last time daily reward was claimed
    daily_reward_streak INTEGER NOT NULL DEFAULT 0,  -- Consecutive days of claiming daily reward
    tournament_points INTEGER NOT NULL DEFAULT 0,    -- Points earned in tournaments
    seasonal_points INTEGER NOT NULL DEFAULT 0,      -- Points earned in current season
    total_seasonal_points INTEGER NOT NULL DEFAULT 0, -- Total points earned across all seasons
    last_season_reset TIMESTAMP WITH TIME ZONE,      -- Last time seasonal points were reset
    is_suspicious BOOLEAN NOT NULL DEFAULT false,    -- Flag for suspicious activity
    last_security_check TIMESTAMP WITH TIME ZONE,    -- Last time security check was performed
    loyalty_points INTEGER NOT NULL DEFAULT 0,       -- Points earned in loyalty program
    total_loyalty_points INTEGER NOT NULL DEFAULT 0, -- Total loyalty points earned
    chat_level INTEGER NOT NULL DEFAULT 1,           -- Chat level (1-10)
    chat_points INTEGER NOT NULL DEFAULT 0,          -- Points earned from chat activity
    last_chat_reward TIMESTAMP WITH TIME ZONE,       -- Last time chat reward was claimed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_demo_balance CHECK (demo_balance >= 0),
    CONSTRAINT positive_real_balance CHECK (real_balance >= 0),
    CONSTRAINT positive_daily_demo_limit CHECK (daily_demo_limit >= 0),
    CONSTRAINT positive_daily_real_limit CHECK (daily_real_limit >= 0),
    CONSTRAINT positive_withdrawal_limit CHECK (withdrawal_limit >= 0),
    CONSTRAINT positive_referral_bonus CHECK (referral_bonus >= 0),
    CONSTRAINT positive_referral_count CHECK (referral_count >= 0),
    CONSTRAINT valid_vip_level CHECK (vip_level >= 0 AND vip_level <= 10),
    CONSTRAINT positive_wins CHECK (total_wins >= 0),
    CONSTRAINT positive_games CHECK (total_games >= 0),
    CONSTRAINT positive_win_streak CHECK (win_streak >= 0),
    CONSTRAINT positive_max_win_streak CHECK (max_win_streak >= 0),
    CONSTRAINT positive_daily_reward_streak CHECK (daily_reward_streak >= 0),
    CONSTRAINT positive_tournament_points CHECK (tournament_points >= 0),
    CONSTRAINT positive_seasonal_points CHECK (seasonal_points >= 0),
    CONSTRAINT positive_total_seasonal_points CHECK (total_seasonal_points >= 0),
    CONSTRAINT positive_loyalty_points CHECK (loyalty_points >= 0),
    CONSTRAINT positive_total_loyalty_points CHECK (total_loyalty_points >= 0),
    CONSTRAINT valid_chat_level CHECK (chat_level >= 1 AND chat_level <= 10),
    CONSTRAINT positive_chat_points CHECK (chat_points >= 0),
    UNIQUE(user_id)
);

-- Create loyalty_program table
CREATE TABLE loyalty_program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_per_game INTEGER NOT NULL DEFAULT 1,
    points_per_win INTEGER NOT NULL DEFAULT 2,
    points_per_tournament INTEGER NOT NULL DEFAULT 5,
    points_per_chat_message INTEGER NOT NULL DEFAULT 1,
    bonus_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loyalty_rewards table
CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL DEFAULT 0,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('demo_coins', 'real_coins', 'vip_points', 'special_item', 'chat_privileges')),
    reward_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_loyalty_rewards table
CREATE TABLE user_loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    loyalty_reward_id UUID NOT NULL REFERENCES loyalty_rewards(id),
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, loyalty_reward_id)
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    room_id UUID REFERENCES rooms(id),
    message TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    recipient_id UUID REFERENCES auth.users(id),
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_rewards table
CREATE TABLE chat_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    messages_required INTEGER NOT NULL DEFAULT 0,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('demo_coins', 'real_coins', 'vip_points', 'special_item')),
    reward_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_chat_rewards table
CREATE TABLE user_chat_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    chat_reward_id UUID NOT NULL REFERENCES chat_rewards(id),
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, chat_reward_id)
);

-- Create analytics_events table
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL CHECK (event_type IN ('game_start', 'game_end', 'tournament_join', 'tournament_leave', 'chat_message', 'reward_claim', 'balance_change', 'vip_level_up')),
    event_data JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_summary view
CREATE VIEW analytics_summary AS
SELECT 
    DATE(created_at) as event_date,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN event_type = 'game_start' THEN 1 ELSE 0 END) as games_started,
    SUM(CASE WHEN event_type = 'game_end' THEN 1 ELSE 0 END) as games_completed,
    SUM(CASE WHEN event_type = 'chat_message' THEN 1 ELSE 0 END) as chat_messages,
    SUM(CASE WHEN event_type = 'reward_claim' THEN 1 ELSE 0 END) as rewards_claimed
FROM analytics_events
GROUP BY DATE(created_at), event_type;

-- Create tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_fee INTEGER NOT NULL,
    prize_pool INTEGER NOT NULL,
    max_players INTEGER NOT NULL,
    min_vip_level INTEGER NOT NULL DEFAULT 0,
    is_demo_mode BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament_participants table
CREATE TABLE tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    prize INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Create special_events table
CREATE TABLE special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    bonus_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    min_vip_level INTEGER NOT NULL DEFAULT 0,
    is_demo_mode BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_rewards table
CREATE TABLE daily_rewards (
    day INTEGER PRIMARY KEY CHECK (day >= 1 AND day <= 7),
    demo_coins INTEGER NOT NULL DEFAULT 0,
    real_coins INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Create vip_levels table
CREATE TABLE vip_levels (
    level INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    min_games INTEGER NOT NULL,
    min_wins INTEGER NOT NULL,
    win_rate DECIMAL(5,2) NOT NULL,
    bonus_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    daily_bonus INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create balance_transactions table to track all balance changes
CREATE TABLE balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'game_win', 'game_loss', 'room_entry', 'room_exit', 'referral_bonus', 'daily_bonus', 'achievement_bonus', 'tournament_entry', 'tournament_prize', 'event_bonus')),
    amount INTEGER NOT NULL,
    balance_type TEXT NOT NULL CHECK (balance_type IN ('demo', 'real')),
    room_id UUID REFERENCES rooms(id),
    tournament_id UUID REFERENCES tournaments(id),
    event_id UUID REFERENCES special_events(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create balance_history table for historical balance tracking
CREATE TABLE balance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    demo_balance INTEGER NOT NULL,
    real_balance INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transaction_notifications table
CREATE TABLE transaction_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transaction_id UUID NOT NULL REFERENCES balance_transactions(id),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('deposit', 'withdrawal', 'win', 'loss', 'referral', 'limit_warning', 'achievement', 'vip_level_up', 'daily_bonus', 'tournament_start', 'tournament_end', 'tournament_prize', 'event_start', 'event_end', 'event_bonus')),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_transaction_summary view
CREATE VIEW daily_transaction_summary AS
SELECT 
    user_id,
    balance_type,
    DATE(created_at) as transaction_date,
    SUM(CASE WHEN transaction_type IN ('deposit', 'game_win', 'referral_bonus', 'daily_bonus', 'achievement_bonus', 'tournament_prize', 'event_bonus') THEN amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN transaction_type IN ('withdrawal', 'game_loss', 'room_entry', 'tournament_entry') THEN amount ELSE 0 END) as total_withdrawals,
    COUNT(*) as transaction_count
FROM balance_transactions
GROUP BY user_id, balance_type, DATE(created_at);

-- Create leaderboards table
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'seasonal', 'all_time')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leaderboard_entries table
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    points INTEGER NOT NULL DEFAULT 0,
    rank INTEGER,
    prize INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leaderboard_id, user_id)
);

-- Create security_logs table
CREATE TABLE security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('login', 'logout', 'password_change', 'balance_change', 'suspicious_activity', 'security_check')),
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seasonal_rewards table
CREATE TABLE seasonal_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    min_points INTEGER NOT NULL DEFAULT 0,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('demo_coins', 'real_coins', 'vip_points', 'special_item')),
    reward_amount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_seasonal_rewards table
CREATE TABLE user_seasonal_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    seasonal_reward_id UUID NOT NULL REFERENCES seasonal_rewards(id),
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    claimed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, seasonal_reward_id)
);

-- Create indexes for better performance
CREATE INDEX idx_user_balance_user_id ON user_balance(user_id);
CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_room_id ON balance_transactions(room_id);
CREATE INDEX idx_balance_transactions_created_at ON balance_transactions(created_at);
CREATE INDEX idx_balance_history_user_id ON balance_history(user_id);
CREATE INDEX idx_balance_history_recorded_at ON balance_history(recorded_at);
CREATE INDEX idx_transaction_notifications_user_id ON transaction_notifications(user_id);
CREATE INDEX idx_transaction_notifications_is_read ON transaction_notifications(is_read);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_start_time ON tournaments(start_time);
CREATE INDEX idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX idx_special_events_status ON special_events(status);
CREATE INDEX idx_special_events_start_time ON special_events(start_time);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);
CREATE INDEX idx_leaderboard_entries_user_id ON leaderboard_entries(user_id);
CREATE INDEX idx_user_seasonal_rewards_user_id ON user_seasonal_rewards(user_id);
CREATE INDEX idx_user_seasonal_rewards_seasonal_reward_id ON user_seasonal_rewards(seasonal_reward_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Enable RLS
ALTER TABLE user_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER VIEW daily_transaction_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seasonal_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chat_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER VIEW analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own balance"
    ON user_balance FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can update balances"
    ON user_balance FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view their own transactions"
    ON balance_transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
    ON balance_transactions FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their own balance history"
    ON balance_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert balance history"
    ON balance_history FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can view their own notifications"
    ON transaction_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON transaction_notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
    ON transaction_notifications FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can view achievements"
    ON achievements FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own achievements"
    ON user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can update achievements"
    ON user_achievements FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view VIP levels"
    ON vip_levels FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view tournaments"
    ON tournaments FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own tournament participation"
    ON tournament_participants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage tournaments"
    ON tournaments FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage tournament participants"
    ON tournament_participants FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view special events"
    ON special_events FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage special events"
    ON special_events FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view daily rewards"
    ON daily_rewards FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own daily summary"
    ON daily_transaction_summary FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view leaderboards"
    ON leaderboards FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own leaderboard entries"
    ON leaderboard_entries FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage leaderboards"
    ON leaderboards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage leaderboard entries"
    ON leaderboard_entries FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view their own security logs"
    ON security_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage security logs"
    ON security_logs FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view seasonal rewards"
    ON seasonal_rewards FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own seasonal rewards"
    ON user_seasonal_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage seasonal rewards"
    ON seasonal_rewards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage user seasonal rewards"
    ON user_seasonal_rewards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view loyalty program"
    ON loyalty_program FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view loyalty rewards"
    ON loyalty_rewards FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own loyalty rewards"
    ON user_loyalty_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage loyalty program"
    ON loyalty_program FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage loyalty rewards"
    ON loyalty_rewards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage user loyalty rewards"
    ON user_loyalty_rewards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view chat messages in their rooms"
    ON chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT id FROM rooms 
            WHERE id IN (
                SELECT room_id FROM room_players 
                WHERE user_id = auth.uid()
            )
        )
        OR user_id = auth.uid()
        OR recipient_id = auth.uid()
    );

CREATE POLICY "Users can insert chat messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view chat rewards"
    ON chat_rewards FOR SELECT
    USING (true);

CREATE POLICY "Users can view their own chat rewards"
    ON user_chat_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage chat rewards"
    ON chat_rewards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage user chat rewards"
    ON user_chat_rewards FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage analytics"
    ON analytics_events FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can view analytics summary"
    ON analytics_summary FOR SELECT
    USING (true);

-- Create function to record balance history
CREATE OR REPLACE FUNCTION record_balance_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO balance_history (user_id, demo_balance, real_balance)
    VALUES (NEW.user_id, NEW.demo_balance, NEW.real_balance);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for balance history
CREATE TRIGGER record_balance_history_trigger
    AFTER UPDATE ON user_balance
    FOR EACH ROW
    EXECUTE FUNCTION record_balance_history();

-- Create function to create notification
CREATE OR REPLACE FUNCTION create_transaction_notification(
    p_user_id UUID,
    p_transaction_id UUID,
    p_notification_type TEXT,
    p_message TEXT
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
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

-- Create function to claim daily reward
CREATE OR REPLACE FUNCTION claim_daily_reward(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_last_reward TIMESTAMP WITH TIME ZONE;
    v_current_streak INTEGER;
    v_day_of_week INTEGER;
    v_demo_coins INTEGER;
    v_real_coins INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get user's last reward time and current streak
    SELECT last_daily_reward, daily_reward_streak
    INTO v_last_reward, v_current_streak
    FROM user_balance
    WHERE user_id = p_user_id;

    -- Check if reward can be claimed
    IF v_last_reward IS NOT NULL AND v_last_reward > NOW() - INTERVAL '1 day' THEN
        RAISE EXCEPTION 'Daily reward already claimed today';
    END IF;

    -- Calculate day of week (1-7)
    v_day_of_week := EXTRACT(DOW FROM NOW()) + 1;

    -- Get reward amounts
    SELECT demo_coins, real_coins
    INTO v_demo_coins, v_real_coins
    FROM daily_rewards
    WHERE day = v_day_of_week;

    -- Update streak
    IF v_last_reward IS NULL OR v_last_reward < NOW() - INTERVAL '2 days' THEN
        v_current_streak := 1;
    ELSE
        v_current_streak := v_current_streak + 1;
    END IF;

    -- Update user balance and streak
    UPDATE user_balance
    SET 
        demo_balance = demo_balance + v_demo_coins,
        last_daily_reward = NOW(),
        daily_reward_streak = v_current_streak
    WHERE user_id = p_user_id
    RETURNING demo_balance INTO v_new_balance;

    -- Record transaction
    INSERT INTO balance_transactions (
        user_id,
        transaction_type,
        amount,
        balance_type,
        metadata
    ) VALUES (
        p_user_id,
        'daily_bonus',
        v_demo_coins,
        'demo',
        jsonb_build_object(
            'day_of_week', v_day_of_week,
            'streak', v_current_streak
        )
    ) RETURNING id INTO v_transaction_id;

    -- Create notification
    PERFORM create_transaction_notification(
        p_user_id,
        v_transaction_id,
        'daily_bonus',
        format('Daily reward claimed! You received %s demo coins (Streak: %s days)', v_demo_coins, v_current_streak)
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to join tournament
CREATE OR REPLACE FUNCTION join_tournament(
    p_user_id UUID,
    p_tournament_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_entry_fee INTEGER;
    v_balance_type TEXT;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get tournament details
    SELECT entry_fee, is_demo_mode
    INTO v_entry_fee, v_balance_type
    FROM tournaments
    WHERE id = p_tournament_id;

    -- Check if tournament is open for registration
    IF NOT EXISTS (
        SELECT 1 FROM tournaments
        WHERE id = p_tournament_id
        AND status = 'upcoming'
        AND start_time > NOW()
    ) THEN
        RAISE EXCEPTION 'Tournament is not open for registration';
    END IF;

    -- Check if user has enough balance
    IF v_balance_type = 'demo' THEN
        SELECT demo_balance INTO v_current_balance
        FROM user_balance
        WHERE user_id = p_user_id;
    ELSE
        SELECT real_balance INTO v_current_balance
        FROM user_balance
        WHERE user_id = p_user_id;
    END IF;

    IF v_current_balance < v_entry_fee THEN
        RAISE EXCEPTION 'Insufficient balance to join tournament';
    END IF;

    -- Deduct entry fee
    v_new_balance := update_user_balance(
        p_user_id,
        -v_entry_fee,
        v_balance_type,
        'tournament_entry',
        NULL,
        jsonb_build_object('tournament_id', p_tournament_id)
    );

    -- Add participant
    INSERT INTO tournament_participants (
        tournament_id,
        user_id
    ) VALUES (
        p_tournament_id,
        p_user_id
    );

    -- Create notification
    PERFORM create_transaction_notification(
        p_user_id,
        currval('balance_transactions_id_seq'),
        'tournament_start',
        format('You joined tournament "%s"!', (
            SELECT name FROM tournaments WHERE id = p_tournament_id
        ))
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process tournament results
CREATE OR REPLACE FUNCTION process_tournament_results(
    p_tournament_id UUID
) RETURNS VOID AS $$
DECLARE
    v_prize_pool INTEGER;
    v_balance_type TEXT;
    v_rank INTEGER;
    v_prize INTEGER;
    v_user_id UUID;
BEGIN
    -- Get tournament details
    SELECT prize_pool, is_demo_mode
    INTO v_prize_pool, v_balance_type
    FROM tournaments
    WHERE id = p_tournament_id;

    -- Update tournament status
    UPDATE tournaments
    SET status = 'completed'
    WHERE id = p_tournament_id;

    -- Calculate and distribute prizes
    FOR v_rank, v_user_id IN
        SELECT ROW_NUMBER() OVER (ORDER BY points DESC), user_id
        FROM tournament_participants
        WHERE tournament_id = p_tournament_id
        ORDER BY points DESC
    LOOP
        -- Calculate prize based on rank
        v_prize := CASE v_rank
            WHEN 1 THEN FLOOR(v_prize_pool * 0.5)  -- 50% for 1st place
            WHEN 2 THEN FLOOR(v_prize_pool * 0.3)  -- 30% for 2nd place
            WHEN 3 THEN FLOOR(v_prize_pool * 0.2)  -- 20% for 3rd place
            ELSE 0
        END;

        -- Update participant record
        UPDATE tournament_participants
        SET 
            rank = v_rank,
            prize = v_prize
        WHERE tournament_id = p_tournament_id
        AND user_id = v_user_id;

        -- Award prize if any
        IF v_prize > 0 THEN
            -- Update user balance
            PERFORM update_user_balance(
                v_user_id,
                v_prize,
                v_balance_type,
                'tournament_prize',
                NULL,
                jsonb_build_object(
                    'tournament_id', p_tournament_id,
                    'rank', v_rank
                )
            );

            -- Create notification
            PERFORM create_transaction_notification(
                v_user_id,
                currval('balance_transactions_id_seq'),
                'tournament_prize',
                format('You won %s place in tournament "%s" and received %s %s coins!', 
                    v_rank,
                    (SELECT name FROM tournaments WHERE id = p_tournament_id),
                    v_prize,
                    v_balance_type
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check and update VIP level
CREATE OR REPLACE FUNCTION update_vip_level(
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_total_games INTEGER;
    v_total_wins INTEGER;
    v_win_rate DECIMAL(5,2);
    v_new_level INTEGER;
    v_old_level INTEGER;
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
        UPDATE user_balance
        SET vip_level = v_new_level
        WHERE user_id = p_user_id;

        -- Create notification
        PERFORM create_transaction_notification(
            p_user_id,
            NULL,
            'vip_level_up',
            format('Congratulations! You reached VIP Level %s!', v_new_level)
        );
    END IF;

    RETURN COALESCE(v_new_level, v_old_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process game result
CREATE OR REPLACE FUNCTION process_game_result(
    p_user_id UUID,
    p_is_winner BOOLEAN,
    p_amount INTEGER,
    p_balance_type TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_bonus_multiplier DECIMAL(5,2);
    v_final_amount INTEGER;
    v_new_balance INTEGER;
    v_transaction_id UUID;
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

    -- Process balance update
    v_new_balance := update_user_balance(
        p_user_id,
        v_final_amount,
        p_balance_type,
        CASE WHEN p_is_winner THEN 'game_win' ELSE 'game_loss' END,
        NULL,
        jsonb_build_object(
            'bonus_multiplier', v_bonus_multiplier,
            'original_amount', p_amount
        )
    );

    -- Update VIP level
    PERFORM update_vip_level(p_user_id);

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can join room
CREATE OR REPLACE FUNCTION can_join_room(
    p_user_id UUID,
    p_room_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_min_balance INTEGER;
    v_is_demo_mode BOOLEAN;
    v_user_balance INTEGER;
BEGIN
    -- Get room requirements
    SELECT min_balance, is_demo_mode
    INTO v_min_balance, v_is_demo_mode
    FROM rooms
    WHERE id = p_room_id;

    -- Get user's appropriate balance
    IF v_is_demo_mode THEN
        SELECT demo_balance INTO v_user_balance
        FROM user_balance
        WHERE user_id = p_user_id;
    ELSE
        SELECT real_balance INTO v_user_balance
        FROM user_balance
        WHERE user_id = p_user_id;
    END IF;

    -- Check if user has enough balance
    RETURN v_user_balance >= v_min_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process referral bonus
CREATE OR REPLACE FUNCTION process_referral_bonus(
    p_referrer_id UUID,
    p_referred_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_bonus_amount INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Get referrer's bonus amount
    SELECT referral_bonus INTO v_bonus_amount
    FROM user_balance
    WHERE user_id = p_referrer_id;

    -- Update referrer's balance and count
    UPDATE user_balance
    SET 
        demo_balance = demo_balance + v_bonus_amount,
        referral_count = referral_count + 1
    WHERE user_id = p_referrer_id
    RETURNING demo_balance INTO v_new_balance;

    -- Record transaction
    INSERT INTO balance_transactions (
        user_id,
        transaction_type,
        amount,
        balance_type,
        metadata
    ) VALUES (
        p_referrer_id,
        'referral_bonus',
        v_bonus_amount,
        'demo',
        jsonb_build_object('referred_user_id', p_referred_id)
    );

    -- Create notification
    PERFORM create_transaction_notification(
        p_referrer_id,
        currval('balance_transactions_id_seq'),
        'referral',
        format('You received %s demo coins for referring a new user!', v_bonus_amount)
    );

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user balance
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
    daily_limit INTEGER;
    current_daily_total INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Check daily limits for deposits
    IF p_transaction_type IN ('deposit', 'game_win') THEN
        IF p_balance_type = 'demo' THEN
            SELECT daily_demo_limit INTO daily_limit
            FROM user_balance
            WHERE user_id = p_user_id;

            SELECT COALESCE(SUM(amount), 0) INTO current_daily_total
            FROM balance_transactions
            WHERE user_id = p_user_id
            AND balance_type = 'demo'
            AND transaction_type IN ('deposit', 'game_win')
            AND created_at >= CURRENT_DATE;

            IF current_daily_total + p_amount > daily_limit THEN
                RAISE EXCEPTION 'Daily deposit limit exceeded';
            END IF;
        ELSE
            SELECT daily_real_limit INTO daily_limit
            FROM user_balance
            WHERE user_id = p_user_id;

            SELECT COALESCE(SUM(amount), 0) INTO current_daily_total
            FROM balance_transactions
            WHERE user_id = p_user_id
            AND balance_type = 'real'
            AND transaction_type IN ('deposit', 'game_win')
            AND created_at >= CURRENT_DATE;

            IF current_daily_total + p_amount > daily_limit THEN
                RAISE EXCEPTION 'Daily deposit limit exceeded';
            END IF;
        END IF;
    END IF;

    -- Check withdrawal limits
    IF p_transaction_type = 'withdrawal' THEN
        DECLARE
            withdrawal_limit INTEGER;
        BEGIN
            SELECT withdrawal_limit INTO withdrawal_limit
            FROM user_balance
            WHERE user_id = p_user_id;

            IF ABS(p_amount) > withdrawal_limit THEN
                RAISE EXCEPTION 'Withdrawal amount exceeds limit';
            END IF;
        END;
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
    ) RETURNING id INTO v_transaction_id;

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

    -- Create appropriate notification
    CASE p_transaction_type
        WHEN 'deposit' THEN
            PERFORM create_transaction_notification(
                p_user_id,
                v_transaction_id,
                'deposit',
                format('You deposited %s %s coins', p_amount, p_balance_type)
            );
        WHEN 'withdrawal' THEN
            PERFORM create_transaction_notification(
                p_user_id,
                v_transaction_id,
                'withdrawal',
                format('You withdrew %s %s coins', ABS(p_amount), p_balance_type)
            );
        WHEN 'game_win' THEN
            PERFORM create_transaction_notification(
                p_user_id,
                v_transaction_id,
                'win',
                format('You won %s %s coins!', p_amount, p_balance_type)
            );
        WHEN 'game_loss' THEN
            PERFORM create_transaction_notification(
                p_user_id,
                v_transaction_id,
                'loss',
                format('You lost %s %s coins', ABS(p_amount), p_balance_type)
            );
    END CASE;

    RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE TRIGGER update_user_balance_updated_at
    BEFORE UPDATE ON user_balance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add is_demo_mode column to rooms table
ALTER TABLE rooms
ADD COLUMN is_demo_mode BOOLEAN NOT NULL DEFAULT true;

-- Add minimum balance requirement for real money rooms
ALTER TABLE rooms
ADD COLUMN min_balance INTEGER NOT NULL DEFAULT 0;

-- Insert default VIP levels
INSERT INTO vip_levels (level, name, min_games, min_wins, win_rate, bonus_multiplier, daily_bonus) VALUES
(0, 'New Player', 0, 0, 0, 1.0, 0),
(1, 'Bronze', 10, 3, 30, 1.1, 10),
(2, 'Silver', 50, 15, 30, 1.2, 20),
(3, 'Gold', 100, 35, 35, 1.3, 30),
(4, 'Platinum', 200, 80, 40, 1.4, 40),
(5, 'Diamond', 500, 200, 40, 1.5, 50),
(6, 'Master', 1000, 450, 45, 1.6, 60),
(7, 'Grandmaster', 2000, 1000, 50, 1.7, 70),
(8, 'Legend', 5000, 2500, 50, 1.8, 80),
(9, 'Mythic', 10000, 5000, 50, 1.9, 90),
(10, 'Immortal', 20000, 10000, 50, 2.0, 100);

-- Insert default achievements
INSERT INTO achievements (name, description, icon_url, points) VALUES
('First Win', 'Win your first game', 'first_win.png', 100),
('Win Streak', 'Achieve a 5-game win streak', 'win_streak.png', 200),
('Veteran', 'Play 100 games', 'veteran.png', 300),
('Master', 'Win 50 games', 'master.png', 400),
('Legend', 'Reach VIP Level 5', 'legend.png', 500),
('Referral King', 'Refer 10 new users', 'referral_king.png', 600),
('High Roller', 'Win a game with maximum bet', 'high_roller.png', 700),
('Perfect Game', 'Win a game without losing any cards', 'perfect_game.png', 800),
('Daily Champion', 'Win 5 games in a single day', 'daily_champion.png', 900),
('Unstoppable', 'Achieve a 10-game win streak', 'unstoppable.png', 1000);

-- Insert default daily rewards
INSERT INTO daily_rewards (day, demo_coins, real_coins) VALUES
(1, 100, 0),
(2, 200, 0),
(3, 300, 0),
(4, 400, 0),
(5, 500, 0),
(6, 600, 0),
(7, 1000, 0);

-- Insert default leaderboards
INSERT INTO leaderboards (name, type, start_time, end_time) VALUES
('Daily Leaderboard', 'daily', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day'),
('Weekly Leaderboard', 'weekly', CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '7 days'),
('Monthly Leaderboard', 'monthly', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days'),
('Seasonal Leaderboard', 'seasonal', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '3 months'),
('All-Time Leaderboard', 'all_time', CURRENT_DATE - INTERVAL '10 years', CURRENT_DATE + INTERVAL '10 years');

-- Insert default seasonal rewards
INSERT INTO seasonal_rewards (season_number, name, start_time, end_time, min_points, reward_type, reward_amount) VALUES
(1, 'Spring Seasonal Reward', CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '3 months', 0, 'demo_coins', 1000),
(2, 'Summer Seasonal Reward', CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE + INTERVAL '2 months', 0, 'real_coins', 500),
(3, 'Autumn Seasonal Reward', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '1 month', 0, 'vip_points', 2),
(4, 'Winter Seasonal Reward', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', 0, 'special_item', 1);

-- Add comments for documentation
COMMENT ON COLUMN rooms.is_demo_mode IS 'True if room uses demo money, false if using real money';
COMMENT ON COLUMN rooms.min_balance IS 'Minimum balance required to join the room';
COMMENT ON COLUMN user_balance.demo_balance IS 'Practice/demo money balance, starts at 1000';
COMMENT ON COLUMN user_balance.real_balance IS 'Real money balance, starts at 0';
COMMENT ON COLUMN user_balance.daily_demo_limit IS 'Maximum daily demo balance limit';
COMMENT ON COLUMN user_balance.daily_real_limit IS 'Maximum daily real balance limit';
COMMENT ON COLUMN user_balance.withdrawal_limit IS 'Maximum withdrawal amount per transaction';
COMMENT ON COLUMN user_balance.referral_bonus IS 'Bonus amount for referring new users';
COMMENT ON COLUMN user_balance.referral_count IS 'Number of successful referrals';
COMMENT ON COLUMN user_balance.vip_level IS 'VIP level (0-10) with increasing benefits';
COMMENT ON COLUMN user_balance.total_wins IS 'Total number of games won';
COMMENT ON COLUMN user_balance.total_games IS 'Total number of games played';
COMMENT ON COLUMN user_balance.win_streak IS 'Current win streak';
COMMENT ON COLUMN user_balance.max_win_streak IS 'Maximum win streak achieved';
COMMENT ON COLUMN user_balance.last_daily_reward IS 'Last time daily reward was claimed';
COMMENT ON COLUMN user_balance.daily_reward_streak IS 'Consecutive days of claiming daily reward';
COMMENT ON COLUMN user_balance.tournament_points IS 'Points earned in tournaments';
COMMENT ON COLUMN user_balance.seasonal_points IS 'Points earned in current season';
COMMENT ON COLUMN user_balance.total_seasonal_points IS 'Total points earned across all seasons';
COMMENT ON COLUMN user_balance.last_season_reset IS 'Last time seasonal points were reset';
COMMENT ON COLUMN user_balance.is_suspicious IS 'Flag indicating suspicious activity';
COMMENT ON COLUMN user_balance.last_security_check IS 'Last time security check was performed';
COMMENT ON COLUMN user_balance.loyalty_points IS 'Points earned in loyalty program';
COMMENT ON COLUMN user_balance.total_loyalty_points IS 'Total loyalty points earned';
COMMENT ON COLUMN user_balance.chat_level IS 'Chat level (1-10)';
COMMENT ON COLUMN user_balance.chat_points IS 'Points earned from chat activity';
COMMENT ON COLUMN user_balance.last_chat_reward IS 'Last time chat reward was claimed';
COMMENT ON COLUMN balance_transactions.transaction_type IS 'Type of transaction: deposit, withdrawal, game_win, game_loss, room_entry, room_exit, referral_bonus, daily_bonus, achievement_bonus, tournament_entry, tournament_prize, event_bonus';
COMMENT ON COLUMN balance_transactions.balance_type IS 'Type of balance affected: demo or real';
COMMENT ON COLUMN balance_history.demo_balance IS 'Historical demo balance at recording time';
COMMENT ON COLUMN balance_history.real_balance IS 'Historical real balance at recording time';
COMMENT ON COLUMN transaction_notifications.notification_type IS 'Type of notification: deposit, withdrawal, win, loss, referral, limit_warning, achievement, vip_level_up, daily_bonus, tournament_start, tournament_end, tournament_prize, event_start, event_end, event_bonus';
COMMENT ON COLUMN achievements.points IS 'Points awarded for completing the achievement';
COMMENT ON COLUMN vip_levels.bonus_multiplier IS 'Multiplier applied to winnings at this VIP level';
COMMENT ON COLUMN vip_levels.daily_bonus IS 'Daily bonus coins awarded at this VIP level';
COMMENT ON COLUMN tournaments.prize_pool IS 'Total prize pool for the tournament';
COMMENT ON COLUMN tournaments.entry_fee IS 'Entry fee required to join the tournament';
COMMENT ON COLUMN special_events.bonus_multiplier IS 'Multiplier applied to winnings during the event';
COMMENT ON COLUMN daily_rewards.demo_coins IS 'Number of demo coins awarded on this day';
COMMENT ON COLUMN daily_rewards.real_coins IS 'Number of real coins awarded on this day';
COMMENT ON COLUMN leaderboards.type IS 'Type of leaderboard: daily, weekly, monthly, seasonal, all_time';
COMMENT ON COLUMN seasonal_rewards.reward_type IS 'Type of reward: demo_coins, real_coins, vip_points, special_item';
COMMENT ON COLUMN loyalty_program.points_per_game IS 'Points earned per game played';
COMMENT ON COLUMN loyalty_program.points_per_win IS 'Points earned per game won';
COMMENT ON COLUMN loyalty_program.points_per_tournament IS 'Points earned per tournament participation';
COMMENT ON COLUMN loyalty_program.points_per_chat_message IS 'Points earned per chat message';
COMMENT ON COLUMN loyalty_program.bonus_multiplier IS 'Multiplier applied to earned points';
COMMENT ON COLUMN loyalty_rewards.reward_type IS 'Type of reward: demo_coins, real_coins, vip_points, special_item, chat_privileges';
COMMENT ON COLUMN chat_messages.is_private IS 'True if message is private';
COMMENT ON COLUMN chat_messages.is_system IS 'True if message is from system';
COMMENT ON COLUMN analytics_events.event_type IS 'Type of event: game_start, game_end, tournament_join, tournament_leave, chat_message, reward_claim, balance_change, vip_level_up';

-- Create balance records for existing users
INSERT INTO user_balance (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_balance)
ON CONFLICT (user_id) DO NOTHING;

-- Create function to process loyalty points
CREATE OR REPLACE FUNCTION process_loyalty_points(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::jsonb
) RETURNS INTEGER AS $$
DECLARE
    v_points_to_add INTEGER;
    v_new_loyalty_points INTEGER;
    v_loyalty_program RECORD;
BEGIN
    -- Get loyalty program settings
    SELECT * INTO v_loyalty_program
    FROM loyalty_program
    LIMIT 1;

    -- Calculate points based on event type
    v_points_to_add := CASE p_event_type
        WHEN 'game_play' THEN v_loyalty_program.points_per_game
        WHEN 'game_win' THEN v_loyalty_program.points_per_win
        WHEN 'tournament_participation' THEN v_loyalty_program.points_per_tournament
        WHEN 'chat_message' THEN v_loyalty_program.points_per_chat_message
        ELSE 0
    END;

    -- Apply bonus multiplier
    v_points_to_add := FLOOR(v_points_to_add * v_loyalty_program.bonus_multiplier);

    -- Update user's loyalty points
    UPDATE user_balance
    SET 
        loyalty_points = loyalty_points + v_points_to_add,
        total_loyalty_points = total_loyalty_points + v_points_to_add
    WHERE user_id = p_user_id
    RETURNING loyalty_points INTO v_new_loyalty_points;

    -- Record analytics event
    INSERT INTO analytics_events (
        user_id,
        event_type,
        event_data
    ) VALUES (
        p_user_id,
        'loyalty_points_earned',
        jsonb_build_object(
            'points_earned', v_points_to_add,
            'event_type', p_event_type,
            'total_points', v_new_loyalty_points
        )
    );

    RETURN v_new_loyalty_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process chat rewards
CREATE OR REPLACE FUNCTION process_chat_rewards(
    p_user_id UUID
) RETURNS VOID AS $$
DECLARE
    v_chat_level INTEGER;
    v_chat_points INTEGER;
    v_messages_count INTEGER;
    v_reward_id UUID;
    v_reward_type TEXT;
    v_reward_amount INTEGER;
BEGIN
    -- Get user's chat stats
    SELECT chat_level, chat_points INTO v_chat_level, v_chat_points
    FROM user_balance
    WHERE user_id = p_user_id;

    -- Count messages
    SELECT COUNT(*) INTO v_messages_count
    FROM chat_messages
    WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '24 hours';

    -- Check for unclaimed rewards
    FOR v_reward_id, v_reward_type, v_reward_amount IN
        SELECT id, reward_type, reward_amount
        FROM chat_rewards
        WHERE messages_required <= v_messages_count
        AND id NOT IN (
            SELECT chat_reward_id
            FROM user_chat_rewards
            WHERE user_id = p_user_id
        )
    LOOP
        -- Create reward record
        INSERT INTO user_chat_rewards (
            user_id,
            chat_reward_id
        ) VALUES (
            p_user_id,
            v_reward_id
        );

        -- Award reward
        CASE v_reward_type
            WHEN 'demo_coins' THEN
                PERFORM update_user_balance(
                    p_user_id,
                    v_reward_amount,
                    'demo',
                    'chat_reward',
                    NULL,
                    jsonb_build_object('reward_id', v_reward_id)
                );
            WHEN 'real_coins' THEN
                PERFORM update_user_balance(
                    p_user_id,
                    v_reward_amount,
                    'real',
                    'chat_reward',
                    NULL,
                    jsonb_build_object('reward_id', v_reward_id)
                );
            WHEN 'vip_points' THEN
                UPDATE user_balance
                SET vip_level = LEAST(vip_level + v_reward_amount, 10)
                WHERE user_id = p_user_id;
        END CASE;

        -- Create notification
        PERFORM create_transaction_notification(
            p_user_id,
            currval('balance_transactions_id_seq'),
            'chat_reward',
            format('You earned a chat reward: %s %s!', 
                v_reward_amount,
                CASE v_reward_type
                    WHEN 'demo_coins' THEN 'demo coins'
                    WHEN 'real_coins' THEN 'real coins'
                    WHEN 'vip_points' THEN 'VIP points'
                    ELSE 'special item'
                END
            )
        );
    END LOOP;

    -- Update chat level if needed
    IF v_messages_count >= v_chat_level * 100 THEN
        UPDATE user_balance
        SET 
            chat_level = LEAST(chat_level + 1, 10),
            last_chat_reward = NOW()
        WHERE user_id = p_user_id;

        -- Create notification
        PERFORM create_transaction_notification(
            p_user_id,
            NULL,
            'chat_level_up',
            format('Congratulations! You reached Chat Level %s!', v_chat_level + 1)
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record analytics event
CREATE OR REPLACE FUNCTION record_analytics_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO analytics_events (
        user_id,
        event_type,
        event_data,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_event_type,
        p_event_data,
        current_setting('request.headers')::json->>'x-forwarded-for',
        current_setting('request.headers')::json->>'user-agent'
    ) RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default loyalty program
INSERT INTO loyalty_program (name, description, points_per_game, points_per_win, points_per_tournament, points_per_chat_message, bonus_multiplier) VALUES
('Standard Loyalty Program', 'Earn points for various activities', 1, 2, 5, 1, 1.0);

-- Insert default loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_required, reward_type, reward_amount) VALUES
('Bronze Loyalty', 'Basic loyalty reward', 100, 'demo_coins', 100),
('Silver Loyalty', 'Intermediate loyalty reward', 500, 'demo_coins', 500),
('Gold Loyalty', 'Advanced loyalty reward', 1000, 'real_coins', 100),
('Platinum Loyalty', 'Premium loyalty reward', 5000, 'vip_points', 1),
('Diamond Loyalty', 'Elite loyalty reward', 10000, 'special_item', 1);

-- Insert default chat rewards
INSERT INTO chat_rewards (name, description, messages_required, reward_type, reward_amount) VALUES
('Chat Novice', 'Reward for active chatting', 100, 'demo_coins', 50),
('Chat Expert', 'Reward for consistent chatting', 500, 'demo_coins', 200),
('Chat Master', 'Reward for exceptional chatting', 1000, 'real_coins', 50),
('Chat Legend', 'Reward for legendary chatting', 5000, 'vip_points', 1); 