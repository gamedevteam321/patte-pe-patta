import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import { Button } from "@/components/ui/button";
import { DoorOpen, Loader2, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Room } from '@/types/game';

// Add constant for auto-start time (3 minutes)
const WAIT_TIME_FOR_GAME_START = 180000; // 3 minutes in milliseconds

interface GameRoomProps {
  initialRoom?: Room;
}

const GameRoom: React.FC<GameRoomProps> = ({ initialRoom }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState, fetchRooms, socket } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [initialJoinComplete, setInitialJoinComplete] = useState(false);
  const [room, setRoom] = useState<Room | null>(initialRoom || null);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState<number>(WAIT_TIME_FOR_GAME_START);
  const [isAutoStarting, setIsAutoStarting] = useState<boolean>(false);
  const [autoStartTimeLeft, setAutoStartTimeLeft] = useState<number>(0);
  const waitingTimeLeftRef = useRef<NodeJS.Timeout>();

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

  // Add this after your state declarations
  useEffect(() => {
    if (currentRoom) {
      console.log('Current Room Data:', {
        room: currentRoom,
        players: currentRoom.players,
        gameState: currentRoom.gameState
      });
    }
  }, [currentRoom]);

  // Timer effect for countdown
  useEffect(() => {
    if (room?.gameState?.waitingStartTime && room?.gameState?.waitingTimer) {
      const updateTimer = () => {
        const now = Date.now();
        const timeElapsed = now - room.gameState.waitingStartTime;
        const timeLeft = Math.max(0, room.gameState.waitingTimer - timeElapsed);
        setWaitingTimeLeft(timeLeft);
      };

      // Update immediately
      updateTimer();

      // Update every second
      const timerId = setInterval(updateTimer, 1000);

      return () => clearInterval(timerId);
    }
  }, [room?.gameState?.waitingStartTime, room?.gameState?.waitingTimer]);

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

  // Update the status message section
  const renderRoomStatus = () => {
    if (!currentRoom || !gameState) return null;

    const playerCount = gameState.players?.length || 0;
    const requiredPlayers = gameState.requiredPlayers || 2;
    const isFull = playerCount >= requiredPlayers;
    
    const waitingMessage = isFull
      ? `Game starting in ${formatWaitingTime(autoStartTimeLeft)}`
      : `Waiting for players (${playerCount}/${requiredPlayers})`;

    return (
      <div className="room-status">
        <h3 className="text-yellow-400">{waitingMessage}</h3>
      </div>
    );
  };

  // Update the player list section
  const renderPlayerList = () => {
    if (!gameState?.players) return null;

    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Players:</h3>
        <ul className="space-y-2">
          {gameState.players.map((player) => (
            <li key={player.id} className="flex items-center gap-2">
              <span>{player.username}</span>
              {player.isHost && (
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Host</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
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

  useEffect(() => {
    if (waitingTimeLeft > 0) {
      waitingTimeLeftRef.current = setTimeout(() => {
        setWaitingTimeLeft((prev) => prev - 1000); // Decrease by 1000ms (1 second)
      }, 1000);
    }

    return () => clearTimeout(waitingTimeLeftRef.current);
  }, [waitingTimeLeft]);

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
           {/* show auto start timer */}
          
           {(!gameState || gameState.status === 'waiting') && (
             <div className="flex flex-col items-center justify-center p-6 bg-[#1A1B1E] rounded-lg mb-4">
               <div className="text-lg text-gray-300 mb-4">Game starts in:</div>
               
               {/* Countdown Clock */}
               <div className="relative w-32 h-32 mb-4">
                 {/* SVG Circle Timer */}
                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                   {/* Background circle */}
                   <circle
                     cx="50"
                     cy="50"
                     r="45"
                     fill="none"
                     stroke="#2A2B2E"
                     strokeWidth="8"
                   />
                   {/* Progress circle */}
                   <circle
                     cx="50"
                     cy="50"
                     r="45"
                     fill="none"
                     stroke="#4169E1"
                     strokeWidth="8"
                     strokeLinecap="round"
                     strokeDasharray={`${2 * Math.PI * 45}`}
                     strokeDashoffset={2 * Math.PI * 45 * (1 - waitingTimeLeft / WAIT_TIME_FOR_GAME_START)}
                     className="transition-all duration-1000 ease-linear"
                   />
                 </svg>
                 {/* Countdown Text */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <div className="text-4xl font-bold text-white">
                     {formatWaitingTime(waitingTimeLeft)}
                   </div>
                   <div className="text-sm text-gray-400 mt-1">
                     {gameState?.players?.length || 0}/{gameState?.requiredPlayers || 2} players
                   </div>
                 </div>
               </div>

               {/* Status Message */}
               <div className="text-center">
                 {renderRoomStatus()}
               </div>

               {/* Player List */}
               {renderPlayerList()}
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
