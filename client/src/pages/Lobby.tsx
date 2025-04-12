import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Plus, RefreshCw, Users } from "lucide-react";
import RoomList from "@/components/rooms/RoomList";
import JoinByLink from "@/components/rooms/JoinByLink";
import { useSocket } from "@/context/SocketContext";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const Lobby: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { fetchRooms, currentRoom } = useSocket();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // If user is already in a room, redirect to that room
    if (currentRoom) {
      toast({
        title: "Rejoining room",
        description: "You were already in a game room."
      });
      navigate(`/room/${currentRoom.id}`);
      return;
    }

    // Initial room fetch
    fetchRooms();
  }, [isAuthenticated, navigate, currentRoom, fetchRooms]);

  const handleRefresh = () => {
    console.log("Manually refreshing room list");
    toast({
      title: "Refreshing rooms",
      description: "Getting the latest available rooms"
    });
    fetchRooms();
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[#4169E1] text-glow">Patte pe Patta</h1>
          <p className="text-base md:text-lg text-muted-foreground mb-2 md:mb-4">
            Fast-paced multiplayer card game
          </p>
          <p className="text-yellow-400 mb-6 md:mb-8">Join a game or create your own room</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          <div className="w-full md:w-2/3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-[#4169E1]">Available Rooms</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <RoomList />
          </div>
          
          <div className="w-full md:w-1/3 space-y-4 md:space-y-6">
            <div className="text-center mb-4 md:mb-6">
              <div className="inline-block bg-yellow-400/20 p-4 rounded-lg mb-3">
                <Users className="h-10 w-10 md:h-12 md:w-12 text-yellow-400 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Quick Play</h3>
              <p className="text-sm text-gray-400">Create a room or join an existing game</p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => navigate("/room/create")}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-4 md:p-6 text-base md:text-lg"
              >
                <Plus className="mr-2 h-5 w-5" /> Create Room
              </Button>
              
              <Button
                onClick={() => {
                  const publicRooms = document.querySelectorAll('[data-public-room]');
                  if (publicRooms.length > 0) {
                    const firstButton = publicRooms[0].querySelector('button');
                    if (firstButton) firstButton.click();
                  } else {
                    toast({
                      title: "No rooms available",
                      description: "Try creating a new room instead"
                    });
                  }
                }}
                className="w-full bg-[#4169E1] hover:bg-[#3158c4] text-white p-4 md:p-6 text-base md:text-lg"
              >
                Join Room
              </Button>
            </div>
            
            <JoinByLink />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Lobby;
