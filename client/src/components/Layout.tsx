import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut, Home, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
        variant: "default",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      {showNav && (
        <nav className="bg-black/50 backdrop-blur-sm border-b border-white/10">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="text-game-cyan hover:text-game-cyan/80"
                >
                  <Home className="h-5 w-5" />
                </Button>
               
              </div>

              {isAuthenticated && (
                <div className="flex items-center space-x-4">
                  
                {/* <span className="text-white font-medium">
                  {user?.username}
                </span> */}
            
                  {isMobile ? (
                    <Button
                      variant="ghost"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => navigate("/profile")}
                        className="text-gray-400 hover:text-white"
                      >
                        <User className="h-5 w-5 mr-2" />
                        {user?.username || "Profile"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-white"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Logout
                      </Button>
                    </>
                  )}
                </div>
              )}

              {!isAuthenticated && (
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="text-gray-400 hover:text-white"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => navigate("/register")}
                    className="bg-game-cyan hover:bg-game-cyan/80 text-white"
                  >
                    Register
                  </Button>
                </div>
              )}
            </div>

            {isMobile && isMenuOpen && isAuthenticated && (
              <div className="py-2 space-y-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate("/profile");
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-gray-400 hover:text-white"
                >
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-gray-400 hover:text-white"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </nav>
      )}
      <main>{children}</main>
    </div>
  );
};

export default Layout;
