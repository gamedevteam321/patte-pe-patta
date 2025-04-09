
import React, { useState } from 'react';
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

interface JoinRoomDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  roomId: string;
  onJoin: (roomId: string) => void;
}

const JoinRoomDialog: React.FC<JoinRoomDialogProps> = ({ 
  isOpen, 
  setIsOpen, 
  roomId, 
  onJoin 
}) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    const roomToJoin = code.trim() || roomId;
    onJoin(roomToJoin);
    setIsOpen(false);
    setCode("");
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="glass-panel border-white/10">
        <DialogHeader>
          <DialogTitle className="text-game-cyan">Join Private Room</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Enter Room Code</Label>
            <Input
              id="roomCode"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder={roomId || "Enter room code"}
              className="bg-black/50 border-white/20"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsOpen(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-game-cyan hover:bg-game-cyan/80 text-black"
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
