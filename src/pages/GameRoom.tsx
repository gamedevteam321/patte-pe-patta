
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import { Button } from "@/components/ui/button";
import { DoorOpen, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);

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
        }
      });
    }
  }, [isAuthenticated, navigate, currentRoom, roomId, joinRoom, isJoining]);

  // Effect to monitor game state updates
  useEffect(() => {
    if (gameState && roomId) {
      console.log("Game state updated:", gameState);
      // Log connected players for debugging
      console.log("Current players:", gameState.players.map(p => p.username));
    }
  }, [gameState, roomId]);

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
            <h2 className="text-xl font-semibold text-game-cyan">Joining game room...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-game-cyan text-glow">Game Room</h1>
          <Button
            onClick={handleLeaveRoom}
            variant="outline"
            className="border-game-magenta text-game-magenta hover:bg-game-magenta/20"
          >
            <DoorOpen className="mr-2 h-5 w-5" />
            Leave Room
          </Button>
        </div>

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
