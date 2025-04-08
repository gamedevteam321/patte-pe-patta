
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle, Users, Coins } from "lucide-react";

interface GameRoom {
  id: string;
  name: string;
  betAmount: number;
  playerCount: number;
  maxPlayers: number;
  status: "waiting" | "full" | "in-progress";
  createdBy: string;
}

const Lobby = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Simulate fetching rooms from API
    setTimeout(() => {
      const mockRooms: GameRoom[] = [
        {
          id: "room1",
          name: "High Stakes",
          betAmount: 500,
          playerCount: 2,
          maxPlayers: 4,
          status: "waiting",
          createdBy: "player123",
        },
        {
          id: "room2",
          name: "Beginners",
          betAmount: 50,
          playerCount: 1,
          maxPlayers: 2,
          status: "waiting",
          createdBy: "newbie42",
        },
        {
          id: "room3",
          name: "Fast Game",
          betAmount: 250,
          playerCount: 3,
          maxPlayers: 3,
          status: "full",
          createdBy: "speedster",
        },
        {
          id: "room4",
          name: "Tournament",
          betAmount: 100,
          playerCount: 4,
          maxPlayers: 4,
          status: "in-progress",
          createdBy: "champ99",
        },
      ];
      setRooms(mockRooms);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleJoinRoom = (roomId: string, betAmount: number) => {
    if (!user) return;

    if (user.coins < betAmount) {
      alert("Not enough coins to join this room!");
      return;
    }

    navigate(`/room/${roomId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-game-green/20 text-game-green";
      case "full":
        return "bg-game-yellow/20 text-game-yellow";
      case "in-progress":
        return "bg-game-magenta/20 text-game-magenta";
      default:
        return "bg-gray-700/20 text-gray-400";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-game-cyan text-glow mb-4 md:mb-0">Game Lobby</h1>
          
          <div className="flex items-center space-x-4">
            <Button
              className="bg-game-green hover:bg-game-green/80 text-black"
              onClick={() => navigate("/room/create")}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </div>
        </div>

        {user && (
          <div className="mb-6 glass-panel p-4 flex justify-between items-center">
            <div className="flex items-center">
              <p className="mr-4">Welcome, <span className="font-bold">{user.username}</span></p>
            </div>
            <div className="flex items-center text-game-yellow">
              <Coins className="mr-2 h-4 w-4" />
              <span className="font-bold">{user.coins}</span> coins
            </div>
          </div>
        )}

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="text-game-magenta">Available Rooms</span>
              <Badge variant="outline" className="bg-black/30">
                <Users className="mr-1 h-4 w-4" /> 
                {rooms.filter(room => room.status === "waiting").length} available
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading rooms...</div>
            ) : rooms.length > 0 ? (
              <div className="grid gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="glass-panel p-4 flex flex-col md:flex-row justify-between items-center gap-4"
                  >
                    <div>
                      <h3 className="font-bold text-lg">{room.name}</h3>
                      <p className="text-sm text-gray-400">Created by {room.createdBy}</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-black/30 flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {room.playerCount}/{room.maxPlayers}
                      </Badge>
                      
                      <Badge variant="outline" className="bg-black/30 flex items-center">
                        <Coins className="mr-1 h-4 w-4" />
                        {room.betAmount}
                      </Badge>
                      
                      <Badge variant="outline" className={`${getStatusColor(room.status)}`}>
                        {room.status === "waiting" ? "Waiting" : 
                         room.status === "full" ? "Full" : "In Progress"}
                      </Badge>
                    </div>
                    
                    <Button
                      onClick={() => handleJoinRoom(room.id, room.betAmount)}
                      disabled={room.status !== "waiting" || (user && user.coins < room.betAmount)}
                      className={`${
                        room.status === "waiting"
                          ? "bg-game-cyan hover:bg-game-cyan/80 text-black"
                          : "bg-gray-600/50 cursor-not-allowed text-gray-400"
                      }`}
                    >
                      {room.status === "waiting"
                        ? "Join Room"
                        : room.status === "full"
                        ? "Room Full"
                        : "In Progress"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No rooms available. Be the first to create one!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Lobby;
