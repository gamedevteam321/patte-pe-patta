import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Plus, RefreshCw, Users, DoorOpen, Clock, Coins, PlayCircle, Key } from "lucide-react";
import RoomList from "@/components/rooms/RoomList";
import { useSocket } from "@/context/SocketContext";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RoomType } from "@/types/game";
import { RoomData } from "@/context/SocketContext";

const Lobby: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { fetchRooms, currentRoom, isConnected, availableRooms, joinRoom } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [isJoinByCodeDialogOpen, setIsJoinByCodeDialogOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [joinError, setJoinError] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Get room type from URL or navigation state
    const gameType = searchParams.get('game') || (location.state as { roomType?: string })?.roomType;
    if (gameType) {
      setSelectedRoomType(gameType as RoomType);
    }

    // Initial room fetch
    const loadRooms = async () => {
      try {
        setIsLoading(true);
        await fetchRooms();
      } catch (error) {
        console.error('Error loading rooms:', error);
        toast({
          title: "Error",
          description: "Failed to load rooms. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadRooms();
  }, [isAuthenticated, navigate, fetchRooms, searchParams, location.state]);

  // Filter rooms by selected room type
  const filteredRooms = selectedRoomType
    ? availableRooms.filter(room => room.roomType === selectedRoomType)
    : availableRooms;

  const handleRejoinRoom = () => {
    if (currentRoom) {
      navigate(`/room/${currentRoom.id}`);
    }
  };

  // Only show rejoin button if game is in progress
  const shouldShowRejoinButton = currentRoom && currentRoom.status === 'playing';

  const handleJoinByCode = async () => {
    if (!roomCode) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive"
      });
      return;
    }

    try {
      const success = await joinRoom(roomCode, password);
      if (success) {
        setIsJoinByCodeDialogOpen(false);
        setRoomCode("");
        setPassword("");
        navigate(`/room/${roomCode}`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-blue-300">Connecting to server...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-blue-300">Loading rooms...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Patte pe Patta</h1>
              <p className="text-muted-foreground mt-1">
                {selectedRoomType 
                  ? `${selectedRoomType.charAt(0).toUpperCase() + selectedRoomType.slice(1)} Rooms`
                  : 'Join an existing room or create your own'}
              </p>
            </div>
           
          </div>

          {/* Room List Section */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              {/* <h2 className="text-xl font-semibold text-white">
                {selectedRoomType 
                  ? `${selectedRoomType.charAt(0).toUpperCase() + selectedRoomType.slice(1)} Rooms`
                  : 'All Rooms'}
              </h2> */}
              <div className="flex gap-2">
                <Button
                 
                  onClick={() => setIsJoinByCodeDialogOpen(true)}
                  className="bg-game-cyan hover:bg-game-cyan/80"
                >
                  <Key className="h-4 w-4" />
                  Join by Code
                </Button>
                
                <Button
                  onClick={() => navigate(`/room/create${selectedRoomType ? `?game=${selectedRoomType}` : ''}`)}
                  className="bg-game-cyan hover:bg-game-cyan/80"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room
                </Button>
              </div>
            </div>
            <RoomList roomType={selectedRoomType} />
          </div>
        </div>
      </div>

      {/* Join by Code Dialog */}
      <Dialog open={isJoinByCodeDialogOpen} onOpenChange={setIsJoinByCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Room by Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Enter room password (if private)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={handleJoinByCode}
            >
              Join Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Lobby;
