import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const { checkSession, isAuthenticated, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const hasValidSession = await checkSession();
        if (!hasValidSession) {
          navigate("/login");
        } else if (window.location.pathname === "/") {
          navigate("/lobby");
        }
      } catch (error) {
        console.error("Session verification failed:", error);
        navigate("/login");
      } finally {
        setIsChecking(false);
      }
    };

    verifySession();
  }, [checkSession, navigate]);

  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-game-cyan" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by the useEffect
  }

  return <>{children}</>;
};

export default AuthGuard; 