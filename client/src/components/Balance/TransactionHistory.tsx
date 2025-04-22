import React from 'react';
import { useBalance } from '../../context/BalanceContext';
import { formatCurrency } from '../../utils/format';
import './TransactionHistory.css';

export const TransactionHistory: React.FC = () => {
    const { transactions, isLoading, error } = useBalance();

    if (isLoading) {
        return <div className="transactions-loading">Loading transactions...</div>;
    }

    if (error) {
        return <div className="transactions-error">{error}</div>;
    }

    if (!transactions || transactions.length === 0) {
        return <div className="transactions-empty">No transactions found</div>;
    }

    return (
        <div className="transactions-container">
            <h2>Transaction History</h2>
            <div className="transactions-list">
                {transactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-item">
                        <div className="transaction-info">
                            <span className="transaction-description">
                                {transaction.description}
                            </span>
                            <span className="transaction-date">
                                {new Date(transaction.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div className={`transaction-amount ${transaction.type}`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 