import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Coins, RefreshCw } from "lucide-react";
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';
import JoinRoomDialog from './JoinRoomDialog';
import { toast } from '@/hooks/use-toast';

interface RoomItem {
  id: string;
  code: string;
  status: string;
  created_by: string;
  max_players: number;
  player_count: number;
  amount_stack: number;
  roomName: string;
  hostName: string;
  isPrivate: boolean;
  isFull: boolean;
}

const RoomList: React.FC = () => {
  const { availableRooms, fetchRooms, joinRoom } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRooms();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleJoinClick = (roomId: string, isPrivate: boolean) => {
    if (isPrivate) {
      setSelectedRoom(roomId);
      setIsDialogOpen(true);
    } else {
      handleJoinRoom(roomId);
    }
  };

  const handleJoinRoom = async (roomId: string, password?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to join a room",
        variant: "destructive"
      });
      return;
    }
    
    const success = await joinRoom(roomId, password);
    if (success) {
      navigate(`/game/${roomId}`);
    }
  };

  // Cast availableRooms to the proper interface
  const rooms = availableRooms as unknown as RoomItem[];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Available Rooms</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="pt-6 text-center">
            <p>No rooms available. Create a new room to start playing!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className={`${room.isFull ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="truncate">{room.roomName || "Game Room"}</CardTitle>
                  {room.isPrivate && <Lock className="h-4 w-4 text-orange-500" />}
                </div>
                <CardDescription>
                  Hosted by {room.hostName || "Anonymous"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-1" />
                    {room.player_count}/{room.max_players} Players
                  </div>
                  {room.amount_stack > 0 && (
                    <div className="flex items-center text-sm">
                      <Coins className="h-4 w-4 mr-1" />
                      {room.amount_stack} Coins
                    </div>
                  )}
                </div>
                <Badge className={room.isFull ? "bg-muted text-muted-foreground" : ""}>
                  {room.isFull ? "Full" : "Waiting for players"}
                </Badge>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  disabled={room.isFull}
                  onClick={() => handleJoinClick(room.id, room.isPrivate)}
                >
                  {room.isFull ? "Room Full" : "Join Room"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedRoom && (
        <JoinRoomDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          roomId={selectedRoom}
          onJoin={handleJoinRoom}
        />
      )}
    </div>
  );
};

export default RoomList;
