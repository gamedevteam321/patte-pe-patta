
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSocket, RoomData } from "@/context/SocketContext";
import { toast } from "@/hooks/use-toast";
import { Users, PlayCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

interface WaitingLobbyProps {
  roomId: string;
  roomData: RoomData;
  onGameStart: () => void;
}

const WaitingLobby: React.FC<WaitingLobbyProps> = ({ roomId, roomData, onGameStart }) => {
  const { gameState, initializeGame } = useSocket();
  const { user } = useAuth();
  const [isStarting, setIsStarting] = useState(false);
  
  const isHost = user?.id === roomData.host_id;
  const playerCount = gameState?.players.length || 0;
  const hasEnoughPlayers = playerCount >= 2;
  
  const handleStartGame = async () => {
    if (!hasEnoughPlayers) {
      toast({
        title: "Not enough players",
        description: "Wait for at least one more player to join",
        variant: "destructive"
      });
      return;
    }

    setIsStarting(true);
    try {
      // Deduct coins when game starts
      // This would typically call a function in SocketContext to update user coins
      
      // Initialize the game with distributed cards
      await initializeGame(roomId, roomData.max_players);
      
      // Trigger the game start in parent component
      onGameStart();
      
      toast({
        title: "Game started!",
        description: "Cards have been distributed to all players"
      });
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Failed to start game",
        description: "Please try again",
        variant: "destructive"
      });
      setIsStarting(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-game-cyan">Waiting Lobby</h2>
        <Badge variant="outline" className="text-game-yellow">
          <Users className="h-4 w-4 mr-1" />
          {playerCount}/{roomData.max_players} Players
        </Badge>
      </div>
      
      <div className="space-y-4 mb-6">
        {gameState?.players.map(player => (
          <div 
            key={player.id} 
            className="flex items-center p-3 rounded-lg bg-black/20 border border-green-500/30"
          >
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
              {player.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">
                {player.username}
                {player.id === roomData.host_id && (
                  <Badge className="ml-2 bg-game-magenta text-black">Host</Badge>
                )}
                {player.id === user?.id && (
                  <Badge className="ml-2 bg-game-yellow text-black">You</Badge>
                )}
              </p>
              <p className="text-xs text-green-400">Ready</p>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-1"></div>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
        ))}

        {Array.from({ length: roomData.max_players - playerCount }).map((_, i) => (
          <div 
            key={`empty-${i}`} 
            className="flex items-center p-3 rounded-lg bg-black/10 border border-gray-700 opacity-50"
          >
            <div className="h-8 w-8 rounded-full bg-gray-700/20 flex items-center justify-center mr-3">
              ?
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-500">Waiting for player...</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center">
        {isHost ? (
          <Button
            onClick={handleStartGame}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-6 rounded-lg"
            disabled={!hasEnoughPlayers || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting Game...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Game
              </>
            )}
          </Button>
        ) : (
          <div className="text-center py-4">
            <p className="text-game-cyan mb-2">Waiting for host to start the game</p>
            <p className="text-sm text-muted-foreground">
              {hasEnoughPlayers 
                ? "Enough players have joined! Ready to start." 
                : "Need more players to join..."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingLobby;
