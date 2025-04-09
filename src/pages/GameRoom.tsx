
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import { Button } from "@/components/ui/button";
import { DoorOpen } from "lucide-react";

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // If we don't have a current room, try to join the room
    if (!currentRoom && roomId) {
      joinRoom(roomId);
    }
  }, [isAuthenticated, navigate, currentRoom, roomId, joinRoom]);

  const handleLeaveRoom = () => {
    leaveRoom();
    navigate("/lobby");
  };

  if (!roomId || !user) {
    return null;
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
