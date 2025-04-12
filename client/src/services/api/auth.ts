import { apiClient } from './config';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, VerifyResponse } from './types/auth';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      const response = await apiClient.post<RegisterResponse>('/auth/register', data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
      localStorage.removeItem('token');
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Logout failed');
    }
  },

  verifyToken: async (): Promise<VerifyResponse> => {
    try {
      const response = await apiClient.get<VerifyResponse>('/auth/verify');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Token verification failed');
    }
  }
}; 