import { supabase } from "@/lib/supabase";

export const roomService = {
  async joinRoom(roomId: string) {
    const { error } = await supabase
      .from('room_players')
      .insert({ room_id: roomId });
    
    if (error) throw error;
  },

  async leaveRoom(roomId: string) {
    const { error } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', roomId);
    
    if (error) throw error;
  }
}; 