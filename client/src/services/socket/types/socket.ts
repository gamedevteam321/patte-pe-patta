export interface SocketEvent {
  type: string;
  data: any;
}

export interface SocketConfig {
  url: string;
  options?: {
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
  };
}

export interface SocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
} 