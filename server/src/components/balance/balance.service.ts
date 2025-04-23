import { supabase } from '../../utils/supabase';
import { UserBalance, BalanceTransaction, BalanceType } from '../../types/balance';
import { logError, logBalanceOperation, logBalanceError } from '../../utils/logger';

export class BalanceService {
    static async getUserBalance(userId: string): Promise<UserBalance> {
        // First try to get existing balance
        const { data, error } = await supabase
            .from('user_balance')
            .select('*')
            .eq('user_id', userId)
            .single();

        // If no balance exists, create a new one
        if (error && error.code === 'PGRST116') {
            const { data: newBalance, error: createError } = await supabase
                .from('user_balance')
                .insert([
                    {
                        user_id: userId,
                        real_balance: 0,
                        demo_balance: 1000, // Starting demo balance
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (createError) throw createError;
            return newBalance;
        }

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
            .range(offset, offset + limit - 1);

        if (error) {
            logError('Error fetching transaction history', error);
            throw error;
        }

        return data || [];
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

    static async processRoomEntry(
        userId: string,
        roomId: string,
        amount: number,
        balanceType: BalanceType
    ): Promise<number> {
        const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            logBalanceOperation('BEGIN_TRANSACTION', userId, {
                transactionId,
                roomId,
                amount,
                balanceType
            });

            // Start a transaction
            const { data: transaction, error: transactionError } = await supabase.rpc('begin_transaction', {
                p_user_id: userId,
                p_transaction_type: 'room_entry',
                p_transaction_id: transactionId
            });

            if (transactionError) {
                logBalanceError('BEGIN_TRANSACTION', userId, transactionError, {
                    transactionId,
                    roomId
                });
                throw new Error('Failed to begin transaction');
            }

            // Verify current balance within transaction
            const { data: currentBalance, error: balanceError } = await supabase.rpc('get_user_balance', {
                p_user_id: userId,
                p_balance_type: balanceType
            });

            if (balanceError) {
                logBalanceError('VERIFY_BALANCE', userId, balanceError, {
                    transactionId,
                    roomId
                });
                throw new Error('Failed to verify balance');
            }

            logBalanceOperation('BALANCE_VERIFIED', userId, {
                transactionId,
                currentBalance,
                requiredAmount: amount
            });

            if (currentBalance < amount) {
                const error = new Error('Insufficient balance');
                logBalanceError('INSUFFICIENT_BALANCE', userId, error, {
                    transactionId,
                    currentBalance,
                    requiredAmount: amount
                });
                throw error;
            }

            // Process the deduction
            const { data: newBalance, error: deductionError } = await supabase.rpc('process_room_entry', {
                p_user_id: userId,
                p_room_id: roomId,
                p_amount: amount,
                p_balance_type: balanceType,
                p_transaction_id: transactionId
            });

            if (deductionError) {
                logBalanceError('PROCESS_DEDUCTION', userId, deductionError, {
                    transactionId,
                    roomId,
                    amount
                });
                throw new Error('Failed to process room entry');
            }

            // Commit the transaction
            const { error: commitError } = await supabase.rpc('commit_transaction', {
                p_transaction_id: transactionId
            });

            if (commitError) {
                logBalanceError('COMMIT_TRANSACTION', userId, commitError, {
                    transactionId,
                    roomId
                });
                throw new Error('Failed to commit transaction');
            }

            logBalanceOperation('TRANSACTION_COMPLETED', userId, {
                transactionId,
                oldBalance: currentBalance,
                newBalance,
                amountDeducted: amount
            });

            return newBalance;
        } catch (error) {
            // Rollback the transaction on error
            await supabase.rpc('rollback_transaction', {
                p_transaction_id: transactionId
            });

            logBalanceError('TRANSACTION_ROLLBACK', userId, error, {
                transactionId,
                roomId
            });

            throw error;
        }
    }
} 