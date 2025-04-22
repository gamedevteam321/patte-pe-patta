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
    }
}; 