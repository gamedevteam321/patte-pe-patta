import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { User, LogOut, Home, Menu, History, X } from "lucide-react";
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

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

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
                  src="images/patte_pe_patta.svg" 
                  alt="Patte pe Patta"
                  className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate("/")}
                />
                <img 
                  src="/Logo-new.png" 
                  alt="Patte pe Patta"
                  className="h-8 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate("/")}
                />
              </div>

              <div className="flex items-center space-x-4">
                <BalanceDisplay />
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-white hover:text-blue"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                ) : (
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
            </div>
          </div>
        </nav>
      )}

      {/* Side Panel */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-64 bg-[#2F4553] transform transition-transform duration-300 ease-in-out z-50
          ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            
            <Button
              variant="ghost"
              onClick={() => setIsMenuOpen(false)}
              className="text-white hover:text-blue"
            >
              <X className="h-5 w-5 text-white " />
            </Button>
          </div>
          
          <div className="space-y-2 ">
            <Button
              variant="ghost"
              onClick={() => {
                navigate("/profile");
                setIsMenuOpen(false);
              }}
              className="w-full text-white hover:text-white justify-start"
            >
              <User className="h-5 w-5 mr-2" />
              {user?.username || "Profile"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                navigate("/transactions");
                setIsMenuOpen(false);
              }}
              className="w-full text-white hover:text-white justify-start"
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
              className="w-full text-white hover:text-white justify-start"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
