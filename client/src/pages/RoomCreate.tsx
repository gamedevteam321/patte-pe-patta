import React, { useEffect, useState } from "react";
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
import { Users, Coins, Info, Lock, Globe, Plus, RefreshCw, DoorOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import RoomList from "@/components/rooms/RoomList";
import JoinByLink from "@/components/rooms/JoinByLink";
import JoinRoomDialog from "@/components/rooms/JoinRoomDialog";
import { balanceService } from "@/services/api/balance";

const getRandomRoomName = () => {
  const adjectives = ["Epic", "Legendary", "Awesome", "Cool", "Lucky", "Royal", "Golden", "Mystic"];
  const nouns = ["Showdown", "Battle", "Arena", "Table", "Circle", "League", "Club", "Party"];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
};

const RoomCreate: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { createRoom, joinRoom } = useSocket();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState(getRandomRoomName());
  const [playerCount, setPlayerCount] = useState<string>("4");
  const [betAmount, setBetAmount] = useState<string>("50");
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [passkeyError, setPasskeyError] = useState('');

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
    
    // Validate user ID format
    if (!user.id || typeof user.id !== 'string' || user.id.length < 10) {
      console.error("Invalid user ID format:", user.id);
      toast({
        title: "Session Error",
        description: "Your session appears to be invalid. Please log out and log in again.",
        variant: "destructive"
      });
      return;
    }

    // Validate passkey if room is private
    if (isPrivate && (!passkey || !/^\d{6}$/.test(passkey))) {
      setPasskeyError("Please enter a valid 6-digit passkey");
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
        isPrivate,
        passkey: isPrivate ? passkey : undefined
      };
      
      console.log("Creating room with:", roomConfig);

      const result = await createRoom(roomConfig);
      
      if (result.success && result.roomId) {
        // Join the room after successful room creation
        const joinSuccess = await joinRoom(result.roomId);
        
        if (joinSuccess) {
          toast({
            title: "Success",
            description: `Room created successfully! Room Code: ${result.roomCode}`
          });
          navigate(`/room/${result.roomId}`);
        } else {
          toast({
            title: "Error",
            description: "Failed to join room. Please try again.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create room. Please try again.",
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

  const generatePasskey = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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
                    <RadioGroupItem value="4" id="players-4" />
                    <Label htmlFor="players-4">4 Players</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Private/Public Room Toggle with Code */}
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
                    onCheckedChange={(checked) => {
                      setIsPrivate(checked);
                      if (!checked) {
                        setRoomCode("");
                      }
                    }}
                  />
                </div>
                
                {/* Room Code input field - only shown when isPrivate is true */}
                {/* {isPrivate && (
                  <div className="mt-2">
                    <Label htmlFor="room-code">Room Code</Label>
                    <Input
                      id="room-code"
                      type="text"
                      placeholder="Enter 6-digit room code"
                      value={roomCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setRoomCode(value);
                      }}
                      className="bg-black/50 border-white/20 mt-1 font-mono tracking-wider"
                      maxLength={6}
                      pattern="\d{6}"
                      title="Please enter a 6-digit code"
                      required
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Players will need this code to join the room
                    </p>
                  </div>
                )} */}
                
                <p className="text-sm text-gray-400">
                  {isPrivate 
                    ? "Only players with the room code can join" 
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

              {/* Passkey */}
              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="room-passkey">Room Passkey</Label>
                  <Input
                    id="room-passkey"
                    type="text"
                    placeholder="Enter 6-digit passkey"
                    value={passkey}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPasskey(value);
                    }}
                    className="bg-black/50 border-white/20"
                    maxLength={6}
                    pattern="[0-9]*"
                    inputMode="numeric"
                  />
                  {passkeyError && (
                    <p className="text-sm text-red-500">{passkeyError}</p>
                  )}
                  {!passkeyError && (
                    <p className="text-sm text-gray-400">Enter a 6-digit passkey for the room</p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/lobby")}
                className="text-gray-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !user || parseInt(betAmount) > user.coins || (isPrivate && !passkey)}
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
