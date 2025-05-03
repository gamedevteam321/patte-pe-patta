import { RoomType } from './game';

export type BalanceType = 'demo' | 'real';

export interface UserBalance {
    id: string;
    user_id: string;
    balance: number;
    demo_balance: number;
    real_balance: number;
    daily_demo_limit: number;
    daily_real_limit: number;
    withdrawal_limit: number;
    referral_bonus: number;
    referral_count: number;
    total_wins: number;
    total_games: number;
    win_streak: number;
    max_win_streak: number;
    last_daily_reward: string | null;
    daily_reward_streak: number;
    tournament_points: number;
    seasonal_points: number;
    total_seasonal_points: number;
    last_season_reset: string | null;
    is_suspicious: boolean;
    last_security_check: string | null;
    loyalty_points: number;
    total_loyalty_points: number;
    chat_level: number;
    chat_points: number;
    last_chat_reward: string | null;
    created_at: string;
    updated_at: string;
}

export type TransactionType = 
    | 'deposit'
    | 'withdrawal'
    | 'game_win'
    | 'game_loss'
    | 'tournament_entry'
    | 'tournament_prize'
    | 'event_bonus'
    | 'achievement_bonus'
    | 'referral_bonus'
    | 'daily_bonus';  // Removed vip_level_up

export interface BalanceTransaction {
    id: string;
    user_id: string;
    transaction_type: TransactionType;
    amount: number;
    balance_type: BalanceType;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface LoyaltyReward {
    id: string;
    name: string;
    description: string | null;
    points_required: number;
    reward_type: string;
    reward_amount: number;
    created_at: string;
    updated_at: string;
}

export interface UserLoyaltyReward {
    id: string;
    user_id: string;
    loyalty_reward_id: string;
    is_claimed: boolean;
    claimed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChatReward {
    id: string;
    name: string;
    description: string | null;
    messages_required: number;
    reward_type: string;
    reward_amount: number;
    created_at: string;
    updated_at: string;
}

export interface UserChatReward {
    id: string;
    user_id: string;
    chat_reward_id: string;
    is_claimed: boolean;
    claimed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Tournament {
    id: string;
    name: string;
    description: string | null;
    start_time: string;
    end_time: string;
    entry_fee: number;
    prize_pool: number;
    max_players: number;
    min_vip_level: number;
    is_demo_mode: boolean;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface TournamentParticipant {
    id: string;
    tournament_id: string;
    user_id: string;
    points: number;
    rank: number | null;
    prize: number | null;
    created_at: string;
    updated_at: string;
}

export interface SpecialEvent {
    id: string;
    name: string;
    description: string | null;
    start_time: string;
    end_time: string;
    bonus_multiplier: number;
    min_vip_level: number;
    is_demo_mode: boolean;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface DailyReward {
    day: number;
    demo_coins: number;
    real_coins: number;
    created_at: string;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon_url: string | null;
    points: number;
    created_at: string;
}

export interface UserAchievement {
    id: string;
    user_id: string;
    achievement_id: string;
    progress: number;
    is_completed: boolean;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Room {
    id: string;
    name: string;
    entry_fee: number;
    max_players: number;
    game_type: RoomType;
    status: string;
    created_at: string;
    updated_at: string;
} 