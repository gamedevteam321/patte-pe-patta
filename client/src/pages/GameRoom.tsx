import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useBalance } from "@/context/BalanceContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import { Button } from "@/components/ui/button";
import { DoorOpen, Loader2, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Room } from '@/types/game';
import { balanceService } from "@/services/api/balance";
import { formatCurrency } from "@/utils/format";
import { roomService } from "@/services/api/room";

// Add constant for auto-start time (3 minutes)
const WAIT_TIME_FOR_GAME_START = 180000; // 3 minutes in milliseconds

// Add this at the top with other constants
const INITIAL_WAIT_TIME = 180000; // 3 minutes in milliseconds

interface GameRoomProps {
  initialRoom?: Room;
}

const GameRoom: React.FC<GameRoomProps> = ({ initialRoom }) => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState, fetchRooms, socket } = useSocket();
  const { balance, refreshBalance } = useBalance();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [initialJoinComplete, setInitialJoinComplete] = useState(false);
  const [room, setRoom] = useState<Room | null>(initialRoom || null);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState<number>(INITIAL_WAIT_TIME);
  const [isAutoStarting, setIsAutoStarting] = useState<boolean>(false);
  const [autoStartTimeLeft, setAutoStartTimeLeft] = useState<number>(0);
  const [canJoin, setCanJoin] = useState<boolean>(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const waitingTimeLeftRef = useRef<NodeJS.Timeout>();

  // Check if user can join room based on balance
  useEffect(() => {
    const checkRoomEligibility = async () => {
      if (roomId && isAuthenticated) {
        try {
          const canJoinRoom = await balanceService.canJoinRoom(roomId);
          setCanJoin(canJoinRoom);
          
          if (!canJoinRoom) {
            toast({
              title: "Insufficient Balance",
              description: "You don't have enough balance to join this room",
              variant: "destructive"
            });
            navigate("/lobby");
          }
        } catch (error) {
          console.error("Error checking room eligibility:", error);
          toast({
            title: "Error",
            description: "Failed to check room eligibility",
            variant: "destructive"
          });
        }
      }
    };

    checkRoomEligibility();
  }, [roomId, isAuthenticated, navigate]);

  // Initial room join effect with balance check
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!currentRoom && roomId && !isJoining && !initialJoinComplete && canJoin) {
      setIsJoining(true);
      joinRoom(roomId).then(async (success) => {
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
          try {
            // Deduct balance after successful room join
            await balanceService.processRoomEntry(
              user.id,
              roomId,
              currentRoom?.betAmount || 0,
              'demo' // or 'real' based on your game mode
            );
            
            toast({
              title: "Joined room",
              description: "You have joined the game room successfully",
            });
            setLastSyncTime(new Date());
            fetchRooms();
          } catch (error: any) {
            console.error("Error deducting balance:", error);
            let errorMessage = "Failed to deduct balance. Please try again.";
            
            // Check for specific error messages
            if (error.message?.includes("Insufficient")) {
              errorMessage = "You don't have enough balance to join this room.";
            } else if (error.message?.includes("Daily limit")) {
              errorMessage = "You have reached your daily limit for this type of transaction.";
            }
            
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive"
            });
            // Leave the room if balance deduction fails
            leaveRoom();
            navigate("/lobby");
          }
        }
      });
    }
  }, [isAuthenticated, navigate, currentRoom, roomId, joinRoom, isJoining, fetchRooms, initialJoinComplete, canJoin, leaveRoom]);

  // Auto-refresh players list when game state changes
  useEffect(() => {
    if (gameState && roomId) {
      setLastSyncTime(new Date());
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
      setRoom(updatedRoom);
      
      // Calculate waiting time left
      if (updatedRoom.gameState.waitingStartTime && updatedRoom.gameState.waitingTimer) {
        const timeElapsed = Date.now() - updatedRoom.gameState.waitingStartTime;
        const timeLeft = Math.max(0, updatedRoom.gameState.waitingTimer - timeElapsed);
        setWaitingTimeLeft(timeLeft || INITIAL_WAIT_TIME);
        
        // Check if we should auto-start
        const isRoomFull = updatedRoom.players.length >= updatedRoom.gameState.requiredPlayers;
        const waitingTimeExpired = timeLeft <= 0;
        
        if (isRoomFull) {
          setIsAutoStarting(true);
          // Add a short delay to make sure all clients are ready
          setTimeout(() => {
            socket.emit('start_game', roomId);
          }, 2000);
        } else if (waitingTimeExpired && updatedRoom.players[0]?.id === socket.id) {
          // If timer expired and current player is host, they can start the game
          setIsAutoStarting(true);
          socket.emit('start_game', roomId);
        }
      }
    };

    // Handle when a new player joins the room
    const handlePlayerJoined = (data: any) => {
      // Update room state with new player
      if (room && room.gameState && data.player) {
        const updatedRoom = {
          ...room,
          players: [...room.players, data.player],
          gameState: {
            ...room.gameState,
            players: [...room.gameState.players, {
              ...data.player,
              cards: [],
              score: 0,
              isActive: true,
              autoPlayCount: 0
            }]
          }
        };
        setRoom(updatedRoom);

        // Check if room is now full
        const isNowFull = updatedRoom.players.length >= updatedRoom.gameState.requiredPlayers;
        if (isNowFull) {
          setIsAutoStarting(true);
          setTimeout(() => {
            socket.emit('start_game', roomId);
          }, 2000);
        }
      }
    };

    // Handle when room is ready to start
    const handleRoomReady = (data: { roomId: string }) => {
      if (data.roomId === roomId) {
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
    }
  }, [currentRoom]);

  // Timer effect for countdown
  useEffect(() => {
    if (socket && currentRoom?.id) {
      let lastServerTime = 0;
      let timeOffset = 0;

      // Listen for timer sync events from server
      socket.on('timer:sync', (data: { waitingStartTime: number; waitingTimer: number }) => {
        const now = Date.now();
        const serverTimeElapsed = now - data.waitingStartTime;
        const serverTimeLeft = Math.max(0, data.waitingTimer - serverTimeElapsed);
        
        // Calculate time offset between client and server
        if (lastServerTime === 0) {
          lastServerTime = now;
          timeOffset = Math.abs(serverTimeLeft - waitingTimeLeft);
        }

        // Only adjust time if the difference is more than 1 seconds
        if (Math.abs(serverTimeLeft - waitingTimeLeft) > 1000) {
          setWaitingTimeLeft(serverTimeLeft);
        }
      });

      // Request initial sync
      socket.emit('timer:request_sync', { roomId: currentRoom.id });

      // Set up more frequent sync (every 3 seconds) to keep times aligned
      const syncInterval = setInterval(() => {
        socket.emit('timer:request_sync', { roomId: currentRoom.id });
      }, 3000);

      return () => {
        socket.off('timer:sync');
        clearInterval(syncInterval);
      };
    }
  }, [socket, currentRoom?.id, waitingTimeLeft]);

  // Update local timer more frequently for smoother countdown
  useEffect(() => {
    if (waitingTimeLeft > 0) {
      waitingTimeLeftRef.current = setTimeout(() => {
        const newTime = Math.max(0, waitingTimeLeft - 1000);
        setWaitingTimeLeft(newTime);
        
        // Check if timer has expired and there are players in the room
        if (newTime === 0 && currentRoom?.players && currentRoom.players.length > 0) {
          socket?.emit('start_game', currentRoom.id);
        }
      }, 1000);
    }

    return () => {
      if (waitingTimeLeftRef.current) {
        clearTimeout(waitingTimeLeftRef.current);
      }
    };
  }, [waitingTimeLeft, currentRoom?.players, socket, currentRoom?.id]);

  // Update waiting timer effect
  useEffect(() => {
    if (!socket || !roomId || !currentRoom) return;

    // Clear any existing interval
    if (waitingTimeLeftRef.current) {
      clearInterval(waitingTimeLeftRef.current);
    }

    // Set up interval to check waiting time
    waitingTimeLeftRef.current = setInterval(() => {
      if (currentRoom.gameState.waitingStartTime && currentRoom.gameState.waitingTimer) {
        const timeElapsed = Date.now() - currentRoom.gameState.waitingStartTime;
        const timeLeft = Math.max(0, currentRoom.gameState.waitingTimer - timeElapsed);
        setWaitingTimeLeft(timeLeft);

        // If timer has expired, emit check_waiting_timer event
        if (timeLeft === 0) {
          socket.emit('check_waiting_timer', roomId);
        }
      }
    }, 1000);

    // Handle room closure event
    const handleRoomClosed = (data: { reason: string }) => {
      toast({
        title: "Room Closed",
        description: data.reason,
        variant: "destructive"
      });
      navigate('/lobby');
    };

    socket.on('room_closed', handleRoomClosed);

    return () => {
      if (waitingTimeLeftRef.current) {
        clearInterval(waitingTimeLeftRef.current);
      }
      socket.off('room_closed', handleRoomClosed);
    };
  }, [socket, roomId, currentRoom, navigate]);

  // Handle game result and update balance
  useEffect(() => {
    if (!socket) return;

    const handleGameResult = async (result: { isWinner: boolean; amount: number; balanceType: 'real' | 'demo' }) => {
      try {
        await balanceService.processGameResult(
          result.isWinner,
          result.amount,
          result.balanceType
        );
        await refreshBalance();
        
        toast({
          title: result.isWinner ? "You won!" : "Game Over",
          description: result.isWinner 
            ? `You won ${formatCurrency(result.amount)}!` 
            : `You lost ${formatCurrency(result.amount)}`,
          variant: result.isWinner ? "default" : "destructive"
        });
      } catch (error) {
        console.error("Error processing game result:", error);
        toast({
          title: "Error",
          description: "Failed to process game result",
          variant: "destructive"
        });
      }
    };

    socket.on('game:result', handleGameResult);
    return () => {
      socket.off('game:result', handleGameResult);
    };
  }, [socket, refreshBalance]);

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
      toast({
        title: "Failed to share",
        description: "Could not share the room code",
        variant: "destructive"
      });
    }
  };

  const handleLeaveRoom = async () => {
    if (socket && currentRoom) {
      try {
        await leaveRoom();
        navigate("/lobby");
      } catch (error) {
        console.error("Error leaving room:", error);
        toast({
          title: "Error",
          description: "Failed to leave room",
          variant: "destructive"
        });
      }
    }
  };

  // Format waiting time
  const formatWaitingTime = (ms: number) => {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update the status message section
  const renderRoomStatus = () => {
    if (!currentRoom) return null;

    const playerCount = currentRoom.gameState?.players.length || currentRoom.players.length;
    const poolAmount = (currentRoom.betAmount || 0) * playerCount;

    // Add debug logs
    console.log('Room Status Debug:', {
      betAmount: currentRoom.betAmount,
      playerCount,
      poolAmount,
      players: currentRoom.players,
      gameStatePlayers: currentRoom.gameState?.players
    });

    return (
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="font-semibold">Pool Amount:</span> ₹{poolAmount}
        </div>
        <div>
          <span className="font-semibold">Players:</span> {playerCount}
        </div>
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
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
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

  // Add debug mode effect
  useEffect(() => {
    if (socket && isDebugMode) {
      socket.emit('set_debug_mode', { enabled: true });
    }
  }, [socket, isDebugMode]);

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
            <h1 className="text-3xl font-bold text-[#4169E1]">{currentRoom?.name} </h1>
            {lastSyncTime && (
              <p className="text-xs text-blue-300">
                {currentRoom?.code && `[${currentRoom.code}]`}-Last synced: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            {/* Add debug mode checkbox */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="debug-mode"
                checked={isDebugMode}
                onChange={(e) => setIsDebugMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="debug-mode" className="text-sm text-gray-600">
                Debug Mode
              </label>
            </div>
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
                   <div className="text-sm text-gray-400">
                     {gameState?.players?.length || 1}/{gameState?.requiredPlayers || 2} players
                   </div>
                 </div>
               </div>

               {/* Status Message */}
               <div className="text-xl font-semibold text-yellow-400 mb-6">
                 Waiting for players
               </div>

               {/* Amount Display */}
               <div className="flex justify-between w-full max-w-xs p-4 bg-[#051b2c] rounded">
                 <div>
                   <div className="text-sm text-gray-400">Bet Amount</div>
                   <div className="text-white text-lg">₹{currentRoom?.betAmount || 0}</div>
                 </div>
                 <div>
                   <div className="text-sm text-gray-400">Pool Amount</div>
                   <div className="text-white text-lg">
                     ₹{(currentRoom?.betAmount || 0) * (gameState?.players.length || 1)}
                   </div>
                 </div>
               </div>

               {/* Players List */}
               <div className="w-full max-w-xs mt-6">
                 <div className="flex items-center justify-between text-blue-400 mb-2">
                   <span>Players in Room</span>
                   <span>{gameState?.players?.length || 1}/{gameState?.requiredPlayers || 2} players joined</span>
                 </div>
                 <div className="space-y-2">
                   {gameState?.players?.map((player) => (
                     <div
                       key={player.id}
                       className="flex items-center gap-2 p-3 rounded bg-[#051b2c]"
                     >
                       <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white uppercase">
                         {player.username?.[0] || 'U'}
                       </div>
                       <span className="text-white">{player.username}</span>
                     </div>
                   ))}
                   {/* Empty slots */}
                   {Array.from({ length: (gameState?.requiredPlayers || 2) - (gameState?.players?.length || 1) }).map((_, index) => (
                     <div
                       key={`empty-${index}`}
                       className="flex items-center gap-2 p-3 rounded bg-[#051b2c]/50"
                     >
                       <div className="w-8 h-8 rounded-full bg-gray-600/50 flex items-center justify-center">
                         <span className="text-gray-400">?</span>
                       </div>
                       <span className="text-gray-400">Waiting...</span>
                     </div>
                   ))}
                 </div>
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
