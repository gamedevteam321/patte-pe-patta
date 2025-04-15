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
  const [error, setError] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<string>("Starting verification...");

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const verifySession = async () => {
      if (!isMounted) return;

      try {
        console.log("Starting session verification...");
        setIsChecking(true);
        setError(null);
        setVerificationStep("Checking session...");

        // Add a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.log("Session verification timed out");
            setError("Session verification timed out. Please try again.");
            setIsChecking(false);
            navigate("/login");
          }
        }, 10000); // 10 seconds timeout

        setVerificationStep("Verifying token...");
        const hasValidSession = await checkSession();
        console.log("Session verification result:", hasValidSession);

        if (!isMounted) return;

        clearTimeout(timeoutId);

        if (!hasValidSession) {
          console.log("No valid session found, redirecting to login");
          setError("Session expired. Please log in again.");
          navigate("/login");
          return;
        }

        // Only redirect to lobby if we're on the root path
        if (window.location.pathname === "/") {
          console.log("Root path detected, redirecting to lobby");
          navigate("/lobby");
          return;
        }

        console.log("Session verified successfully");
        setVerificationStep("Session verified!");
        setIsChecking(false); // Set checking to false when session is verified
      } catch (error) {
        console.error("Session verification failed:", error);
        if (isMounted) {
          setError("Failed to verify session. Please try again.");
          navigate("/login");
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [checkSession, navigate]);

  // Show loading state only while checking session
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-game-cyan" />
          <p className="mt-4 text-game-cyan">{verificationStep}</p>
          {error && (
            <p className="mt-2 text-red-500">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // If not authenticated, show nothing (will be redirected by useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated and session is valid, render children
  return <>{children}</>;
};

export default AuthGuard; 