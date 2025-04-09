
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

  const filteredRooms = availableRooms.filter(room => {
    if (filterPrivate !== null && room.isPrivate !== filterPrivate) return false;
    if (filterPlayers !== null && room.maxPlayers !== filterPlayers) return false;
    return room.status === "waiting"; // Only show rooms waiting for players
  });

  const handleJoinRoom = async (roomId: string, password?: string) => {
    try {
      const success = await joinRoom(roomId, password);
      if (success) {
        navigate(`/room/${roomId}`);
      } else {
        toast({
          title: "Failed to join room",
          description: "The room may not exist, is full, or the password is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive",
      });
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
        >
          All Rooms
        </Button>
        <Button 
          variant={filterPrivate === false ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPrivate(false)}
        >
          Public Only
        </Button>
        <Button 
          variant={filterPrivate === true ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPrivate(true)}
        >
          Private Only
        </Button>
        <div className="w-px h-6 bg-gray-500 mx-2 my-auto"></div>
        <Button 
          variant={filterPlayers === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(null)}
        >
          Any Size
        </Button>
        <Button 
          variant={filterPlayers === 2 ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(2)}
        >
          2 Players
        </Button>
        <Button 
          variant={filterPlayers === 3 ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(3)}
        >
          3 Players
        </Button>
        <Button 
          variant={filterPlayers === 4 ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterPlayers(4)}
        >
          4 Players
        </Button>
      </div>

      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="glass-panel hover:border-game-cyan/50 transition-all">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold text-game-cyan">
                      {room.name}
                    </h3>
                    {room.isPrivate && (
                      <Lock className="ml-2 h-4 w-4 text-game-yellow" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Host: {room.host}</div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {room.playerCount}/{room.maxPlayers} Players
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Waiting
                    </span>
                  </div>
                </div>
                <Button 
                  className="bg-game-cyan hover:bg-game-cyan/80 text-black"
                  onClick={() => room.isPrivate ? openJoinDialog(room.id) : handleJoinRoom(room.id)}
                >
                  {room.isPrivate ? "Enter Code" : "Join"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 glass-panel">
          <p className="text-lg text-muted-foreground">No active rooms found</p>
          <p className="text-sm text-muted-foreground">Create a new room to start playing!</p>
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
