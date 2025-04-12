import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export interface AuthResponse {
  status: string;
  user?: {
    id: string;
    username: string;
    email: string;
    avatar: string;
    coins: number;
    wins: number;
    losses: number;
  };
  token?: string;
  error?: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      return {
        status: 'NG',
        error: error.response?.data?.error || 'Login failed'
      };
    }
  },

  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });
      return response.data;
    } catch (error: any) {
      return {
        status: 'NG',
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  },

  logout: async (): Promise<{ success: boolean }> => {
    try {
      const response = await axios.post(`${API_URL}/auth/logout`);
      return response.data;
    } catch (error) {
      return { success: false };
    }
  },

  verifyToken: async (token: string): Promise<AuthResponse> => {
    try {
      const response = await axios.get(`${API_URL}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      return {
        status: 'NG',
        error: error.response?.data?.error || 'Token verification failed'
      };
    }
  }
}; 