
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Plus, RefreshCw } from "lucide-react";
import RoomList from "@/components/rooms/RoomList";
import JoinByLink from "@/components/rooms/JoinByLink";

const Lobby: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 text-game-cyan text-glow">Game Lobby</h1>
          <p className="text-lg text-muted-foreground">
            Join an existing room or create your own game
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-game-cyan">Available Rooms</h2>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <RoomList />
          </div>
          
          <div className="space-y-6">
            <Button
              onClick={() => navigate("/room/create")}
              className="w-full bg-game-green hover:bg-game-green/80 text-black p-6 text-lg"
            >
              <Plus className="mr-2 h-5 w-5" /> Create Game Room
            </Button>
            
            <JoinByLink />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Lobby;
