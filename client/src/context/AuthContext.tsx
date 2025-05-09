import { createContext, useState, useContext, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { authService } from "@/services/authService";

type User = {
  id: string;
  username: string;
  email: string;
  avatar: string;
  coins: number;
  wins: number;
  losses: number;
};

type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateUser: () => {},
  checkSession: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to save session to localStorage
  const saveSession = (session: Session) => {
    localStorage.setItem('session', JSON.stringify(session));
  };

  // Function to get session from localStorage
  const getSession = (): Session | null => {
    const sessionStr = localStorage.getItem('session');
    return sessionStr ? JSON.parse(sessionStr) : null;
  };

  // Function to check if session is valid
  const isSessionValid = (session: Session): boolean => {
    const now = new Date().getTime();
    return session.expires_at * 1000 > now;
  };

  // Function to check if user is logged in
  const checkSession = async (): Promise<boolean> => {
    console.log("Starting session check...");
    try {
      const session = getSession();
      console.log("Retrieved session:", session ? "exists" : "not found");
      
      if (!session) {
        console.log("No session found in localStorage");
        return false;
      }

      const isValid = isSessionValid(session);
      console.log("Session validity check:", isValid);
      
      if (!isValid) {
        console.log("Session expired, verifying token");
        try {
          const response = await authService.verifyToken(session.access_token);
          console.log("Token verification response:", response);
          
          if (response.status === 'NG') {
            console.log("Token verification failed");
            return false;
          }
          
          if (response.user) {
            console.log("Token verified, updating user");
            setUser(response.user);
            saveSession({
              access_token: response.token || session.access_token,
              refresh_token: response.token || session.refresh_token,
              expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours from now
            });
            return true;
          }
        } catch (error) {
          console.error("Error verifying token:", error);
          return false;
        }
      }

      // If we have a valid session but no user in state, try to get it from localStorage
      if (!user) {
        console.log("No user in state, checking localStorage");
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          console.log("Restoring user from localStorage");
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            return true;
          } catch (error) {
            console.error("Error parsing stored user:", error);
            return false;
          }
        } else {
          console.log("No user found in localStorage");
          return false;
        }
      }

      console.log("Session check completed successfully");
      return true;
    } catch (error) {
      console.error("Error in checkSession:", error);
      return false;
    }
  };

  // Check session on mount and periodically
  useEffect(() => {
    const verifySession = async () => {
      const isValid = await checkSession();
      if (!isValid) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("session");
      }
    };

    // Check immediately
    verifySession();

    // Check every 5 minutes
    const interval = setInterval(verifySession, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await authService.login(email, password);
      
      if (response.status === 'NG' || !response.user || !response.token) {
        throw new Error(response.error || 'Login failed');
      }
      
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      saveSession({
        access_token: response.token,
        refresh_token: response.token,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours from now
      });
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await authService.register(username, email, password);
      
      if (response.status === 'NG' || !response.user || !response.token) {
        throw new Error(response.error || 'Registration failed');
      }
      
      setUser(response.user);
      localStorage.setItem("user", JSON.stringify(response.user));
      saveSession({
        access_token: response.token,
        refresh_token: response.token,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60 // 24 hours from now
      });
    } catch (error) {
      console.error("Registration failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("session");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
