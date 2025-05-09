import { Router, Response, Request } from 'express';
import { BalanceService } from '../components/balance/balance.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { BalanceType } from '../types/balance';
import { z } from 'zod';

const router = Router();

// Get user balance
router.get('/balance', authMiddleware, async (req: Request, res: Response) => {
    try {
        const userBalance = await BalanceService.getUserBalance((req as any).user.id);
        // Transform the balance to match client expectations
        const balance = {
            real: userBalance.real_balance,
            demo: userBalance.demo_balance
        };
        res.json(balance);
    } catch (error) {
        console.error('Error getting user balance:', error);
        res.status(500).json({ error: 'Failed to get user balance' });
    }
});

// Get transaction history with filters
router.get('/transactions', authMiddleware, validateRequest(z.object({
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
    balanceType: z.enum(['demo', 'real', 'all']).default('all'),
    transactionType: z.string().default('all')
})), async (req: Request, res: Response) => {
    try {
        const { limit, offset, balanceType, transactionType } = req.query;
        const transactions = await BalanceService.getTransactionHistory(
            (req as any).user.id,
            Number(limit),
            Number(offset),
            balanceType as BalanceType | 'all',
            transactionType as string
        );
        res.json(transactions);
    } catch (error) {
        console.error('Error getting transaction history:', error);
        res.status(500).json({ error: 'Failed to get transaction history' });
    }
});

// Claim daily reward
router.post('/daily-reward', authMiddleware, async (req: Request, res: Response) => {
    try {
        const newBalance = await BalanceService.claimDailyReward((req as any).user.id);
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
})), async (req: Request, res: Response) => {
    try {
        const { isWinner, amount, balanceType } = req.body;
        const newBalance = await BalanceService.processGameResult(
            (req as any).user.id,
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
router.post('/tournaments/:tournamentId/join', authMiddleware, async (req: Request, res: Response) => {
    try {
        const newBalance = await BalanceService.joinTournament(
            (req as any).user.id,
            req.params.tournamentId
        );
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error joining tournament:', error);
        res.status(500).json({ error: 'Failed to join tournament' });
    }
});

// Process referral bonus
router.post('/referral/:referredId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const newBalance = await BalanceService.processReferralBonus(
            (req as any).user.id,
            req.params.referredId
        );
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error processing referral bonus:', error);
        res.status(500).json({ error: 'Failed to process referral bonus' });
    }
});

// Check if user can join room
router.get('/can-join-room/:roomId', authMiddleware, async (req: Request, res: Response) => {
    try {
        const canJoin = await BalanceService.canJoinRoom(
            (req as any).user.id,
            req.params.roomId
        );
        res.json({ canJoin });
    } catch (error) {
        console.error('Error checking room eligibility:', error);
        res.status(500).json({ error: 'Failed to check room eligibility' });
    }
});

// Process room entry fee
router.post('/room-entry', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { roomId, amount, balanceType } = req.body;
        const newBalance = await BalanceService.processRoomEntry(
            (req as any).user.id,
            roomId,
            amount,
            balanceType
        );
        res.json({ balance: newBalance });
    } catch (error) {
        console.error('Error processing room entry:', error);
        res.status(500).json({ error: 'Failed to process room entry' });
    }
});

export default router; 