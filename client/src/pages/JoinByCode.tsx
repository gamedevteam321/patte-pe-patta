import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { useSocket, RoomData } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RoomList from "@/components/rooms/RoomList";

const JoinByCode: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated } = useAuth();
  const { fetchRooms, availableRooms } = useSocket();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (code) {
      checkRoom();
    }
  }, [code, isAuthenticated, navigate]);

  const checkRoom = async () => {
    setIsLoading(true);
    try {
      await fetchRooms();
    } catch (error) {
      console.error('Error checking room:', error);
      toast({
        title: "Error",
        description: "Failed to check room status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-[#4169E1] animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-[#4169E1]">
              Loading room details...
            </h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/lobby")}
            className="hover:bg-[#4169E1]/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Join Room</h1>
        </div>

        <RoomList 
          initialFilter="all"
          filterByCode={code}
          showFilters={false}
        />
      </div>
    </Layout>
  );
};

export default JoinByCode; 