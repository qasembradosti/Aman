import api from './apiService';

// Toggle favorite (add if not exists, remove if exists)
export const toggleFavorite = async (productId) => {
  try {
    const response = await api.post('/api/favorites/toggle', { productId });
    return response.data;
  } catch (error) {
    console.error('Toggle favorite error:', error);
    throw error;
  }
};

// Add to favorites
export const addFavorite = async (productId) => {
  try {
    const response = await api.post('/api/favorites', { productId });
    return response.data;
  } catch (error) {
    console.error('Add favorite error:', error);
    throw error;
  }
};

// Remove from favorites
export const removeFavorite = async (productId) => {
  try {
    const response = await api.delete(`/api/favorites/${productId}`);
    return response.data;
  } catch (error) {
    console.error('Remove favorite error:', error);
    throw error;
  }
};

// Check if product is favorited
export const checkFavorite = async (productId) => {
  try {
    const response = await api.get(`/api/favorites/check/${productId}`);
    return response.data.isFavorite;
  } catch (error) {
    console.error('Check favorite error:', error);
    return false;
  }
};

// Get user's favorites
export const getUserFavorites = async (params = {}) => {
  try {
    const response = await api.get('/api/favorites', { params });
    return response.data;
  } catch (error) {
    console.error('Get favorites error:', error);
    throw error;
  }
};

// Get favorites count
export const getFavoritesCount = async () => {
  try {
    const response = await api.get('/api/favorites/count');
    return response.data.count;
  } catch (error) {
    console.error('Get favorites count error:', error);
    return 0;
  }
};

export default {
  toggleFavorite,
  addFavorite,
  removeFavorite,
  checkFavorite,
  getUserFavorites,
  getFavoritesCount,
};
