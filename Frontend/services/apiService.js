import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIsConnected } from '../utils/connectivityState';
import { router } from 'expo-router';
import authEvents from '../utils/authEvents';
import { getApiBaseUrl } from '../utils/apiConfig';

const apiService = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

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
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token added to request:', config.url);
      } else {
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
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    
    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - clearing auth data');
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