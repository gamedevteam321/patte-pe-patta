
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
    <Card className="glass-panel border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-game-cyan">{currentRoom.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {currentRoom.playerCount}/{currentRoom.maxPlayers} Players
          </Badge>
          
          <Badge variant="outline" className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {currentRoom.status}
          </Badge>
          
          {currentRoom.isPrivate && (
            <Badge className="bg-game-yellow text-black">Private</Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Room Code:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono bg-black/30 px-2 py-1 rounded text-sm">{roomId}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyRoomId}
              className="h-6 w-6"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Share this code with friends to invite them to your game.
        </div>
      </CardContent>
    </Card>
  );
};

export default GameInfo;
