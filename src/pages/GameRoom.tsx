
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import GameBoard from "@/components/game/GameBoard";
import GameInfo from "@/components/game/GameInfo";
import WaitingLobby from "@/components/game/WaitingLobby";
import { Button } from "@/components/ui/button";
import { DoorOpen, Loader2, RefreshCw, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { isAuthenticated, user } = useAuth();
  const { currentRoom, joinRoom, leaveRoom, gameState, fetchRooms } = useSocket();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [gameInProgress, setGameInProgress] = useState(false);

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

  useEffect(() => {
    if (gameState && roomId) {
      console.log("Game state updated:", gameState);
      setLastSyncTime(new Date());
      
      // Check if game has started
      if (gameState.gameStarted && !gameInProgress) {
        setGameInProgress(true);
        // Show card shuffle animation through toast
        toast({
          title: "Game has started!",
          description: "Cards are being shuffled and distributed...",
        });
      }
      
      if (gameState.players.length > 0) {
        const playerNames = gameState.players.map(p => `${p.username} (${p.id})`);
        console.log("Current players:", playerNames);
      }
    }
  }, [gameState, roomId, gameInProgress]);

  const handleResync = () => {
    if (roomId) {
      setRetryCount(prev => prev + 1);
      setIsJoining(true);
      
      toast({
        title: "Resyncing game data",
        description: "Attempting to refresh player data..."
      });
      
      joinRoom(roomId).then((success) => {
        setIsJoining(false);
        if (success) {
          toast({
            title: "Game synced",
            description: "Successfully refreshed game data"
          });
          setLastSyncTime(new Date());
          // Also refresh the rooms list to update player counts
          fetchRooms();
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
  
  const handleGameStart = () => {
    setGameInProgress(true);
  };

  if (!roomId || !user) {
    return null;
  }

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

  const hasMultiplePlayers = gameState?.players.length > 1;

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

        {hasMultiplePlayers ? (
          <div className="w-full mb-4 p-2 bg-green-600/20 border border-green-500/30 rounded-md text-center">
            <p className="text-sm text-green-400">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {gameState?.gameStarted || gameInProgress ? (
              <GameBoard userId={user.id || ""} />
            ) : (
              currentRoom && <WaitingLobby 
                roomId={roomId} 
                roomData={currentRoom} 
                onGameStart={handleGameStart} 
              />
            )}
          </div>
          
          <div className="space-y-4">
            <GameInfo roomId={roomId} />
            
            {gameState?.gameStarted && (
              <div className="glass-panel p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-game-cyan flex items-center">
                    <Timer className="h-4 w-4 mr-1" /> Game Time
                  </h3>
                  <GameTimer gameState={gameState} />
                </div>
                
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-game-yellow flex items-center">
                    <Timer className="h-4 w-4 mr-1" /> Turn Time
                  </h3>
                  <TurnTimer gameState={gameState} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Component to display game timer
const GameTimer: React.FC<{ gameState: any }> = ({ gameState }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  useEffect(() => {
    if (!gameState.gameStarted || !gameState.gameStartTime) return;
    
    const totalTime = gameState.gameDuration * 1000;
    const endTime = gameState.gameStartTime + totalTime;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);
    };
    
    // Update initially and then every second
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [gameState]);
  
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  return (
    <div className={`font-mono text-lg ${timeLeft < 30000 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
};

// Component to display turn timer
const TurnTimer: React.FC<{ gameState: any }> = ({ gameState }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { user } = useAuth();
  
  useEffect(() => {
    if (!gameState.gameStarted || !gameState.turnStartTime) return;
    
    const totalTime = gameState.turnTimeLimit * 1000;
    const endTime = gameState.turnStartTime + totalTime;
    
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);
    };
    
    // Update initially and then every second
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [gameState.turnStartTime, gameState.turnTimeLimit, gameState.gameStarted]);
  
  const seconds = Math.floor(timeLeft / 1000);
  const isCurrentPlayerTurn = gameState.players[gameState.currentPlayerIndex]?.id === user?.id;
  
  return (
    <div className={`font-mono text-lg ${isCurrentPlayerTurn ? 
      (timeLeft < 5000 ? 'text-red-500 animate-pulse' : 'text-game-cyan') : 
      'text-white'}`}>
      {String(seconds).padStart(2, '0')}s
    </div>
  );
};

export default GameRoom;
