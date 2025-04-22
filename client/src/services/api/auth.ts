import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, VerifyResponse } from './types/auth';
import { apiClient } from './client';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    try {
      console.log('Login request data:', data);
      const response = await apiClient.post<LoginResponse>('/auth/login', data);
      console.log('Login response:', response.data);
      if (response.data.status === 'OK' && response.data.token) {
        localStorage.setItem('token', response.data.token);
        return response.data;
      } else {
        throw new Error(response.data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        status: 'NG',
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
      console.log('Register request data:', data);
      const response = await apiClient.post<RegisterResponse>('/auth/register', data);
      console.log('Register response:', response.data);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      return response.data;
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
      localStorage.removeItem('token');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.response?.data?.error || 'Logout failed');
    }
  },

  verifyToken: async (): Promise<VerifyResponse> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }
      const response = await apiClient.get<VerifyResponse>('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Verify token error:', error);
      throw new Error(error.response?.data?.error || 'Token verification failed');
    }
  }
}; 