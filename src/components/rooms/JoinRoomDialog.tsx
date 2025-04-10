
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useSocket } from "@/context/SocketContext";

interface JoinRoomDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  roomId: string;
  onJoin: (roomId: string, password?: string) => void;
}

const JoinRoomDialog: React.FC<JoinRoomDialogProps> = ({ 
  isOpen, 
  setIsOpen, 
  roomId, 
  onJoin 
}) => {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { availableRooms } = useSocket();

  // Set initial code when roomId changes
  useEffect(() => {
    if (roomId) {
      setCode(roomId);
    }
  }, [roomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() && !roomId) {
      setError("Please enter a room code");
      return;
    }
    
    const roomToJoin = code.trim() || roomId;
    
    // Check if it's a valid room
    const room = availableRooms.find(r => r.id === roomToJoin);
    if (!room) {
      setError("Room not found");
      return;
    }
    
    if (room.is_private && !password.trim()) {
      setError("Password is required for private rooms");
      return;
    }
    
    console.log("Joining room from dialog:", roomToJoin, "with password:", password.trim() ? "provided" : "none");
    onJoin(roomToJoin, password.trim() || undefined);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCode(roomId || "");
    setPassword("");
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-panel border-accent/30">
        <DialogHeader>
          <DialogTitle className="flex items-center text-accent">
            <KeyRound className="mr-2 h-5 w-5" />
            Join Private Room
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Enter room code"
              className="bg-black/50 border-white/20"
              readOnly={!!roomId}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Room Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter room password"
              className="bg-black/50 border-white/20"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleClose}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-accent hover:bg-accent/80 text-white"
            >
              Join Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRoomDialog;
