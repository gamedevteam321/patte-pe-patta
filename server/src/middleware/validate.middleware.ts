import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errorHandler';

export const validateRequest = (schema: z.ZodType<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = schema.parse(req.body);
            req.body = validatedData;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message
                }));
                next(new ValidationError(JSON.stringify(errors)));
            } else {
                next(error);
            }
        }
    };
};

// Example schemas
export const gameResultSchema = z.object({
    isWinner: z.boolean(),
    amount: z.number().min(0),
    balanceType: z.enum(['demo', 'real'])
});

export const dailyRewardSchema = z.object({
    userId: z.string().uuid()
});

export const tournamentJoinSchema = z.object({
    tournamentId: z.string().uuid(),
    userId: z.string().uuid()
}); 