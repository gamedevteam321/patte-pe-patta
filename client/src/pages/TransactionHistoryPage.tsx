import React, { useState, useEffect } from 'react';
import { useBalance } from '../context/BalanceContext';
import { TransactionHistory } from '../components/Balance/TransactionHistory';
import { balanceService } from '../services/api/balance';
import { BalanceType } from '../types/balance';
import './TransactionHistoryPage.css';

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
        <div className="transaction-history-page text-gray-400">
            <h1>Transaction History</h1>
            
            <div className="filters">
                <div className="filter-group">
                    <label htmlFor="balanceType">Balance Type:</label>
                    <select
                        id="balanceType"
                        value={filterType}
                        onChange={(e) => handleFilterChange(e.target.value as BalanceType | 'all')}
                    >
                        <option value="all">All</option>
                        <option value="demo">Demo</option>
                        <option value="real">Real</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="transactionType">Transaction Type:</label>
                    <select
                        id="transactionType"
                        value={filterTransactionType}
                        onChange={(e) => handleTransactionTypeChange(e.target.value)}
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
                <div className="pagination">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}; 