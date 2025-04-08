
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle, Users, Coins, Lock, Globe, Filter, LogIn, Link as LinkIcon } from "lucide-react";

interface GameRoom {
  id: string;
  name: string;
  betAmount: number;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: "waiting" | "full" | "in-progress";
  createdBy: string;
}

const Lobby = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [roomId, setRoomId] = useState("");

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
          isPrivate: false,
          status: "waiting",
          createdBy: "player123",
        },
        {
          id: "room2",
          name: "Beginners",
          betAmount: 50,
          playerCount: 1,
          maxPlayers: 2,
          isPrivate: false,
          status: "waiting",
          createdBy: "newbie42",
        },
        {
          id: "room3",
          name: "Fast Game",
          betAmount: 250,
          playerCount: 3,
          maxPlayers: 3,
          isPrivate: true,
          status: "full",
          createdBy: "speedster",
        },
        {
          id: "room4",
          name: "Tournament",
          betAmount: 100,
          playerCount: 4,
          maxPlayers: 4,
          isPrivate: false,
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
      toast.error("Not enough coins to join this room!");
      return;
    }

    navigate(`/room/${roomId}`);
  };

  const handleJoinPrivateRoom = () => {
    if (!roomId.trim()) {
      toast.error("Please enter a valid room ID");
      return;
    }

    // In a real app, you would validate the room ID here first
    navigate(`/room/${roomId}`);
    toast.success("Joining room...");
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(roomLink);
    toast.success("Room link copied to clipboard!");
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

  // Filter rooms based on selected player count
  const filteredRooms = playerFilter === "all" 
    ? rooms.filter(room => !room.isPrivate) // Only show public rooms
    : rooms.filter(room => room.maxPlayers === parseInt(playerFilter) && !room.isPrivate);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-game-cyan text-glow mb-4 md:mb-0">Game Lobby</h1>
          
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  className="bg-game-magenta hover:bg-game-magenta/80 text-white"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Join Private Room
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-game-cyan">Join Private Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomId">Room ID</Label>
                    <Input
                      id="roomId"
                      placeholder="Enter room ID..."
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="border-white/10 bg-black/30"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button
                      className="w-full bg-game-cyan hover:bg-game-cyan/80 text-black"
                      onClick={handleJoinPrivateRoom}
                    >
                      Join Room
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-game-yellow/50 text-game-yellow hover:bg-game-yellow/10"
                      onClick={copyRoomLink}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Copy Join Link
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
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

        {/* Player count filter */}
        <div className="mb-6 glass-panel p-4">
          <div className="flex items-center mb-2">
            <Filter className="mr-2 h-4 w-4" />
            <span className="font-semibold">Filter by player count:</span>
          </div>
          <RadioGroup
            value={playerFilter}
            onValueChange={setPlayerFilter}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center space-x-2 p-2 border border-white/20 rounded-md">
              <RadioGroupItem value="all" id="filter-all" />
              <Label htmlFor="filter-all">All Rooms</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 border border-white/20 rounded-md">
              <RadioGroupItem value="2" id="filter-2" />
              <Label htmlFor="filter-2">2 Players</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 border border-white/20 rounded-md">
              <RadioGroupItem value="3" id="filter-3" />
              <Label htmlFor="filter-3">3 Players</Label>
            </div>
            <div className="flex items-center space-x-2 p-2 border border-white/20 rounded-md">
              <RadioGroupItem value="4" id="filter-4" />
              <Label htmlFor="filter-4">4 Players</Label>
            </div>
          </RadioGroup>
        </div>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span className="text-game-magenta">Available Rooms</span>
              <Badge variant="outline" className="bg-black/30">
                <Users className="mr-1 h-4 w-4" /> 
                {filteredRooms.filter(room => room.status === "waiting").length} available
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading rooms...</div>
            ) : filteredRooms.length > 0 ? (
              <div className="grid gap-4">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="glass-panel p-4 flex flex-col md:flex-row justify-between items-center gap-4"
                  >
                    <div>
                      <h3 className="font-bold text-lg">
                        {room.name}
                        {room.isPrivate && (
                          <Lock className="inline-block ml-2 h-4 w-4 text-game-yellow" />
                        )}
                      </h3>
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
                      
                      <Badge variant="outline" className={getStatusColor(room.status)}>
                        {room.status === "waiting" ? "Waiting" : 
                         room.status === "full" ? "Full" : "In Progress"}
                      </Badge>
                      
                      {room.isPrivate ? (
                        <Badge variant="outline" className="bg-game-yellow/20 text-game-yellow">
                          <Lock className="mr-1 h-4 w-4" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-game-green/20 text-game-green">
                          <Globe className="mr-1 h-4 w-4" /> Public
                        </Badge>
                      )}
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
                <p className="text-gray-400">No rooms available matching your filter. Try another filter or be the first to create one!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Lobby;
