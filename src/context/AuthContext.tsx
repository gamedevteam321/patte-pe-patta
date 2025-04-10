import React, { createContext, useState, useContext, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";

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
    const session = getSession();
    if (!session) return false;

    if (!isSessionValid(session)) {
      try {
        // Try to refresh the session
        const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error("Session refresh failed:", error);
          return false;
        }
        if (newSession) {
          saveSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
            expires_at: newSession.expires_at!,
          });
          return true;
        }
      } catch (error) {
        console.error("Error refreshing session:", error);
        return false;
      }
    }
    return true;
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

  useEffect(() => {
    // Set up auth state listener for Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session ? "User logged in" : "No session");
      
      if (session?.user) {
        // Save session to localStorage
        saveSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at!,
        });

        // If we have a Supabase session, retrieve or initialize the user data
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          parsedUser.id = session.user.id;
          setUser(parsedUser);
        } else {
          const newUser: User = {
            id: session.user.id,
            username: session.user.email?.split('@')[0] || 'Player',
            email: session.user.email || '',
            avatar: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`,
            coins: 1000,
            wins: 0,
            losses: 0
          };
          setUser(newUser);
          localStorage.setItem("user", JSON.stringify(newUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("session");
      }
      setIsLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("session");
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'demopassword'
      });
      
      if (error) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: 'demopassword'
        });
        
        if (signUpError) throw signUpError;
      }
      
      const mockUser: User = {
        id: data?.user?.id || uuidv4(),
        username: email.split('@')[0],
        email,
        avatar: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`,
        coins: 1000,
        wins: 0,
        losses: 0,
      };
      
      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'demopassword'
      });
      
      if (error) throw error;
      
      const mockUser: User = {
        id: data?.user?.id || uuidv4(),
        username,
        email,
        avatar: `/avatars/avatar${Math.floor(Math.random() * 8) + 1}.png`,
        coins: 1000,
        wins: 0,
        losses: 0,
      };
      
      setUser(mockUser);
      localStorage.setItem("user", JSON.stringify(mockUser));
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
      await supabase.auth.signOut();
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
