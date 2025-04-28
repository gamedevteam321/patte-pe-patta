import React from 'react';
import { formatCurrency } from '../../utils/format';
import { Transaction } from '../../services/api/balance';

interface TransactionHistoryProps {
    transactions: Transaction[];
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
    if (!transactions || transactions.length === 0) {
        return (
            <div className="text-center p-5 text-gray-600 bg-gray-50 rounded-md">
                No transactions found
            </div>
        );
    }

    return (
        <div className="bg-[#0F212E] relative rounded-lg shadow-sm p-5 max-w-3xl mx-auto my-5">
            <div className="flex flex-col gap-3">
                {transactions.map((transaction) => (
                    <div 
                        key={transaction.id} 
                        className="flex justify-between items-center p-4 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    >
                        <div className="flex flex-col gap-1">
                            <span className="font-medium text-white">
                            {Number(transaction.amount) > 0 ? 'credit' : 'debit'}
                            </span>
                            <span className="text-sm text-white">
                                {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                        <div className={`font-bold text-lg ${ Number(transaction.amount) > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {Number(transaction.amount) > 0 ? '+' : ''}
                            {formatCurrency(transaction.amount)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 