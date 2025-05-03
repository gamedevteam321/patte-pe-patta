import axios from 'axios';

// Ensure the API URL is properly formatted
const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    }
    return 'http://localhost:3000/api/v1';
};

const API_URL = getApiUrl();

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'client-' + Math.random().toString(36).substring(7)
    },
    withCredentials: true
});

// Add request interceptor to generate unique request ID for each request
axiosInstance.interceptors.request.use((config) => {
    config.headers['x-request-id'] = 'client-' + Math.random().toString(36).substring(7);
    return config;
});

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
    (response) => {
        console.log('Response received:', {
            status: response.status,
            data: response.data,
            headers: response.headers
        });
        return response;
    },
    (error) => {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response error:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
        } else if (error.request) {
            // The request was made but no response was received
            console.error('Request error:', {
                message: error.message,
                request: error.request
            });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message);
        }
        return Promise.reject(error);
    }
);

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
      console.log('Attempting login with:', { email });
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      console.log('Login response:', response.data);
      
      // Convert server response format to expected format
      if (response.data.status === 'OK') {
        return {
          status: 'OK',
          user: response.data.user,
          token: response.data.token
        };
      }
      
      return {
        status: 'NG',
        error: response.data.error || 'Login failed'
      };
    } catch (error: any) {
      console.error('Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return {
        status: 'NG',
        error: error.response?.data?.error || error.message || 'Login failed'
      };
    }
  },

  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axiosInstance.post('/auth/register', {
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
      const response = await axiosInstance.post('/auth/logout');
      return response.data;
    } catch (error) {
      return { success: false };
    }
  },

  verifyToken: async (token: string): Promise<AuthResponse> => {
    console.log("Verifying token...");
    try {
      const response = await axiosInstance.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000 // 5 second timeout
      });
      console.log("Token verification response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Token verification error:", error);
      if (error.code === 'ECONNABORTED') {
        return {
          status: 'NG',
          error: 'Connection timed out'
        };
      }
      return {
        status: 'NG',
        error: error.response?.data?.error || 'Token verification failed'
      };
    }
  }
}; 