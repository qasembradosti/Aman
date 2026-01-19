// API Configuration Helper
// This file helps debug API connection issues

import { Platform } from 'react-native';

// Toggle mocks for specific domains
export const USE_MOCK_CATEGORIES = false; // set to false to use real API

// API Base URL Configuration
// Update this based on your setup:
export const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android') {
      return 'https://backend.aman-store.com'; // Physical Device (same WiFi) - CURRENT IP FROM BACKEND
    } else if (Platform.OS === 'ios') {
      // iOS Simulator can use 10.98.15.168
      // return 'https://backend.aman-store.com';
      return 'https://backend.aman-store.com'; // Use actual IP for consistency
    } else {
      // Physical device - use your computer's IP address
      return 'https://backend.aman-store.com';
    }
  } else {
    // Production environment
    return 'https://backend.aman-store.com';
  }
};

// Test API connection
export const testApiConnection = async () => {
  try {
    const baseUrl = getApiBaseUrl();
    console.log('Testing API connection to:', baseUrl);

    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    console.log('✅ API Connection successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ API Connection failed:', error.message);
    return { success: false, error: error.message };
  }
};

// Common troubleshooting steps
export const TROUBLESHOOTING_STEPS = `
API Connection Troubleshooting:

1. Make sure the backend server is running:
   cd Backend
   npm run dev
   
2. Check if the backend is accessible:
  Open browser: https://backend.aman-store.com/api/health
   
3. For Android Emulator:
   - Use: https://backend.aman-store.com
   
4. For iOS Simulator:
   - Use: https://backend.aman-store.com
   
5. For Physical Device:
   - Find your computer's IP address:
     Windows: ipconfig
     Mac/Linux: ifconfig
   - Use: http://YOUR_IP:3000
   - Make sure your device and computer are on the same network
   - Make sure your firewall allows connections on port 3000

6. Test the API endpoint:
   - Register: POST https://backend.aman-store.com/api/auth/register
   - Login: POST https://backend.aman-store.com/api/auth/login
   
7. Check backend logs for errors
`;

export default {
  getApiBaseUrl,
  testApiConnection,
  TROUBLESHOOTING_STEPS,
};
