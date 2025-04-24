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
              currentRoom?.amount_stack || 0,
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
      console.log('Room update received:', {
        roomId: updatedRoom.id,
        amount_stack: updatedRoom.amount_stack,
        players: updatedRoom.players.length,
        currentAmountStack: currentRoom?.amount_stack
      });
      
      // Ensure we preserve the amount_stack from the server
      setRoom({
        ...updatedRoom,
        amount_stack: updatedRoom.amount_stack || currentRoom?.amount_stack || 0
      });
      
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
      // If we have current room data, check if adding this player makes it full
      if (room && room.gameState) {
        // Create a new player count including the player that just joined
        const newPlayerCount = room.players.length + 1;
        const isNowFull = newPlayerCount >= room.gameState.requiredPlayers;
        
        // If room is now full, auto-start
        if (isNowFull) {
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
      console.log("Room Data Updated:", {
        roomId,
        currentRoom,
        amount_stack: currentRoom.amount_stack,
        players: gameState?.players?.length || 0,
        initialRoom
      });
    }
  }, [currentRoom, gameState, roomId, initialRoom]);

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
    if (!currentRoom || !gameState) return null;

    const playerCount = gameState.players?.length || 0;
    const requiredPlayers = gameState.requiredPlayers || 2;
    const isFull = playerCount >= requiredPlayers;
    const amountStack = currentRoom.amount_stack || 0;
    const poolAmount = amountStack * playerCount;

    // Add detailed debug logging
    console.log('Room Status Values:', {
      amountStack,
      playerCount,
      poolAmount,
      currentRoom: {
        id: currentRoom.id,
        amount_stack: currentRoom.amount_stack,
        betAmount: currentRoom.betAmount, // Log both for debugging
        players: currentRoom.players?.length
      },
      gameState: {
        players: gameState.players.length,
        requiredPlayers: gameState.requiredPlayers
      }
    });
    
    const waitingMessage = isFull
      ? `Game starting in ${formatWaitingTime(autoStartTimeLeft)}`
      : `Waiting for players `;

    return (
      <div className="room-status space-y-4">
        <h3 className="text-yellow-400 text-xl font-bold">{waitingMessage}</h3>
        <div className="flex items-center justify-center gap-8 bg-black/20 p-4 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Bet Amount</div>
            <div className="text-2xl font-bold text-game-yellow">₹{amountStack}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Pool Amount</div>
            <div className="text-2xl font-bold text-game-green">₹{poolAmount}</div>
          </div>
        </div>
      </div>
    );
  };

  // Update the player list section
  const renderPlayerList = () => {
    // Add detailed logging for player list rendering
    console.log("Rendering Player List:", {
      currentRoom,
      amount_stack: currentRoom?.amount_stack,
      gameState,
      players: gameState?.players?.length || 0
    });
    
    if (!gameState?.players) return null;

    // Debug logging
    console.log("Current Room Data:", {
      room: currentRoom,
      amount_stack: currentRoom?.amount_stack,
      players: gameState.players.length
    });

    // Calculate empty slots
    const emptySlots = gameState.requiredPlayers - gameState.players.length;
    const emptySlotElements = [...Array(emptySlots)].map((_, index) => (
      <div
        key={`empty-${index}`}
        className="relative overflow-hidden rounded-lg border border-dashed border-gray-700/50 bg-gray-800/20 py-2 px-3 transition-all duration-300"
      >
        <div className="flex items-center justify-between opacity-50">
          <div className="flex items-center space-x-2">
            {/* Empty Avatar Circle */}
            <div className="relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-700/20">
                <span className="text-base text-gray-500">👤</span>
              </div>
            </div>

            {/* Waiting Text */}
            <div>
              <div className="font-medium text-gray-400 text-sm">
                Waiting...
              </div>
            </div>
          </div>

         
          
        </div>
      </div>
    ));

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-blue-400">Players in Room</h3>
          <div className="text-sm text-gray-400">
            {gameState.players.length}/{gameState.requiredPlayers} players joined
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Render active players */}
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className={`relative overflow-hidden rounded-lg border ${
                player.isHost 
                  ? "border-yellow-500/50 bg-yellow-500/10" 
                  : "border-blue-500/20 bg-blue-500/5"
              } py-2 px-3 transition-all duration-300 hover:bg-blue-500/10`}
            >
              {/* Player Status Indicator */}
              <div className="absolute top-0 right-0 w-10 h-10">
                <div className={`absolute transform rotate-45 translate-x-2 -translate-y-5 w-16 text-center text-[10px] py-0.5 
                  ${player.isHost ? "bg-yellow-500" : "bg-blue-500"}`}>
                  {player.isHost ? "HOST" : "PLAYER"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {/* Avatar/Status Circle */}
                  <div className="relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center 
                      ${player.isHost ? "bg-yellow-500/20" : "bg-blue-500/20"}`}>
                      <span className="text-sm font-bold">
                        {player.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-[#0B0C10]"></span>
                  </div>

                  {/* Player Info */}
                  <div>
                    <div className="font-medium text-white text-sm">
                      {player.username}
                    </div>
                  </div>
                </div>

                
              </div>
            </div>
          ))}
          
          {/* Render empty slots in the same grid */}
          {emptySlotElements}
        </div>
      </div>
    );
  };

  // Add debug mode effect
  useEffect(() => {
    if (socket && isDebugMode) {
      socket.emit('set_debug_mode', { enabled: true });
    }
  }, [socket, isDebugMode]);

  useEffect(() => {
    if (currentRoom) {
      console.log('GameRoom: Room data updated:', {
        roomId: currentRoom.id,
        amount_stack: currentRoom.amount_stack,
        players: currentRoom.players.length,
        gameState: currentRoom.gameState ? 'present' : 'missing'
      });
    }
  }, [currentRoom]);

  useEffect(() => {
    if (gameState) {
      console.log('GameRoom: Game state updated:', {
        roomId: currentRoom?.id,
        amount_stack: currentRoom?.amount_stack,
        status: gameState.status,
        players: gameState.players.length
      });
    }
  }, [gameState, currentRoom]);

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
