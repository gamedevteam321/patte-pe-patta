import { supabase } from '../../utils/supabase';
import { UserBalance, BalanceTransaction, BalanceType } from '../../types/balance';

export class BalanceService {
    static async getUserBalance(userId: string): Promise<UserBalance> {
        const { data, error } = await supabase
            .from('user_balance')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    static async updateUserBalance(
        userId: string,
        amount: number,
        balanceType: BalanceType,
        transactionType: string,
        metadata: any = {}
    ): Promise<number> {
        const { data, error } = await supabase.rpc('update_user_balance', {
            p_user_id: userId,
            p_amount: amount,
            p_balance_type: balanceType,
            p_transaction_type: transactionType,
            p_metadata: metadata
        });

        if (error) throw error;
        return data;
    }

    static async getTransactionHistory(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<BalanceTransaction[]> {
        const { data, error } = await supabase
            .from('balance_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)
            .offset(offset);

        if (error) throw error;
        return data;
    }

    static async claimDailyReward(userId: string): Promise<number> {
        const { data, error } = await supabase.rpc('claim_daily_reward', {
            p_user_id: userId
        });

        if (error) throw error;
        return data;
    }

    static async processLoyaltyPoints(
        userId: string,
        eventType: string,
        eventData: any = {}
    ): Promise<number> {
        const { data, error } = await supabase.rpc('process_loyalty_points', {
            p_user_id: userId,
            p_event_type: eventType,
            p_event_data: eventData
        });

        if (error) throw error;
        return data;
    }

    static async processChatRewards(userId: string): Promise<void> {
        const { error } = await supabase.rpc('process_chat_rewards', {
            p_user_id: userId
        });

        if (error) throw error;
    }

    static async joinTournament(
        userId: string,
        tournamentId: string
    ): Promise<number> {
        const { data, error } = await supabase.rpc('join_tournament', {
            p_user_id: userId,
            p_tournament_id: tournamentId
        });

        if (error) throw error;
        return data;
    }

    static async processGameResult(
        userId: string,
        isWinner: boolean,
        amount: number,
        balanceType: BalanceType
    ): Promise<number> {
        const { data, error } = await supabase.rpc('process_game_result', {
            p_user_id: userId,
            p_is_winner: isWinner,
            p_amount: amount,
            p_balance_type: balanceType
        });

        if (error) throw error;
        return data;
    }

    static async processReferralBonus(
        referrerId: string,
        referredId: string
    ): Promise<number> {
        const { data, error } = await supabase.rpc('process_referral_bonus', {
            p_referrer_id: referrerId,
            p_referred_id: referredId
        });

        if (error) throw error;
        return data;
    }

    static async canJoinRoom(
        userId: string,
        roomId: string
    ): Promise<boolean> {
        const { data, error } = await supabase.rpc('can_join_room', {
            p_user_id: userId,
            p_room_id: roomId
        });

        if (error) throw error;
        return data;
    }
} 