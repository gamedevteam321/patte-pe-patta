import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useSocket } from "@/context/SocketContext";
import { toast } from "@/hooks/use-toast";

interface JoinRoomDialogProps {
  trigger?: React.ReactNode;
}

const JoinRoomDialog: React.FC<JoinRoomDialogProps> = ({ trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [password, setPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { joinRoom, availableRooms, fetchRooms } = useSocket();
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
      // Fetch latest rooms before checking
      await fetchRooms();
      
      // Check if room exists and get its ID
      const room = availableRooms.find(room => room.code === roomCode.trim());
      
      if (!room) {
        toast({
          title: "Room not found",
          description: "The room code you entered doesn't exist.",
          variant: "destructive",
        });
        setIsJoining(false);
        return;
      }
      
      const success = await joinRoom(room.id, password.trim());
      
      if (success) {
        toast({
          title: "Success!",
          description: "You've joined the room successfully.",
        });
        setIsOpen(false);
        navigate(`/room/${room.id}`);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="bg-game-green hover:bg-game-green/80 text-white">
            <KeyRound className="mr-2 h-4 w-4" />
            Join by Code
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-game-card">
        <DialogHeader>
          <DialogTitle className="text-game-green flex items-center text-lg">
            <KeyRound className="mr-2 h-5 w-5" />
            Join by Room Code
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleJoinRoom} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="input-field"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
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
              className="input-field"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full bg-game-green hover:bg-game-green/80 text-white"
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Room"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRoomDialog;
