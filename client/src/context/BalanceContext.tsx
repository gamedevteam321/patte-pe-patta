import React, { createContext, useContext, useState, useEffect } from 'react';
import { balanceService, Balance, Transaction } from '../services/api/balance';
import { useAuth } from './AuthContext';

interface BalanceContextType {
    balance: Balance | null;
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    refreshBalance: () => Promise<void>;
    refreshTransactions: () => Promise<void>;
    claimDailyReward: () => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [balance, setBalance] = useState<Balance | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isAuthenticated } = useAuth();

    const refreshBalance = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const newBalance = await balanceService.getUserBalance();
            setBalance(newBalance);
        } catch (err) {
            setError('Failed to fetch balance');
            console.error('Error fetching balance:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshTransactions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const newTransactions = await balanceService.getTransactionHistory();
            setTransactions(newTransactions);
        } catch (err) {
            setError('Failed to fetch transactions');
            console.error('Error fetching transactions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const claimDailyReward = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const newBalance = await balanceService.claimDailyReward();
            setBalance(newBalance);
        } catch (err) {
            setError('Failed to claim daily reward');
            console.error('Error claiming daily reward:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            refreshBalance();
            refreshTransactions();
        }
    }, [isAuthenticated]);

    return (
        <BalanceContext.Provider
            value={{
                balance,
                transactions,
                isLoading,
                error,
                refreshBalance,
                refreshTransactions,
                claimDailyReward
            }}
        >
            {children}
        </BalanceContext.Provider>
    );
};

export const useBalance = () => {
    const context = useContext(BalanceContext);
    if (context === undefined) {
        throw new Error('useBalance must be used within a BalanceProvider');
    }
    return context;
}; 