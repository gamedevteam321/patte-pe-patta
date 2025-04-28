-- Migration: Fix VIP level up transaction type
-- Description: Updates transaction type constraints
-- Date: 2024-03-30

-- Drop the existing check constraint
ALTER TABLE balance_transactions 
DROP CONSTRAINT IF EXISTS balance_transactions_transaction_type_check;

-- Add the new check constraint without vip_level_up
ALTER TABLE balance_transactions 
ADD CONSTRAINT balance_transactions_transaction_type_check 
CHECK (transaction_type IN (
    'deposit', 'withdrawal', 'game_win', 'game_loss', 
    'room_entry', 'room_exit', 'referral_bonus', 
    'daily_bonus', 'achievement_bonus', 'tournament_entry', 
    'tournament_prize', 'event_bonus'
));

-- Update the transaction type comment
COMMENT ON COLUMN balance_transactions.transaction_type IS 'Type of transaction: deposit, withdrawal, game_win, game_loss, room_entry, room_exit, referral_bonus, daily_bonus, achievement_bonus, tournament_entry, tournament_prize, event_bonus'; 