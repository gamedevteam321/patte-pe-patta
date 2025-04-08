
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { PlayCircle, Trophy, Users, Coins } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <section className="glass-panel p-8 mb-8 animate-slide-in">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-game-cyan text-glow">
              Satta Kings Arena
            </h1>
            <p className="text-xl mb-8 text-gray-300">
              The ultimate multiplayer card game experience with real-time gameplay and coin-based betting
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {user ? (
                <Button
                  className="bg-game-green hover:bg-game-green/80 text-black text-lg py-6 px-8"
                  onClick={() => navigate("/lobby")}
                >
                  <PlayCircle className="mr-2 h-6 w-6" />
                  Play Now
                </Button>
              ) : (
                <Button
                  className="bg-game-cyan hover:bg-game-cyan/80 text-black text-lg py-6 px-8"
                  onClick={() => navigate("/register")}
                >
                  Join Now - Get 1000 Free Coins!
                </Button>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <Users className="h-12 w-12 mb-4 text-game-cyan" />
            <h2 className="text-xl font-bold mb-2">Multiplayer Rooms</h2>
            <p className="text-gray-300">
              Create or join rooms with 2-4 players and compete for the prize pool
            </p>
          </div>
          
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <Coins className="h-12 w-12 mb-4 text-game-yellow" />
            <h2 className="text-xl font-bold mb-2">Betting System</h2>
            <p className="text-gray-300">
              Place bets with your coins and win big when you beat your opponents
            </p>
          </div>
          
          <div className="glass-panel p-6 flex flex-col items-center text-center">
            <Trophy className="h-12 w-12 mb-4 text-game-magenta" />
            <h2 className="text-xl font-bold mb-2">Leaderboards</h2>
            <p className="text-gray-300">
              Track your stats and climb the ranks to become the ultimate Satta King
            </p>
          </div>
        </div>

        <section className="glass-panel p-8">
          <h2 className="text-2xl font-bold mb-4 text-center text-game-magenta">How To Play</h2>
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-2 text-game-cyan">Game Rules</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Players are dealt an equal number of cards from a standard 52-card deck</li>
                <li>On your turn, play the top card from your deck to the center pile</li>
                <li>If your card matches the top card on the pile, you collect all cards in the pile</li>
                <li>Use the shuffle option once per game to randomize your remaining cards</li>
                <li>The player with the most cards when the timer ends wins the pot</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-2 text-game-green">Quick Tips</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Watch the timer - you only have 10 seconds per turn</li>
                <li>Save your shuffle for when you need it most</li>
                <li>Choose your bet amount wisely based on your coin balance</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
