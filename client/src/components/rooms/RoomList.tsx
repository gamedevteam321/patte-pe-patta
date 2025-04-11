
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/context/SocketContext";
import { Lock, Users, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import JoinRoomDialog from './JoinRoomDialog';

const RoomList: React.FC = () => {
  const { availableRooms, joinRoom } = useSocket();
  const [filterPrivate, setFilterPrivate] = useState<boolean | null>(null);
  const [filterPlayers, setFilterPlayers] = useState<number | null>(null);
  const navigate = useNavigate();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const filteredRooms = availableRooms.filter(room => {
    if (filterPrivate !== null && room.is_private !== filterPrivate) return false;
    if (filterPlayers !== null && room.max_players !== filterPlayers) return false;
    return room.status === "waiting"; // Only show rooms waiting for players
  });

  const handleJoinRoom = async (roomId: string, password?: string) => {
    try {
      setIsJoining(true);
      console.log("Attempting to join room:", roomId);
      
      // Check if room exists in available rooms
      const room = availableRooms.find(r => r.id === roomId);
      if (!room) {
        toast({
          title: "Room not found",
          description: "The room you're trying to join doesn't exist.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }
      
      // Force a small delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const success = await joinRoom(roomId, password);
      
      if (success) {
        setIsJoinDialogOpen(false);
        toast({
          title: "Success!",
          description: "You've joined the room successfully.",
        });
        navigate(`/room/${roomId}`);
      } else {
        toast({
          title: "Failed to join room",
          description: "The room may be full or the password is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const openJoinDialog = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsJoinDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button 
          variant={filterPrivate === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPrivate(null)}
          className={filterPrivate === null ? "bg-game-blue text-white" : "border-white/20 text-white"}
        >
          All Rooms
        </Button>
        <Button 
          variant={filterPrivate === false ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPrivate(false)}
          className={filterPrivate === false ? "bg-game-green text-white" : "border-white/20 text-white"}
        >
          Public Only
        </Button>
        <Button 
          variant={filterPrivate === true ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPrivate(true)}
          className={filterPrivate === true ? "bg-game-yellow text-black" : "border-white/20 text-white"}
        >
          Private Only
        </Button>
        <div className="w-px h-6 bg-gray-500 mx-2 my-auto"></div>
        <Button 
          variant={filterPlayers === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(null)}
          className={filterPlayers === null ? "bg-game-blue text-white" : "border-white/20 text-white"}
        >
          Any Size
        </Button>
        <Button 
          variant={filterPlayers === 2 ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(2)}
          className={filterPlayers === 2 ? "bg-game-blue text-white" : "border-white/20 text-white"}
        >
          2 Players
        </Button>
        <Button 
          variant={filterPlayers === 3 ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(3)}
          className={filterPlayers === 3 ? "bg-game-blue text-white" : "border-white/20 text-white"}
        >
          3 Players
        </Button>
        <Button 
          variant={filterPlayers === 4 ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(4)}
          className={filterPlayers === 4 ? "bg-game-blue text-white" : "border-white/20 text-white"}
        >
          4 Players
        </Button>
      </div>

      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRooms.map((room) => (
            <Card 
              key={room.id} 
              className="glass-panel bg-game-card hover:border-game-green/50 transition-all"
              data-public-room={!room.is_private ? true : undefined}
            >
              <CardContent className="p-4 flex justify-between items-center">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-game-green">
                      {room.name}
                    </h3>
                    {room.is_private && (
                      <Lock className="ml-2 h-4 w-4 text-game-yellow" />
                    )}
                  </div>
                  <div className="text-sm text-white/70">Host: {room.host_name}</div>
                  <div className="flex items-center gap-4 text-sm text-white/80">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {room.player_count}/{room.max_players} Players
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Waiting
                    </span>
                  </div>
                </div>
                <Button 
                  className={room.is_private 
                    ? "bg-game-yellow hover:bg-game-yellow/80 text-black" 
                    : "bg-game-green hover:bg-game-green/80 text-white"}
                  onClick={() => room.is_private ? openJoinDialog(room.id) : handleJoinRoom(room.id)}
                  disabled={isJoining}
                >
                  {room.is_private ? "Enter Code" : "Join"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 glass-panel bg-game-card">
          <p className="text-lg text-white/80">No active rooms found</p>
          <p className="text-sm text-white/60">Create a new room to start playing!</p>
        </div>
      )}

      <JoinRoomDialog
        isOpen={isJoinDialogOpen}
        setIsOpen={setIsJoinDialogOpen}
        roomId={selectedRoomId}
        onJoin={handleJoinRoom}
      />
    </div>
  );
};

export default RoomList;
