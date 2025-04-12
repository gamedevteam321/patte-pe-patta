export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  coins: number;
  wins: number;
  losses: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: 'OK' | 'NG';
  user?: User;
  token?: string;
  error?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

export interface VerifyResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
} 