
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Edit2, Trophy, Award, XCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const avatarOptions = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
  "/avatars/avatar6.png",
  "/avatars/avatar7.png",
  "/avatars/avatar8.png",
];

const Profile = () => {
  const { user, updateUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleAvatarChange = (avatarUrl: string) => {
    updateUser({ avatar: avatarUrl });
    setIsEditingAvatar(false);
  };

  const winRate = user.wins + user.losses > 0
    ? Math.round((user.wins / (user.wins + user.losses)) * 100)
    : 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-game-cyan text-glow">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="glass-panel border-white/10 col-span-1">
            <CardHeader>
              <CardTitle className="text-game-cyan">Player Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative mb-4">
                <Avatar className="w-32 h-32 border-2 border-game-cyan">
                  <AvatarImage src={user.avatar} alt={user.username} />
                  <AvatarFallback className="bg-game-card">{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-game-magenta hover:bg-game-magenta/80 border-white/20"
                  onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                >
                  {isEditingAvatar ? <XCircle /> : <Edit2 />}
                </Button>
              </div>

              {isEditingAvatar && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {avatarOptions.map((avatar, index) => (
                    <button
                      key={index}
                      className={`p-1 rounded-md ${
                        user.avatar === avatar ? "ring-2 ring-game-cyan" : ""
                      }`}
                      onClick={() => handleAvatarChange(avatar)}
                    >
                      <Avatar>
                        <AvatarImage src={avatar} alt={`Avatar option ${index + 1}`} />
                        <AvatarFallback>A{index + 1}</AvatarFallback>
                      </Avatar>
                    </button>
                  ))}
                </div>
              )}

              <h2 className="text-xl font-bold mt-2">{user.username}</h2>
              <p className="text-muted-foreground mb-4">{user.email}</p>

              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="text-lg font-bold text-game-yellow">{user.coins}</span>
                <span className="text-gray-400">coins</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10 col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-game-magenta">Stats & Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center p-4 glass-panel">
                  <Trophy className="h-8 w-8 text-game-cyan mb-2" />
                  <span className="text-2xl font-bold">{user.wins}</span>
                  <span className="text-sm text-gray-400">Wins</span>
                </div>
                
                <div className="flex flex-col items-center p-4 glass-panel">
                  <XCircle className="h-8 w-8 text-game-red mb-2" />
                  <span className="text-2xl font-bold">{user.losses}</span>
                  <span className="text-sm text-gray-400">Losses</span>
                </div>
                
                <div className="flex flex-col items-center p-4 glass-panel">
                  <Award className="h-8 w-8 text-game-yellow mb-2" />
                  <span className="text-2xl font-bold">{winRate}%</span>
                  <span className="text-sm text-gray-400">Win Rate</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-4 text-game-green">Achievements</h3>
              <div className="space-y-4">
                <div className="flex items-center p-3 glass-panel">
                  <div className="mr-4 bg-gradient-to-br from-game-cyan to-game-green p-2 rounded-full">
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Beginner's Luck</h4>
                    <p className="text-sm text-gray-400">Win your first game</p>
                  </div>
                  <div className="ml-auto">
                    {user.wins > 0 ? (
                      <span className="text-sm bg-game-green/20 text-game-green py-1 px-2 rounded-full">Unlocked</span>
                    ) : (
                      <span className="text-sm bg-gray-700/20 text-gray-400 py-1 px-2 rounded-full">Locked</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center p-3 glass-panel">
                  <div className="mr-4 bg-gradient-to-br from-game-yellow to-game-magenta p-2 rounded-full">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">High Roller</h4>
                    <p className="text-sm text-gray-400">Win a game with 500+ coin bet</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-sm bg-gray-700/20 text-gray-400 py-1 px-2 rounded-full">Locked</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            className="bg-game-green hover:bg-game-green/80 text-black"
            onClick={() => navigate("/lobby")}
          >
            Play Now
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
