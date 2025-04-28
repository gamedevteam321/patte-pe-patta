import React, { useState, useEffect } from 'react';
import { useBalance } from '../context/BalanceContext';
import { TransactionHistory } from '../components/Balance/TransactionHistory';
import { balanceService } from '../services/api/balance';
import { BalanceType } from '../types/balance';
import Layout from '../components/Layout';

const ITEMS_PER_PAGE = 10;

export const TransactionHistoryPage: React.FC = () => {
    const { transactions, refreshTransactions } = useBalance();
    const [currentPage, setCurrentPage] = useState(1);
    const [filterType, setFilterType] = useState<BalanceType | 'all'>('all');
    const [filterTransactionType, setFilterTransactionType] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(false);

    const transactionTypes = [
        'all',
        'deposit',
        'withdrawal',
        'game_win',
        'game_loss',
        'room_entry',
        'room_exit',
        'referral_bonus',
        'daily_bonus',
        'achievement_bonus',
        'tournament_entry',
        'tournament_prize',
        'event_bonus'
    ];

    const filteredTransactions = transactions.filter(transaction => {
        const typeMatch = filterType === 'all' || transaction.balanceType === filterType;
        const transactionTypeMatch = filterTransactionType === 'all' || 
            transaction.transactionType === filterTransactionType;
        return typeMatch && transactionTypeMatch;
    });

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    useEffect(() => {
        refreshTransactions();
    }, []);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleFilterChange = (type: BalanceType | 'all') => {
        setFilterType(type);
        setCurrentPage(1);
    };

    const handleTransactionTypeChange = (type: string) => {
        setFilterTransactionType(type);
        setCurrentPage(1);
    };

    return (
        <Layout>
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-center text-white mb-8">Transaction History</h1>
                
                <div className="flex flex-wrap gap-6 mb-8">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="balanceType" className="text-sm font-medium text-white">Balance Type:</label>
                        <select
                            id="balanceType"
                            value={filterType}
                            onChange={(e) => handleFilterChange(e.target.value as BalanceType | 'all')}
                            className="min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        >
                            <option value="all">All</option>
                            <option value="demo">Demo</option>
                            <option value="real">Real</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="transactionType" className="text-sm font-medium text-white">Transaction Type:</label>
                        <select
                            id="transactionType"
                            value={filterTransactionType}
                            onChange={(e) => handleTransactionTypeChange(e.target.value)}
                            className="min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        >
                            {transactionTypes.map(type => (
                                <option key={type} value={type}>
                                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <TransactionHistory transactions={paginatedTransactions} />

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-black"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-black">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-black"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    );
}; 