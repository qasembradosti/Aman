import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIsConnected } from '../utils/connectivityState';
import { router } from 'expo-router';
import authEvents from '../utils/authEvents';
import { getApiBaseUrl } from '../utils/apiConfig';

const baseURL = getApiBaseUrl();
console.log('📡 API Base URL:', baseURL);

const apiService = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// List of endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password'
];

// Request interceptor to add token from AsyncStorage
apiService.interceptors.request.use(
  async (config) => {
    try {
      const online = getIsConnected && getIsConnected();
      if (online === false) {
        // Create a predictable error shape for callers
        const err = new Error('No internet connection');
        err.isOffline = true;
        return Promise.reject(err);
      }
    } catch (e) {
      // if connectivity module not available, continue and let network errors surface
    }
    
    // Check if this is a public endpoint that doesn't need authentication
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (!isPublicEndpoint) {
        // Only warn about missing token for protected endpoints
        console.warn('⚠️ No token found for request:', config.url);
      }
    } catch (error) {
      console.error('❌ Error getting token from storage:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiService.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.multiRemove(['token', 'user']);
      } catch { }
      authEvents.emit('logout', { reason: 'token-expired' });
      try { router.replace('/(auth)/login'); } catch { }
    }
    return Promise.reject(error);
  }
);

export default apiService;