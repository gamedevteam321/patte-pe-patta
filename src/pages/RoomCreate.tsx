
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Users, Coins, Info, Lock, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const RoomCreate: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { createRoom } = useSocket();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState<string>("4");
  const [betAmount, setBetAmount] = useState<string>("50");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to create a room",
        variant: "destructive"
      });
      navigate("/login");
      return;
    }
    
    const betAmountNum = parseInt(betAmount);
    
    if (user.coins < betAmountNum) {
      toast({
        title: "Insufficient Coins",
        description: "You don't have enough coins for this bet amount!",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const roomConfig = {
        name: roomName.trim() || `${user.username || 'Player'}'s Room`,
        playerCount: parseInt(playerCount),
        betAmount: betAmountNum,
        isPrivate
      };
      
      console.log("Creating room with:", roomConfig);

      const roomId = await createRoom(roomConfig);
      
      if (roomId) {
        toast({
          title: "Success",
          description: "Room created successfully!"
        });
        navigate(`/room/${roomId}`);
      } else {
        toast({
          title: "Error",
          description: "Failed to create room. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in handleCreateRoom:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const betOptions = [
    { value: "50", label: "50 coins", disabled: user ? user.coins < 50 : true },
    { value: "100", label: "100 coins", disabled: user ? user.coins < 100 : true },
    { value: "250", label: "250 coins", disabled: user ? user.coins < 250 : true },
    { value: "500", label: "500 coins", disabled: user ? user.coins < 500 : true }
  ];

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-game-cyan text-glow">Create Game Room</h1>

        <Card className="glass-panel border-white/10">
          <form onSubmit={handleCreateRoom}>
            <CardHeader>
              <CardTitle className="text-game-magenta">Room Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Room Name */}
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  placeholder="Enter a name for your room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={20}
                  className="bg-black/50 border-white/20"
                />
              </div>

              {/* Player Count */}
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Number of Players
                </Label>
                <RadioGroup
                  value={playerCount}
                  onValueChange={setPlayerCount}
                  className="flex justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="players-2" />
                    <Label htmlFor="players-2">2 Players</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3" id="players-3" />
                    <Label htmlFor="players-3">3 Players</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4" id="players-4" />
                    <Label htmlFor="players-4">4 Players</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Private/Public Room Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="room-privacy" className="flex items-center space-x-2">
                    {isPrivate ? (
                      <Lock className="h-4 w-4 text-game-yellow" />
                    ) : (
                      <Globe className="h-4 w-4 text-game-green" />
                    )}
                    <span>{isPrivate ? "Private Room" : "Public Room"}</span>
                  </Label>
                  <Switch
                    id="room-privacy"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>
                <p className="text-sm text-gray-400">
                  {isPrivate 
                    ? "Only players with the room link can join" 
                    : "Anyone can find and join this room from the lobby"}
                </p>
              </div>

              {/* Bet Amount */}
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Coins className="mr-2 h-4 w-4" />
                  Bet Amount
                </Label>
                <RadioGroup
                  value={betAmount}
                  onValueChange={setBetAmount}
                  className="grid grid-cols-2 gap-4"
                >
                  {betOptions.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 border rounded-md ${
                        option.disabled
                          ? "border-gray-600 opacity-50"
                          : "border-white/20"
                      }`}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`bet-${option.value}`}
                        disabled={option.disabled}
                      />
                      <Label
                        htmlFor={`bet-${option.value}`}
                        className={option.disabled ? "text-gray-400" : ""}
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                {user && (
                  <div className="flex items-center mt-2 text-sm text-gray-400">
                    <Info className="h-4 w-4 mr-1" />
                    Your current balance: <span className="text-game-yellow font-bold ml-1">{user.coins} coins</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/lobby")}
                className="text-gray-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !user || parseInt(betAmount) > user.coins}
                className="bg-game-green hover:bg-game-green/80 text-black"
              >
                {isCreating ? "Creating Room..." : "Create Room"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default RoomCreate;
