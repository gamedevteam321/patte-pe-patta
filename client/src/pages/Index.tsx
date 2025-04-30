import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { PlayCircle, Coins, Clock, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const games = [
    {
      id: "casual",
      title: "Casual Game",
      description: "Relaxed gameplay with longer turn times",
      icon: <PlayCircle className="h-8 w-8" />,
      activePlayers: 12800,
      comingSoon: false,
      roomType: "casual",
      config: {
        turnTime: 15000,
        gameDuration: 300000,
        maxPlayers: 4,
        minBet: 50,
        maxBet: 10000,
        shufflesAllowed: 2,
        cardDistribution: {
          "2": 26,
          "3": 17,
          "4": 13
        }
      }
    },
    {
      id: "quick",
      title: "Quick Game",
      description: "Fast-paced games with quick turns",
      icon: <Clock className="h-8 w-8" />,
      activePlayers: 0,
      comingSoon: false,
      roomType: "quick",
      config: {
        turnTime: 10000,
        gameDuration: 180000,
        maxPlayers: 4,
        minBet: 50,
        maxBet: 10000,
        shufflesAllowed: 1,
        cardDistribution: {
          "2": 26,
          "3": 17,
          "4": 13
        }
      }
    },
    {
      id: "competitive",
      title: "Competitive Game",
      description: "High-stakes games with strategic gameplay",
      icon: <Coins className="h-8 w-8" />,
      activePlayers: 0,
      comingSoon: false,
      roomType: "competitive",
      config: {
        turnTime: 20000,
        gameDuration: 480000,
        maxPlayers: 4,
        minBet: 50,
        maxBet: 10000,
        shufflesAllowed: 1,
        cardDistribution: {
          "2": 26,
          "3": 17,
          "4": 13
        }
      }
    },
    {
      id: "speed",
      title: "Speed Patte",
      description: "Fast-paced version with time limits",
      icon: <PlayCircle className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "tournament",
      title: "Tournament Mode",
      description: "Compete in organized tournaments",
      icon: <Coins className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "team",
      title: "Team Battle",
      description: "Play in teams of 2",
      icon: <Users className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "royale",
      title: "Battle Royale",
      description: "Last player standing wins",
      icon: <Coins className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "practice",
      title: "Practice Mode",
      description: "Play against AI",
      icon: <PlayCircle className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "custom",
      title: "Custom Rules",
      description: "Create your own game rules",
      icon: <Coins className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "seasonal",
      title: "Seasonal Events",
      description: "Limited time special modes",
      icon: <PlayCircle className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "ranked",
      title: "Ranked Play",
      description: "Compete for leaderboard position",
      icon: <Coins className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    },
    {
      id: "challenge",
      title: "Daily Challenges",
      description: "Complete daily objectives",
      icon: <Coins className="h-8 w-8" />,
      comingSoon: true,
      activePlayers: 0
    }
  ];

  return (
    <Layout>
      <div className="w-full">
        {/* Hero Section */}
        <div 
          className="relative w-full h-[60vh] bg-cover bg-center"
          style={{ backgroundImage: 'url(/hero-bg.png)' }}
        >
          <div className="absolute inset-0 bg-black/30">
            <div className="container mx-auto h-full">
              <div className="flex items-center h-full">
                <div className="w-full md:w-1/2 px-4">
                  <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 text-glow">
                    Experience the Thrill
                  </h2>
                  <p className="text-xl text-gray-200 max-w-2xl mb-8">
                    Join the ultimate card game experience with real-time multiplayer action
                  </p>
                  {!user && (
                    <div>
                      <Button
                        onClick={() => navigate("/register")}
                        className="bg-game-cyan hover:bg-game-cyan/80 text-white text-lg py-6 px-8 w-full md:w-auto"
                      >
                        Register Now
                      </Button>
                      <div className="mt-4 pl-7">
                        <p className="text-gray-400 mb-2">Or sign up with</p>
                        <div className="flex gap-6">
                          <button 
                            className="bg-[#2F4553] hover:bg-[#2F4553]/90 p-2 rounded-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] active:translate-x-[1px] active:translate-y-[1px]"
                            onClick={() => navigate("/register")}
                          >
                            <img src="/facebook.svg" alt="Facebook" className="w-6 h-6" />
                          </button>
                          <button 
                            className="bg-[#2F4553] hover:bg-[#2F4553]/90 p-2 rounded-md transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)] active:translate-x-[1px] active:translate-y-[1px]"
                            onClick={() => navigate("/register")}
                          >
                            <img src="/google.svg" alt="Google" className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden md:block w-1/2 h-full relative">
                  <img 
                    src="/lady-hero.png" 
                    alt="Lady Hero" 
                    className="absolute bottom-0 right-0 h-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Game Selection Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <PlayCircle className="h-6 w-6 text-game-cyan" />
              Trending Games
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => scroll('left')}
                className="bg-[#2F4553]/50 hover:bg-[#2F4553] p-2 rounded-md transition-all"
              >
                <ChevronLeft className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="bg-[#2F4553]/50 hover:bg-[#2F4553] p-2 rounded-md transition-all"
              >
                <ChevronRight className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {games.map((game, index) => (
              <div 
                key={game.id} 
                onClick={() => !game.comingSoon && (user ? navigate(`/lobby?game=${game.id}`) : navigate('/register'))}
                className={`
                  flex-none w-[200px]
                  glass-panel rounded-lg overflow-hidden
                  transition-all duration-300 
                  ${game.comingSoon ? 'opacity-60' : 'hover:scale-105 hover:shadow-2xl cursor-pointer'} 
                  relative
                `}
              >
                <div className="absolute top-2 left-2 z-10 bg-black/50 rounded px-2 py-1">
                  <span className="text-white text-sm font-bold">{index + 1}</span>
                </div>
                {game.comingSoon && (
                  <div className="absolute top-2 right-2 z-10 bg-yellow-500/90 rounded px-2 py-1">
                    <span className="text-black text-xs font-bold">COMING SOON</span>
                  </div>
                )}
                <div className="aspect-[4/3] w-full bg-gradient-to-b from-game-cyan/20 to-blue-900/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {game.icon}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-white font-bold mb-1 truncate">{game.title}</h3>
                  <p className="text-gray-400 text-sm mb-2 line-clamp-2 h-10">
                    {game.description}
                  </p>
                  {!game.comingSoon && game.config && (
                    <div className="text-xs text-gray-400 mb-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>Turn Time: {game.config.turnTime / 1000}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>Players: {game.config.maxPlayers}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Coins className="h-3 w-3" />
                        <span>Bet: {game.config.minBet} - {game.config.maxBet}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full animate-pulse" 
                        style={{ backgroundColor: game.comingSoon ? '#666' : '#1FFF20' }} 
                      />
                      <span className="text-xs text-gray-400">
                        {game.activePlayers} playing
                      </span>
                    </div>
                    {!game.comingSoon && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          user ? navigate(`/lobby?game=${game.id}`) : navigate('/register');
                        }}
                        className="text-xs bg-game-cyan hover:bg-game-cyan/80 text-white px-2 py-1 rounded transition-colors"
                      >
                        Play
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
