import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useBalance } from "@/context/BalanceContext";
import { Users, Lock, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RoomType } from "@/types/game";

// Room configurations
const roomConfigs = {
  [RoomType.CASUAL]: {
    minBet: 50,
    maxBet: 10000,
    turnTime: 15000,
    gameDuration: 300000,
    maxPlayers: 4,
    shufflesAllowed: 3,
    description: 'Casual game room',
    cardDistribution: {}
  },
  [RoomType.QUICK]: {
    minBet: 50,
    maxBet: 10000,
    turnTime: 5000,
    gameDuration: 180000,
    maxPlayers: 4,
    shufflesAllowed: 2,
    description: 'Quick game room',
    cardDistribution: {}
  },
  [RoomType.COMPETITIVE]: {
    minBet: 50,
    maxBet: 10000,
    turnTime: 20000,
    gameDuration: 240000,
    maxPlayers: 4,
    shufflesAllowed: 1,
    description: 'Competitive game room',
    cardDistribution: {}
  }
};

const getRandomRoomName = () => {
  const adjectives = ["Epic", "Legendary", "Awesome", "Cool", "Lucky", "Royal", "Golden", "Mystic"];
  const nouns = ["Showdown", "Battle", "Arena", "Table", "Circle", "League", "Club", "Party"];
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${randomAdjective} ${randomNoun}`;
};

const roomTypes = [
  { value: RoomType.CASUAL, label: 'Casual', description: 'Relaxed gameplay with longer turn times' },
  { value: RoomType.QUICK, label: 'Quick', description: 'Fast-paced games with quick turns' },
  { value: RoomType.COMPETITIVE, label: 'Competitive', description: 'High-stakes games with more initial cards' }
];

const RoomCreate: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { balance } = useBalance();
  const { createRoom, joinRoom } = useSocket();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roomName, setRoomName] = useState(getRandomRoomName());
  const [playerCount, setPlayerCount] = useState<string>("4");
  const [betAmount, setBetAmount] = useState<string>("50");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [passkeyError, setPasskeyError] = useState('');
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);

  const demoBalance = balance?.demo || 0;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Get room type from URL
    const gameType = searchParams.get('game');
    if (gameType) {
      setSelectedRoomType(gameType as RoomType);
      // Set default bet amount based on room type
      const config = roomConfigs[gameType as RoomType];
      setBetAmount(config.minBet.toString());
    }
  }, [searchParams]);

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
    
    if (demoBalance < betAmountNum) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough demo balance for this bet amount!",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreating(true);
    
    try {
      const roomType = selectedRoomType || RoomType.CASUAL;
      const config = roomConfigs[roomType];

      if (betAmountNum < config.minBet || betAmountNum > config.maxBet) {
        toast({
          title: "Error",
          description: `Bet amount must be between ${config.minBet} and ${config.maxBet}`,
          variant: "destructive"
        });
        return;
      }

      const roomConfig = {
        name: roomName.trim() || `${user.username || 'Player'}'s Room`,
        playerCount: parseInt(playerCount),
        betAmount: betAmountNum,
        isPrivate,
        passkey: isPrivate ? passkey : undefined,
        roomType
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
    { value: "50", label: "₹50", disabled: demoBalance <= 50 },
    { value: "100", label: "₹100", disabled: demoBalance <= 100 },
    { value: "250", label: "₹250", disabled: demoBalance <= 250 },
    { value: "500", label: "₹500", disabled: demoBalance <= 500 },
    { value: "1000", label: "₹1000", disabled: demoBalance <= 1000 },
    { value: "2500", label: "₹2500", disabled: demoBalance <= 2500 },
    { value: "5000", label: "₹5000", disabled: demoBalance <= 5000 },
    { value: "10000", label: "₹10000", disabled: demoBalance <= 10000 }
  ];

  const poolAmount = parseInt(betAmount) * parseInt(playerCount);

  return (
    <Layout>
      <div className="container max-w-lg mx-auto px-4 py-8">
        <div className="bg-[#0e2a47] rounded-lg p-6 text-gray-400">
          <h2 className="text-2xl font-semibold mb-6">Room Settings</h2>
          
          {/* Room Name */}
          <div className="mb-6">
            <label className="block mb-2">Room Name</label>
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={20}
              className="w-full bg-[#051b2c] border-none"
            />
          </div>

          {/* Number of Players */}
          <div className="mb-6">
            <label className="flex items-center mb-2">
              <Users className="mr-2 h-4 w-4" />
              Number of Players
            </label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-2 cursor-pointer ${playerCount === "2" ? "text-white" : ""}`}>
                <input
                  type="radio"
                  name="playerCount"
                  value="2"
                  checked={playerCount === "2"}
                  onChange={(e) => setPlayerCount(e.target.value)}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border ${playerCount === "2" ? "border-white bg-white" : "border-gray-400"}`} />
                2 Players
              </label>
              <label className={`flex items-center gap-2 cursor-pointer ${playerCount === "4" ? "text-white" : ""}`}>
                <input
                  type="radio"
                  name="playerCount"
                  value="4"
                  checked={playerCount === "4"}
                  onChange={(e) => setPlayerCount(e.target.value)}
                  className="hidden"
                />
                <div className={`w-4 h-4 rounded-full border ${playerCount === "4" ? "border-white bg-white" : "border-gray-400"}`} />
                4 Players
              </label>
            </div>
          </div>

          {/* Public/Private Room */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {isPrivate ? <Lock className="h-4 w-4 mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                <span>{isPrivate ? "Private" : "Public"} Room</span>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
            <p className="text-sm">
              Anyone can find and join this room from the lobby
            </p>
          </div>
          {isPrivate && (
            <div className="mb-6">
              <label className="block mb-2">Passkey</label>
              <Input
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
              />
            </div>
          )}

          {/* Bet Amount */}
          <div className="mb-6">
            <label className="block mb-2">Bet Amount</label>
            <div className="grid grid-rows-1 grid-flow-col gap-2">
              {betOptions.slice(0, 4).map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center justify-center p-3 rounded cursor-pointer transition-colors
                    ${betAmount === option.value ? 'bg-[#051b2c] text-white' : 'text-gray-400 hover:bg-[#051b2c]/50'}
                    ${option.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}
                  `}
                >
                  <input
                    type="radio"
                    name="betAmount"
                    value={option.value}
                    checked={betAmount === option.value}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={option.disabled}
                    className="hidden"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <div className="grid grid-rows-1 grid-flow-col gap-2 mt-2">
              {betOptions.slice(4).map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center justify-center p-3 rounded cursor-pointer transition-colors
                    ${betAmount === option.value ? 'bg-[#051b2c] text-white' : 'text-gray-400 hover:bg-[#051b2c]/50'}
                    ${option.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}
                  `}
                >
                  <input
                    type="radio"
                    name="betAmount"
                    value={option.value}
                    checked={betAmount === option.value}
                    onChange={(e) => setBetAmount(e.target.value)}
                    disabled={option.disabled}
                    className="hidden"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {selectedRoomType && (
              <p className="text-sm text-muted-foreground mt-2">
                Min: {roomConfigs[selectedRoomType].minBet}, Max: {roomConfigs[selectedRoomType].maxBet}
              </p>
            )}
          </div>

          {/* Amount Display */}
          <div className="flex justify-between p-4 bg-[#051b2c] rounded mb-6">
            <div>
              <div className="text-sm">Bet Amount</div>
              <div className="text-white">₹{betAmount}</div>
            </div>
            <div>
              <div className="text-sm">Pool Amount</div>
              <div className="text-white">₹{poolAmount}</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/lobby")}
              className="flex-1 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRoom}
              disabled={isCreating || !user || parseInt(betAmount) > demoBalance}
              className="flex-1 bg-[#22c55e] hover:bg-[#22c55e]/80 text-black"
            >
              Create Room
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RoomCreate;
