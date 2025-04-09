
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
  const { currentRoom, joinRoom, leaveRoom, gameState } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Effect for authentication and room joining
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // If we don't have a current room, try to join the room
    if (!currentRoom && roomId && !isJoining) {
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
        }
      });
    }
  }, [isAuthenticated, navigate, currentRoom, roomId, joinRoom, isJoining]);

  // Effect to monitor game state updates
  useEffect(() => {
    if (gameState && roomId) {
      console.log("Game state updated:", gameState);
      setLastSyncTime(new Date());
      
      // Log connected players for debugging
      if (gameState.players.length > 0) {
        const playerNames = gameState.players.map(p => `${p.username} (${p.id})`);
        console.log("Current players:", playerNames);
      }
    }
  }, [gameState, roomId]);

  // Add a function to handle manual refresh/resync
  const handleResync = () => {
    if (roomId) {
      setRetryCount(prev => prev + 1);
      setIsJoining(true);
      
      toast({
        title: "Resyncing game data",
        description: "Attempting to refresh player data..."
      });
      
      // Rejoin the room to force a refresh of game state
      joinRoom(roomId).then((success) => {
        setIsJoining(false);
        if (success) {
          toast({
            title: "Game synced",
            description: "Successfully refreshed game data"
          });
          setLastSyncTime(new Date());
        } else {
          toast({
            title: "Sync failed",
            description: "Could not refresh game data",
            variant: "destructive"
          });
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

  // Show loading state while joining
  if (isJoining) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-game-cyan animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-game-cyan">
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

  const hasMultipleRealPlayers = gameState?.players.filter(p => !p.id.startsWith('ai_player_')).length > 1;

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-game-cyan text-glow">Game Room</h1>
            {lastSyncTime && (
              <p className="text-xs text-muted-foreground">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleResync}
              variant="outline"
              size="sm"
              className="border-game-cyan text-game-cyan hover:bg-game-cyan/20"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Resync
            </Button>
            
            <Button
              onClick={handleLeaveRoom}
              variant="outline"
              className="border-game-magenta text-game-magenta hover:bg-game-magenta/20"
            >
              <DoorOpen className="mr-2 h-5 w-5" />
              Leave Room
            </Button>
          </div>
        </div>

        {hasMultipleRealPlayers ? (
          <div className="w-full mb-4 p-2 bg-green-600/20 border border-green-500/30 rounded-md text-center">
            <p className="text-sm text-green-400">
              Multiplayer mode active! Other players have joined the game.
            </p>
          </div>
        ) : gameState && gameState.players.length > 1 ? (
          <div className="w-full mb-4 p-2 bg-yellow-600/20 border border-yellow-500/30 rounded-md text-center">
            <p className="text-sm text-yellow-400">
              Currently playing with AI. Share the room code to invite friends!
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board - Main Content */}
          <div className="lg:col-span-3">
            <GameBoard userId={user.id || ""} />
          </div>
          
          {/* Side Panel - Game Info */}
          <div className="space-y-4">
            <GameInfo roomId={roomId} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GameRoom;
