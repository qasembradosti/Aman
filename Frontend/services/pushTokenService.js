import api from './apiService';

/**
 * Register push token with the backend
 * @param {string} pushToken - The Expo push token
 */
export const registerPushToken = async (pushToken) => {
  try {
    const response = await api.post('/push-token/register', {
      push_token: pushToken,
    });
    console.log(' Push token registered with backend:', pushToken);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to register push token:', error);
    throw error;
  }
};

/**
 * Remove push token from the backend (call on logout)
 */
export const removePushToken = async () => {
  try {
    const response = await api.delete('/push-token/remove');
    console.log(' Push token removed from backend');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to remove push token:', error);
    throw error;
  }
};

/**
 * Get current push token from the backend
 */
export const getCurrentPushToken = async () => {
  try {
    const response = await api.get('/push-token/current');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get current push token:', error);
    throw error;
  }
};
