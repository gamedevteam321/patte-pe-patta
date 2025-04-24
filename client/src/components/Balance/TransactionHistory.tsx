import React from 'react';
import { formatCurrency } from '../../utils/format';
import { Transaction } from '../../services/api/balance';
import './TransactionHistory.css';

interface TransactionHistoryProps {
    transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
    if (!transactions || transactions.length === 0) {
        return <div className="transactions-empty">No transactions found</div>;
    }

    return (
        <div className="transactions-container">
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