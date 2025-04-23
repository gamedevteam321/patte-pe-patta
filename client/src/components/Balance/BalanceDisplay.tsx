import React, { useEffect } from 'react';
import { useBalance } from '../../context/BalanceContext';
import { formatCurrency } from '../../utils/format';
import { useSocket } from '../../context/SocketContext';
import './BalanceDisplay.css';

export const BalanceDisplay: React.FC = () => {
    const { balance, isLoading, error, refreshBalance } = useBalance();
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleBalanceUpdate = (data: { demo: number; real: number }) => {
            refreshBalance();
        };

        socket.on('balance:update', handleBalanceUpdate);

        return () => {
            socket.off('balance:update', handleBalanceUpdate);
        };
    }, [socket, refreshBalance]);

    if (isLoading) {
        return <div className="balance-loading">Loading balance...</div>;
    }

    if (error) {
        return (
            <div className="balance-error">
                <span>Error loading balance</span>
                <button 
                    onClick={refreshBalance}
                    className="balance-retry-button"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!balance) {
        return null;
    }

    return (
        <div className="balance-container">
            {/* <div className="balance-section">
                <span className="balance-label">Balance:</span>
                <span className="balance-amount">{formatCurrency(balance.real)}</span>
            </div> */}
            <div className="balance-section">
                <span className="balance-label">Balance:</span>
                <span className="balance-amount">{formatCurrency(balance.demo)}</span>
            </div>
        </div>
    );
}; 