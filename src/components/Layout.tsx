
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut, Home } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {showNav && (
        <header className="glass-panel m-2 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              className="p-2 text-game-cyan hover:bg-game-cyan/10"
              onClick={() => navigate("/")}
            >
              <Home className="h-5 w-5 mr-2" />
              Home
            </Button>
          </div>
          
          <h1 className="text-2xl font-bold text-game-cyan text-glow">Satta Kings Arena</h1>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <div className="text-game-yellow">
                  <span className="font-bold">{user.coins}</span> coins
                </div>
              </div>
              
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
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => navigate("/login")}
                className="bg-game-cyan text-black hover:bg-game-cyan/80"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-game-magenta text-black hover:bg-game-magenta/80"
              >
                Register
              </Button>
            </div>
          )}
        </header>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="glass-panel m-2 p-4 text-center text-sm text-muted-foreground">
        © 2025 Satta Kings Arena
      </footer>
    </div>
  );
};

export default Layout;
