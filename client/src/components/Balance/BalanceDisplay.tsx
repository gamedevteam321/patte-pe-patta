import React from 'react';
import { useBalance } from '../../context/BalanceContext';
import { formatCurrency } from '../../utils/format';
import './BalanceDisplay.css';

export const BalanceDisplay: React.FC = () => {
    const { balance, isLoading, error, claimDailyReward } = useBalance();

    if (isLoading) {
        return <div className="balance-loading">Loading balance...</div>;
    }

    if (error) {
        return <div className="balance-error">{error}</div>;
    }

    if (!balance) {
        return <div className="balance-error">No balance data available</div>;
    }

    return (
        <div className="balance-container">
            <div className="balance-section">
                <h3>Real Money Balance</h3>
                <div className="balance-amount">{formatCurrency(balance.real)}</div>
            </div>
            <div className="balance-section">
                <h3>Demo Balance</h3>
                <div className="balance-amount">{formatCurrency(balance.demo)}</div>
            </div>
            <button 
                className="claim-reward-button"
                onClick={claimDailyReward}
            >
                Claim Daily Reward
            </button>
        </div>
    );
}; 