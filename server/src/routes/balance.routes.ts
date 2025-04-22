import { Router } from 'express';
import { BalanceService } from '../components/balance/balance.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { BalanceType } from '../types/balance';
import { z } from 'zod';

const router = Router();

// Get user balance
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const balance = await BalanceService.getUserBalance(req.user.id);
        res.json(balance);
    } catch (error) {
        console.error('Error getting user balance:', error);
        res.status(500).json({ error: 'Failed to get user balance' });
    }
});

// Get transaction history
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { limit = 50, offset = 0 } = req.query;
        const transactions = await BalanceService.getTransactionHistory(
            req.user.id,
            Number(limit),
            Number(offset)
        );
        res.json(transactions);
    } catch (error) {
        console.error('Error getting transaction history:', error);
        res.status(500).json({ error: 'Failed to get transaction history' });
    }
});

// Claim daily reward
router.post('/daily-reward', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const newBalance = await BalanceService.claimDailyReward(req.user.id);
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error claiming daily reward:', error);
        res.status(500).json({ error: 'Failed to claim daily reward' });
    }
});

// Process game result
router.post('/game-result', authMiddleware, validateRequest(z.object({
    isWinner: z.boolean(),
    amount: z.number().min(0),
    balanceType: z.enum(['demo', 'real'])
})), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { isWinner, amount, balanceType } = req.body;
        const newBalance = await BalanceService.processGameResult(
            req.user.id,
            isWinner,
            amount,
            balanceType as BalanceType
        );
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error processing game result:', error);
        res.status(500).json({ error: 'Failed to process game result' });
    }
});

// Join tournament
router.post('/tournaments/:tournamentId/join', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const newBalance = await BalanceService.joinTournament(
            req.user.id,
            req.params.tournamentId
        );
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error joining tournament:', error);
        res.status(500).json({ error: 'Failed to join tournament' });
    }
});

// Process referral bonus
router.post('/referral/:referredId', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const newBalance = await BalanceService.processReferralBonus(
            req.user.id,
            req.params.referredId
        );
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error processing referral bonus:', error);
        res.status(500).json({ error: 'Failed to process referral bonus' });
    }
});

// Check if user can join room
router.get('/can-join-room/:roomId', authMiddleware, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const canJoin = await BalanceService.canJoinRoom(
            req.user.id,
            req.params.roomId
        );
        res.json({ canJoin });
    } catch (error) {
        console.error('Error checking room eligibility:', error);
        res.status(500).json({ error: 'Failed to check room eligibility' });
    }
});

export default router; 