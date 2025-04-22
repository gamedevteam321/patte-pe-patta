import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-request-id': uuidv4()
  },
  withCredentials: false // Don't send cookies with requests
});

// Add request interceptor for adding auth token and request ID
apiClient.interceptors.request.use(
  (config) => {
    // Get token from session object
    const sessionStr = localStorage.getItem('session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        console.error('Error parsing session from localStorage', e);
      }
    }
    
    // Ensure x-request-id is present for every request
    if (!config.headers['x-request-id']) {
      config.headers['x-request-id'] = uuidv4();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
); 