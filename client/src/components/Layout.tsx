import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut, Home, Menu, History } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { BalanceDisplay } from "./Balance/BalanceDisplay";
import Footer from "./Footer";

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
    <div className="min-h-screen bg-blue flex flex-col">
      {showNav && (
        <nav className="bg-blue backdrop-blur-sm border-b border-white/90">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <img 
                  src="/Logo-new.png" 
                  alt="Patte pe Patta"
                  className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate("/")}
                />
              </div>

              {isAuthenticated && (
                <div className="flex items-center space-x-4">
                  <BalanceDisplay />
                  {isMobile ? (
                    <Button
                      variant="ghost"
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      className="text-white hover:text-blue"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => navigate("/profile")}
                        className="text-white hover:text-blue"
                      >
                        <User className="h-5 w-5 mr-2" />
                        {user?.username || "Profile"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => navigate("/transactions")}
                        className="text-white hover:text-blue"
                      >
                        <History className="h-5 w-5 mr-2" />
                        Transactions
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="text-white hover:text-blue"
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
                    className="text-white hover:text-white"
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
                    navigate("/transactions");
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-gray-400 hover:text-white"
                >
                  <History className="h-5 w-5 mr-2" />
                  Transactions
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
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
