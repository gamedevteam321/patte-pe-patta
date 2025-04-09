
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LinkIcon, KeyRound } from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import { toast } from "@/hooks/use-toast";

const JoinByLink: React.FC = () => {
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { joinRoom, availableRooms } = useSocket();
  const navigate = useNavigate();

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }
    
    setIsJoining(true);
    
    try {
      console.log("Joining room by link with code:", roomCode.trim());
      
      // Check if room exists
      const roomExists = availableRooms.some(room => room.id === roomCode.trim());
      
      if (!roomExists) {
        toast({
          title: "Room not found",
          description: "The room code you entered doesn't exist.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }
      
      // Force a small delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const success = await joinRoom(roomCode.trim(), password.trim() || undefined);
      
      if (success) {
        toast({
          title: "Success!",
          description: "You've joined the room successfully.",
        });
        navigate(`/room/${roomCode.trim()}`);
      } else {
        toast({
          title: "Failed to join room",
          description: "The room may be full or the password is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card className="glass-panel border-yellow-400/30">
      <CardHeader>
        <CardTitle className="text-yellow-400 flex items-center">
          <KeyRound className="mr-2 h-5 w-5" />
          Join by Room Code
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleJoinRoom}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="bg-black/50 border-white/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roomPassword">Password (if required)</Label>
            <Input
              id="roomPassword"
              type="password"
              placeholder="Enter room password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/50 border-white/20"
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Enter a room code shared by another player to join their game.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Room"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default JoinByLink;
