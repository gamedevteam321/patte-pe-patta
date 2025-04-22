import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const API_SECRET = import.meta.env.VITE_API_SECRET || '';

// Helper function to generate HMAC using Web Crypto API
async function generateHmac(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to set required headers
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Set x-request-id
      const requestId = crypto.randomUUID();
      config.headers.set('x-request-id', requestId);
      
      // Set x-request-timestamp
      const timestamp = Date.now().toString();
      config.headers.set('x-request-timestamp', timestamp);
      
      // Calculate and set x-request-signature for POST, PUT, DELETE requests
      if (['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
        // Remove baseURL from the path to match server's path
        const path = config.url?.replace(baseURL, '') || '';
        const data = `${config.method?.toUpperCase()}${path}${JSON.stringify(config.data || {})}${timestamp}`;
        const signature = await generateHmac(data, API_SECRET);
        config.headers.set('x-request-signature', signature);

        // Log the signature data for debugging
        console.log('Signature data:', {
          method: config.method?.toUpperCase(),
          path,
          body: config.data,
          timestamp,
          signature
        });
      }

      // Log the headers for debugging
      console.log('Request headers:', {
        'x-request-id': config.headers.get('x-request-id'),
        'x-request-timestamp': config.headers.get('x-request-timestamp'),
        'x-request-signature': config.headers.get('x-request-signature'),
        method: config.method,
        url: config.url,
        data: config.data
      });
      
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Response error:', {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
); 