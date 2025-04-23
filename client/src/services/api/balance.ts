import { apiClient } from './index';
import { BalanceType } from '@/types/balance';

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    type: 'credit' | 'debit';
    balanceType: BalanceType;
    description: string;
    createdAt: string;
}

export interface Balance {
    real: number;
    demo: number;
}

export const balanceService = {
    getUserBalance: async (): Promise<Balance> => {
        const response = await apiClient.get('/balance/balance');
        return response.data;
    },

    getTransactionHistory: async (limit: number = 50, offset: number = 0): Promise<Transaction[]> => {
        const response = await apiClient.get('/balance/transactions', {
            params: { limit, offset }
        });
        return response.data;
    },

    claimDailyReward: async (): Promise<Balance> => {
        const response = await apiClient.post('/balance/daily-reward');
        return response.data.balance;
    },

    processGameResult: async (isWinner: boolean, amount: number, balanceType: BalanceType): Promise<Balance> => {
        const response = await apiClient.post('/balance/game-result', {
            isWinner,
            amount,
            balanceType
        });
        return response.data.balance;
    },

    joinTournament: async (tournamentId: string): Promise<Balance> => {
        const response = await apiClient.post(`/balance/tournaments/${tournamentId}/join`);
        return response.data.balance;
    },

    processReferralBonus: async (referredId: string): Promise<Balance> => {
        const response = await apiClient.post(`/balance/referral/${referredId}`);
        return response.data.balance;
    },

    canJoinRoom: async (roomId: string): Promise<boolean> => {
        const response = await apiClient.get(`/balance/can-join-room/${roomId}`);
        return response.data.canJoin;
    },

    processRoomEntry: async (userId: string, roomId: string, amount: number, balanceType: BalanceType): Promise<Balance> => {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second

        const attemptDeduction = async (retryCount: number = 0): Promise<Balance> => {
            try {
                // First verify current balance
                const currentBalance = await balanceService.getUserBalance();
                const availableBalance = balanceType === 'demo' ? currentBalance.demo : currentBalance.real;

                if (availableBalance < amount) {
                    throw new Error(`Insufficient ${balanceType} balance. Required: ${amount}, Available: ${availableBalance}`);
                }

                const transactionId = `${Date.now()}-${retryCount}`;

                console.log('Processing room entry:', { 
                    userId, 
                    roomId, 
                    amount, 
                    balanceType,
                    currentBalance: availableBalance,
                    attempt: retryCount + 1,
                    transactionId
                });

                const response = await apiClient.post('/balance/room-entry', {
                    userId,
                    roomId,
                    amount,
                    balanceType,
                    transactionId
                });

                // Verify the deduction was successful
                const newBalance = await balanceService.getUserBalance();
                const expectedBalance = availableBalance - amount;
                const actualBalance = balanceType === 'demo' ? newBalance.demo : newBalance.real;

                if (Math.abs(actualBalance - expectedBalance) > 0.01) { // Allow for floating point imprecision
                    throw new Error(`Balance verification failed. Expected: ${expectedBalance}, Actual: ${actualBalance}`);
                }

                console.log('Room entry processed successfully:', {
                    oldBalance: availableBalance,
                    newBalance: actualBalance,
                    amountDeducted: amount,
                    transactionId
                });

                return newBalance;
            } catch (error: any) {
                console.error(`Error processing room entry (attempt ${retryCount + 1}):`, {
                    error: error.message,
                    response: error.response?.data,
                    status: error.response?.status
                });

                // If we've hit max retries, throw the error
                if (retryCount >= MAX_RETRIES - 1) {
                    throw error;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                
                // Retry the deduction
                return attemptDeduction(retryCount + 1);
            }
        };

        return attemptDeduction();
    }
}; 