import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
};

// Token management utilities
export const tokenStorage = {
  // Save token to AsyncStorage
  saveToken: async (token) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
      console.log('✅ Token saved to storage');
      return true;
    } catch (error) {
      console.error('❌ Error saving token:', error);
      return false;
    }
  },

  // Get token from AsyncStorage
  getToken: async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        console.log('✅ Token retrieved from storage');
      } else {
        console.log('ℹ️ No token found in storage');
      }
      return token;
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  },

  // Remove token from AsyncStorage
  removeToken: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      console.log('✅ Token removed from storage');
      return true;
    } catch (error) {
      console.error('❌ Error removing token:', error);
      return false;
    }
  },

  // Save user data to AsyncStorage
  saveUser: async (user) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      console.log('✅ User data saved to storage');
      return true;
    } catch (error) {
      console.error('❌ Error saving user:', error);
      return false;
    }
  },

  // Get user data from AsyncStorage
  getUser: async () => {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      if (userJson) {
        const user = JSON.parse(userJson);
        console.log('✅ User data retrieved from storage');
        return user;
      }
      console.log('ℹ️ No user data found in storage');
      return null;
    } catch (error) {
      console.error('❌ Error getting user:', error);
      return null;
    }
  },

  // Remove user data from AsyncStorage
  removeUser: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      console.log('✅ User data removed from storage');
      return true;
    } catch (error) {
      console.error('❌ Error removing user:', error);
      return false;
    }
  },

  // Clear all auth data
  clearAll: async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
      console.log('✅ All auth data cleared from storage');
      return true;
    } catch (error) {
      console.error('❌ Error clearing auth data:', error);
      return false;
    }
  },

  // Check if user is authenticated (has valid token)
  isAuthenticated: async () => {
    const token = await tokenStorage.getToken();
    return !!token;
  },
};

export default tokenStorage;
