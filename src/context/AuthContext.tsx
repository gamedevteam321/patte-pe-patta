
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

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener for Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // If we have a Supabase session, retrieve or initialize the user data
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          // Use saved user data but ensure the ID matches the session
          const parsedUser = JSON.parse(savedUser);
          parsedUser.id = session.user.id; // Ensure ID matches Supabase
          setUser(parsedUser);
        } else {
          // Create new user data based on Supabase session
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
        // No session, check for local data
        const savedUser = localStorage.getItem("user");
        if (savedUser && !session) {
          // We have local data but no session, attempt to create a session
          createOrRestoreSession();
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If no active session, check for saved user data
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          // We have saved user data but no session, try to create/restore a session
          createOrRestoreSession();
        } else {
          setIsLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Create or restore a Supabase session based on saved user data
  const createOrRestoreSession = async () => {
    const savedUserStr = localStorage.getItem("user");
    if (!savedUserStr) return;
    
    try {
      const savedUser = JSON.parse(savedUserStr);
      
      // Try to sign in with demo credentials
      if (savedUser.email) {
        await supabase.auth.signInWithPassword({
          email: savedUser.email,
          password: 'demopassword' // Fixed password for demo
        }).catch(async () => {
          // If sign-in fails, try to sign up
          await supabase.auth.signUp({
            email: savedUser.email,
            password: 'demopassword'
          });
        });
      } else {
        // Fallback to mock authentication
        setUser(savedUser);
      }
    } catch (error) {
      console.error("Failed to restore session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function that also creates a Supabase session
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: 'demopassword' // Using a fixed password for demo
      });
      
      if (error) {
        // If login fails, try to sign up
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: 'demopassword'
        });
        
        if (signUpError) throw signUpError;
      }
      
      // Create or update the user data
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

  // Register function that also creates a Supabase session
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password: 'demopassword' // Using a fixed password for demo
      });
      
      if (error) throw error;
      
      // Create the user data
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
    // Sign out from Supabase
    await supabase.auth.signOut();
    // Clear local data
    setUser(null);
    localStorage.removeItem("user");
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
