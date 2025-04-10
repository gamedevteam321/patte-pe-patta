
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut, Home, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {showNav && (
        <header className="glass-panel m-2 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isMobile ? (
                <Button 
                  variant="ghost" 
                  className="p-2 text-game-cyan hover:bg-game-cyan/10"
                  onClick={toggleMenu}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="ghost" 
                  className="p-2 text-game-cyan hover:bg-game-cyan/10"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-5 w-5 mr-2" />
                  Home
                </Button>
              )}
            </div>
            
            <h1 className="text-xl md:text-2xl font-bold text-game-cyan text-glow">Patte pe Patta</h1>

            {user ? (
              <div className="flex items-center gap-2 md:gap-4">
                {!isMobile && (
                  <div className="hidden md:flex items-center gap-2">
                    <div className="text-game-yellow">
                      <span className="font-bold">{user.coins}</span> coins
                    </div>
                  </div>
                )}
                
                {isMobile ? (
                  <Button 
                    variant="ghost" 
                    className="p-2 text-game-cyan hover:bg-game-cyan/10"
                    onClick={() => navigate("/profile")}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      className="p-2 text-game-cyan hover:bg-game-cyan/10"
                      onClick={() => navigate("/profile")}
                    >
                      <User className="h-5 w-5 mr-2" />
                      Profile
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="p-2 text-game-magenta hover:bg-game-magenta/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Logout
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-game-cyan text-white hover:bg-game-cyan/80 text-xs md:text-base px-2 py-1 md:px-4 md:py-2"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => navigate("/register")}
                  className="bg-game-magenta text-white hover:bg-game-magenta/80 text-xs md:text-base px-2 py-1 md:px-4 md:py-2"
                >
                  Register
                </Button>
              </div>
            )}
          </div>
          
          {/* Mobile Menu */}
          {isMobile && menuOpen && user && (
            <div className="mt-4 py-2 border-t border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-game-yellow">
                  <span className="font-bold">{user.coins}</span> coins
                </span>
                <Button 
                  variant="ghost" 
                  className="p-2 text-game-magenta hover:bg-game-magenta/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
              <Button 
                variant="ghost"
                className="w-full justify-start text-game-cyan hover:bg-game-cyan/10"
                onClick={() => navigate("/")}
              >
                <Home className="h-5 w-5 mr-2" />
                Home
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start text-game-cyan hover:bg-game-cyan/10"
                onClick={() => navigate("/lobby")}
              >
                Play Game
              </Button>
              <Button 
                variant="ghost"
                className="w-full justify-start text-game-cyan hover:bg-game-cyan/10"
                onClick={() => navigate("/profile")}
              >
                <User className="h-5 w-5 mr-2" />
                Profile
              </Button>
            </div>
          )}
        </header>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="glass-panel m-2 p-4 text-center text-sm text-muted-foreground">
        © 2025 Patte pe Patta
      </footer>
    </div>
  );
};

export default Layout;
