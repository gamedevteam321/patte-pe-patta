
import React from "react";
import { useSocket } from "@/context/SocketContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Timer, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface GameInfoProps {
  roomId: string;
}

const GameInfo: React.FC<GameInfoProps> = ({ roomId }) => {
  const { currentRoom } = useSocket();
  
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Room code copied",
      description: "Share this code with friends to invite them to your game"
    });
  };

  if (!currentRoom) return null;

  return (
    <Card className="glass-panel bg-gradient-to-br from-blue-950 to-black border-blue-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-blue-400">{currentRoom.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="flex items-center gap-1 border-blue-700 text-blue-300">
            <Users className="h-3 w-3" />
            {currentRoom.player_count}/{currentRoom.max_players} Players
          </Badge>
          
          <Badge variant="outline" className="flex items-center gap-1 border-blue-700 text-blue-300">
            <Timer className="h-3 w-3" />
            {currentRoom.status}
          </Badge>
          
          {currentRoom.is_private && (
            <Badge className="bg-blue-700 text-white">Private</Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-300">Room Code:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono bg-blue-900/30 px-2 py-1 rounded text-sm text-white">{roomId}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyRoomId}
              className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-blue-300">
          Share this code with friends to invite them to your game.
        </div>
      </CardContent>
    </Card>
  );
};

export default GameInfo;
