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
import { Room } from '../types/game';

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState, fetchRooms, socket } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [initialJoinComplete, setInitialJoinComplete] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState<number>(0);
  const [isAutoStarting, setIsAutoStarting] = useState<boolean>(false);

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

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleRoomUpdate = (updatedRoom: Room) => {
      console.log("Room updated:", {
        roomId: updatedRoom.id,
        players: updatedRoom.players.length,
        required: updatedRoom.gameState.requiredPlayers,
        status: updatedRoom.gameState.status
      });
      
      setRoom(updatedRoom);
      
      // Calculate waiting time left
      if (updatedRoom.gameState.waitingStartTime && updatedRoom.gameState.waitingTimer) {
        const timeElapsed = Date.now() - updatedRoom.gameState.waitingStartTime;
        const timeLeft = Math.max(0, updatedRoom.gameState.waitingTimer - timeElapsed);
        setWaitingTimeLeft(timeLeft);
        
        // Check if we should auto-start
        const isRoomFull = updatedRoom.players.length >= updatedRoom.gameState.requiredPlayers;
        const waitingTimeExpired = timeLeft <= 0;
        
        console.log("Auto-start check:", { 
          isRoomFull, 
          waitingTimeExpired, 
          playerCount: updatedRoom.players.length, 
          requiredPlayers: updatedRoom.gameState.requiredPlayers 
        });
        
        if (isRoomFull) {
          console.log("Room is full! Auto-starting game...");
          setIsAutoStarting(true);
          // Add a short delay to make sure all clients are ready
          setTimeout(() => {
            socket.emit('start_game', roomId);
          }, 2000);
        } else if (waitingTimeExpired && updatedRoom.players[0]?.id === socket.id) {
          // If timer expired and current player is host, they can start the game
          console.log("Waiting time expired and current player is host! Auto-starting game...");
          setIsAutoStarting(true);
          socket.emit('start_game', roomId);
        }
      }
    };

    // Handle when a new player joins the room
    const handlePlayerJoined = (data: any) => {
      console.log("Player joined event received:", data);
      
      // If we have current room data, check if adding this player makes it full
      if (room && room.gameState) {
        // Create a new player count including the player that just joined
        const newPlayerCount = room.players.length + 1;
        const isNowFull = newPlayerCount >= room.gameState.requiredPlayers;
        
        console.log("Player joined - checking room capacity:", {
          currentPlayers: room.players.length,
          newPlayerCount,
          requiredPlayers: room.gameState.requiredPlayers,
          isNowFull
        });
        
        // If room is now full, auto-start
        if (isNowFull) {
          console.log("Room is now full after player joined, auto-starting game!");
          setIsAutoStarting(true);
          
          // Add a short delay before starting
          setTimeout(() => {
            socket.emit('start_game', roomId);
          }, 2000);
        }
      }
    };

    // Handle when room is ready to start
    const handleRoomReady = (data: { roomId: string }) => {
      console.log("Room ready event received:", data);
      if (data.roomId === roomId) {
        console.log("Room is ready, auto-starting game!");
        setIsAutoStarting(true);
        // Add a short delay before starting
        setTimeout(() => {
          socket.emit('start_game', roomId);
        }, 2000);
      }
    };

    socket.on('room:update', handleRoomUpdate);
    socket.on('player_joined', handlePlayerJoined);
    socket.on('room:ready', handleRoomReady);
    
    return () => {
      socket.off('room:update', handleRoomUpdate);
      socket.off('player_joined', handlePlayerJoined);
      socket.off('room:ready', handleRoomReady);
    };
  }, [socket, roomId, room]);

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

  // Format waiting time
  const formatWaitingTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            {(!gameState || gameState.status === 'waiting') && (
              <Button
                onClick={handleShare}
                variant="outline"
                className="border-[#4169E1] text-[#4169E1] hover:bg-[#4169E1]/20"
              >
                <Share2 className="mr-2 h-5 w-5" />
                Share Room
              </Button>
            )}
            
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
          {room?.gameState.status === 'waiting' && (
            <div className="bg-[#1A1B1E]/80 p-6 rounded-lg mb-4 text-center">
              <h2 className="text-2xl font-bold text-yellow-500 mb-4">
                {room.players.length < room.gameState.requiredPlayers 
                  ? `Waiting for players to join... (${room.players.length}/${room.gameState.requiredPlayers || 2})`
                  : "Room is full! Game will start automatically..."
                }
              </h2>
              <p className="text-lg text-yellow-400/80 mb-6">
                {room.players.length < room.gameState.requiredPlayers 
                  ? "Share the room code to invite friends!" 
                  : "Preparing to start the game for all players..."
                }
              </p>
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-[#0B0C10] p-4 rounded-lg border border-[#4169E1]/20">
                  <div className="text-sm text-gray-400 mb-1">
                    {room.players.length >= room.gameState.requiredPlayers 
                      ? "Game starting in:" 
                      : "Auto-start timer:"
                    }
                  </div>
                  <div className="text-3xl font-bold text-[#4169E1]">
                    {room.players.length >= room.gameState.requiredPlayers 
                      ? "0:03" // Show countdown when room is full
                      : formatWaitingTime(waitingTimeLeft)
                    }
                  </div>
                </div>
                {isAutoStarting && (
                  <div className="text-sm text-green-400 animate-pulse">
                    Game is starting automatically...
                  </div>
                )}
              </div>
            </div>
          )}
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
