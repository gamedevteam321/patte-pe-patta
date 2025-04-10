
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import { Button } from "@/components/ui/button";
import { DoorOpen, Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState, fetchRooms } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!currentRoom && roomId && !isJoining) {
      console.log("Attempting to join room:", roomId);
      setIsJoining(true);
      joinRoom(roomId).then((success) => {
        setIsJoining(false);
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
  }, [isAuthenticated, navigate, currentRoom, roomId, joinRoom, isJoining, fetchRooms]);

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

  // Set up auto-refresh interval for player data
  useEffect(() => {
    if (roomId) {
      const intervalId = setInterval(() => {
        handleResync();
      }, 10000); // Auto-refresh every 10 seconds
      
      return () => clearInterval(intervalId);
    }
  }, [roomId]);

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
            <Loader2 className="h-10 w-10 text-game-blue animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-game-blue">
              {retryCount === 0 ? "Joining game room..." : "Resyncing game data..."}
            </h2>
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Attempt {retryCount} - Refreshing player data
              </p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  const hasMultiplePlayers = gameState?.players.length > 1;

  return (
    <Layout>
      <div className="container max-w-[1000px] mx-auto px-4 py-4 bg-[#0B0C10] rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-game-blue">Game Room</h1>
            {lastSyncTime && (
              <p className="text-xs text-blue-300">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <Button
            onClick={handleLeaveRoom}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-900/20"
          >
            <DoorOpen className="mr-2 h-5 w-5" />
            Leave Room
          </Button>
        </div>

        {hasMultiplePlayers ? (
          <div className="w-full mb-4 p-2 bg-blue-600/20 border border-blue-500/30 rounded-md text-center">
            <p className="text-sm text-blue-300">
              Multiplayer mode active! Other players have joined the game.
            </p>
          </div>
        ) : (
          <div className="w-full mb-4 p-2 bg-yellow-600/20 border border-yellow-500/30 rounded-md text-center">
            <p className="text-sm text-yellow-400">
              Waiting for other players to join. Share the room code to invite friends!
            </p>
          </div>
        )}

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
