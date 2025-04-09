
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

const Lobby: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { fetchRooms, currentRoom } = useSocket();
  const navigate = useNavigate();

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
    
    // Set up interval to refresh rooms periodically
    const intervalId = setInterval(() => {
      fetchRooms();
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, navigate, fetchRooms, currentRoom]);

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
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-game-cyan text-glow">Patte pe Patta</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Fast-paced multiplayer card game
          </p>
          <p className="text-yellow-400 mb-8">Join a game or create your own room</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-2/3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-game-cyan">Available Rooms</h2>
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
          
          <div className="md:w-1/3 space-y-6">
            <div className="text-center mb-6">
              <div className="inline-block bg-yellow-400/20 p-4 rounded-lg mb-3">
                <Users className="h-12 w-12 text-yellow-400 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Quick Play</h3>
              <p className="text-sm text-gray-400">Create a room or join an existing game</p>
            </div>
            
            <Button
              onClick={() => navigate("/room/create")}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-6 text-lg"
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
              className="w-full bg-blue-500 hover:bg-blue-600 text-white p-6 text-lg"
            >
              Join Room
            </Button>
            
            <JoinByLink />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Lobby;
