
import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Mock socket connection - in a real app, connect to your Socket.IO server
    if (user) {
      // In a real implementation, you would connect to your actual Socket.IO server
      // For now, we'll mock the Socket interface
      const mockSocket = {
        on: (event: string, callback: (...args: any[]) => void) => {
          console.log(`Socket registered event: ${event}`);
          return mockSocket;
        },
        emit: (event: string, ...args: any[]) => {
          console.log(`Socket emitted event: ${event}`, args);
          return mockSocket;
        },
        disconnect: () => {
          console.log("Socket disconnected");
        },
      } as unknown as Socket;

      setSocket(mockSocket as Socket);
      setIsConnected(true);

      return () => {
        if (mockSocket) {
          mockSocket.disconnect();
          setSocket(null);
          setIsConnected(false);
        }
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
