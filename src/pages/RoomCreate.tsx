
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Users, Coins, Info } from "lucide-react";

const RoomCreate = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [playerCount, setPlayerCount] = useState<string>("4");
  const [betAmount, setBetAmount] = useState<string>("50");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    const betAmountNum = parseInt(betAmount);
    
    if (user.coins < betAmountNum) {
      alert("You don't have enough coins for this bet amount!");
      return;
    }
    
    setIsCreating(true);
    
    // Mock room creation - would make an API call in a real app
    setTimeout(() => {
      // Create a mock room ID - in a real app this would come from the server
      const roomId = `room_${Math.random().toString(36).substr(2, 9)}`;
      navigate(`/room/${roomId}`);
    }, 1000);
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
                  required
                  minLength={3}
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
