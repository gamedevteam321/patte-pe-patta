import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Plus, RefreshCw, Users, DoorOpen } from "lucide-react";
import RoomList from "@/components/rooms/RoomList";
import JoinByLink from "@/components/rooms/JoinByLink";
import { useSocket } from "@/context/SocketContext";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import JoinRoomDialog from "@/components/rooms/JoinRoomDialog";

const Lobby: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { fetchRooms, currentRoom, isConnected } = useSocket();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
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
  }, [isAuthenticated, navigate, fetchRooms]);

  const handleRejoinRoom = () => {
    if (currentRoom) {
      navigate(`/room/${currentRoom.id}`);
    }
  };

  // Only show rejoin button if game is in progress
  const shouldShowRejoinButton = currentRoom && currentRoom.status === 'playing';

  const handleJoinByCode = () => {
    // Implementation of handleJoinByCode function
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
                Join an existing room or create your own
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              {shouldShowRejoinButton && (
                <Button
                  onClick={handleRejoinRoom}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <DoorOpen className="mr-2 h-4 w-4" />
                  Rejoin Your Room
                </Button>
              )}
              <div className="flex flex-row gap-2 w-full max-w-md">
                <Button
                  onClick={() => navigate("/room/create")}
                  className="bg-game-blue hover:bg-game-green/80 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Room
                </Button>
                <JoinRoomDialog />
              </div>
            </div>
          </div>

          {/* Available Rooms Section */}
          <div className=" rounded-lg p-6">
            <RoomList />
          </div>

          {/* Join By Link Section */}
          {/* <JoinByLink /> */}
        </div>
      </div>
    </Layout>
  );
};

export default Lobby;
