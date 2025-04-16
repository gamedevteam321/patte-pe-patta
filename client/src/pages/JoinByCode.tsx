import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket, RoomData } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const JoinByCode: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const { joinRoom, fetchRooms, availableRooms } = useSocket();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [roomRequiresPassword, setRoomRequiresPassword] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (code) {
      checkRoomPassword();
    }
  }, [code, isAuthenticated, navigate]);

  const checkRoomPassword = async () => {
    setIsLoading(true);
    try {
      await fetchRooms();
      const targetRoom = availableRooms.find(room => room.code === code);
      
      if (!targetRoom) {
        toast({
          title: "Room not found",
          description: "Could not find the game room",
          variant: "destructive"
        });
        navigate("/lobby");
        return;
      }

      setTargetRoomId(targetRoom.id);

      if (targetRoom.isPrivate) {
        setRoomRequiresPassword(true);
        setShowPasswordDialog(true);
      } else {
        joinRoomWithPassword("");
      }
    } catch (error) {
      console.error('Error checking room:', error);
      toast({
        title: "Error",
        description: "Failed to check room status",
        variant: "destructive"
      });
      navigate("/lobby");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoomWithPassword = async (password: string) => {
    if (!targetRoomId) {
      toast({
        title: "Error",
        description: "Room not found",
        variant: "destructive"
      });
      navigate("/lobby");
      return;
    }

    setIsLoading(true);
    try {
      const success = await joinRoom(targetRoomId, password);
      if (success) {
        toast({
          title: "Joined room",
          description: "You have joined the game room successfully",
        });
        navigate(`/room/${targetRoomId}`);
      } else {
        toast({
          title: "Failed to join room",
          description: "Invalid room code or password",
          variant: "destructive"
        });
        navigate("/lobby");
      }
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room",
        variant: "destructive"
      });
      navigate("/lobby");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordDialog(false);
    joinRoomWithPassword(password);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-[#4169E1] animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-[#4169E1]">
              Joining game room...
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please wait while we connect you to the room
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Room Password Required
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Enter room password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/lobby")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Room"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default JoinByCode; 