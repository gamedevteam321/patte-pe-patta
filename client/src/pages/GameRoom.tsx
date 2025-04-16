import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import { Button } from "@/components/ui/button";
import { DoorOpen, Loader2, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState, fetchRooms } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [initialJoinComplete, setInitialJoinComplete] = useState(false);

  // Initial room join effect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!currentRoom && roomId && !isJoining && !initialJoinComplete) {
      console.log("Attempting to join room:", roomId);
      setIsJoining(true);
      joinRoom(roomId).then((success) => {
        setIsJoining(false);
        setInitialJoinComplete(true);
        
        if (!success) {
          toast({
            title: "Failed to join room",
            description: "Could not join the game room",
            variant: "destructive"
          });
          navigate("/lobby");
        } else {
          toast({
            title: "Joined room",
            description: "You have joined the game room successfully",
          });
          setLastSyncTime(new Date());
          // Refresh room list to get latest player counts
          fetchRooms();
        }
      });
    }
  }, [isAuthenticated, navigate, currentRoom, roomId, joinRoom, isJoining, fetchRooms, initialJoinComplete]);

  // Auto-refresh players list when game state changes
  useEffect(() => {
    if (gameState && roomId) {
      console.log("Game state updated:", gameState);
      setLastSyncTime(new Date());
      
      if (gameState.players.length > 0) {
        const playerNames = gameState.players.map(p => `${p.username} (${p.id})`);
        console.log("Current players:", playerNames);
      }
    }
  }, [gameState, roomId]);

  // Set up auto-refresh interval for player data - less frequent to prevent excessive requests
  useEffect(() => {
    if (roomId && initialJoinComplete) {
      const intervalId = setInterval(() => {
        // Only resync if not currently joining and if there's an actual room ID
        if (!isJoining && roomId) {
          handleResync();
        }
      }, 15000); // Auto-refresh every 15 seconds instead of 10
      
      return () => clearInterval(intervalId);
    }
  }, [roomId, isJoining, initialJoinComplete]);

  const handleResync = () => {
    if (roomId) {
      setRetryCount(prev => prev + 1);
      setIsJoining(true);
      
      joinRoom(roomId).then((success) => {
        setIsJoining(false);
        if (success) {
          setLastSyncTime(new Date());
          fetchRooms();
        }
      });
    }
  };

  const handleShare = async () => {
    if (!currentRoom?.code) return;

    const shareData = {
      title: 'Join my game room!',
      text: `Join my game room with code: ${currentRoom.code}`,
      url: `${window.location.origin}/join/${currentRoom.code}`
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        // Use Web Share API if available (mostly mobile)
        await navigator.share(shareData);
      } else {
        // Fallback to copying the room code
        await navigator.clipboard.writeText(currentRoom.code);
        toast({
          title: "Room code copied!",
          description: "Share this code with your friends to join.",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Failed to share",
        description: "Could not share the room code",
        variant: "destructive"
      });
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/lobby");
  };

  if (!roomId || !user) {
    return null;
  }

  if (isJoining) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-[#4169E1] animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-[#4169E1]">
              {retryCount === 0 ? "Joining game room..." : "Resyncing game data..."}
            </h2>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Refreshing player data
              </p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-[1000px] mx-auto px-4 py-4 bg-[#0B0C10] rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#4169E1]">Game Room {currentRoom?.code && `(${currentRoom.code})`}</h1>
            {lastSyncTime && (
              <p className="text-xs text-blue-300">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleShare}
              variant="outline"
              className="border-[#4169E1] text-[#4169E1] hover:bg-[#4169E1]/20"
            >
              <Share2 className="mr-2 h-5 w-5" />
              Share Room
            </Button>
            
            <Button
              onClick={handleLeaveRoom}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-900/20"
            >
              <DoorOpen className="mr-2 h-5 w-5" />
              Leave Room
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <GameBoard userId={user.id || ""} />
          </div>
          
          <div className="hidden">
            <GameInfo roomId={roomId} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GameRoom;
