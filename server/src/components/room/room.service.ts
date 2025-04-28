import { supabase } from '../../lib/supabase';
import { processRoomRefund } from '../balance/balance.service';

export class RoomService {
    static async getRoomById(roomId: string) {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error) {
            console.error('Error fetching room:', error);
            throw new Error(`Failed to fetch room: ${error.message}`);
        }

        return data;
    }

    static async checkAndProcessRefund(roomId: string) {
        try {
            const room = await this.getRoomById(roomId);
            
            // Check if room exists and has no players joined
            if (!room || room.player_count > 1) {
                return;
            }

            // Get the room creator's ID
            const creatorId = room.created_by;

            // Process the refund
            await processRoomRefund(
                roomId,
                creatorId,
                room.entry_fee,
                room.balance_type,
                room.id // Using room ID as transaction ID
            );

            // Update room status to indicate refund processed
            await supabase
                .from('rooms')
                .update({ status: 'refunded' })
                .eq('id', roomId);

        } catch (error) {
            console.error('Error in checkAndProcessRefund:', error);
            throw error;
        }
    }

    static async refundRoomEntryFee(roomId: string, userId: string, amount: number): Promise<void> {
        try {
            await processRoomRefund(roomId, userId, amount, 'game_win');
        } catch (error) {
            console.error('Error refunding room entry fee:', error);
            throw error;
        }
    }
} 