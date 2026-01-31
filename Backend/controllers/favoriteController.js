import Favorite from '../models/favorite.js';
import ProductImage from '../models/productImage.js';

const getBaseUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
};

const toImageUrl = (baseUrl, imagePath) => {
  if (!imagePath) return null;
  if (String(imagePath).startsWith('http')) return imagePath;
  if (String(imagePath).startsWith('/')) return `${baseUrl}${imagePath}`;
  return `${baseUrl}/images/products/${imagePath}`;
};

const listProductImages = async (req, productId) => {
  try {
    const baseUrl = getBaseUrl(req);
    const images = await ProductImage.listByProduct(productId);
    return images.map(img => {
      const imageUrl = toImageUrl(baseUrl, img.image_url);
      return {
        id: img.id,
        filename: img.image_url,
        url: imageUrl,
        image_url: imageUrl,
        is_main: !!img.is_main
      };
    });
  } catch (err) {
    console.error('Error fetching product images:', err.message);
    return [];
  }
};

// Helper to get user ID safely from token payload
const getUserId = (req) => {
  if (!req.user) return null;
  return req.user.userId || req.user.id;
};

// Add product to favorites
export const addFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const favorite = await Favorite.add(userId, productId);
    
    res.status(201).json({
      message: 'Product added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    if (error.message === 'Product already in favorites') {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to add favorite' });
  }
};

// Remove product from favorites
export const removeFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const removed = await Favorite.remove(userId, productId);
    
    if (!removed) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json({ message: 'Product removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
};

// Toggle favorite (add if not exists, remove if exists)
export const toggleFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const isFavorite = await Favorite.isFavorite(userId, productId);
    
    if (isFavorite) {
      await Favorite.remove(userId, productId);
      return res.json({
        message: 'Product removed from favorites',
        isFavorite: false
      });
    } else {
      const favorite = await Favorite.add(userId, productId);
      return res.status(201).json({
        message: 'Product added to favorites',
        isFavorite: true,
        data: favorite
      });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Failed to toggle favorite' });
  }
};

// Check if product is favorited
export const checkFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { productId } = req.params;
    
    if (!userId) {
      return res.json({ isFavorite: false });
    }

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const isFavorite = await Favorite.isFavorite(userId, productId);
    
    res.json({ isFavorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ message: 'Failed to check favorite' });
  }
};

// Get user's favorites
export const getUserFavorites = async (req, res) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    const [favoritesList, count] = await Promise.all([
      Favorite.getUserFavorites(userId, limit, offset),
      Favorite.getUserFavoritesCount(userId)
    ]);

    // Enrich favorites with images
    const favorites = await Promise.all(
      favoritesList.map(async (product) => {
        const images = await listProductImages(req, product.id);
        return {
          ...product,
          images
        };
      })
    );
    
    res.json({
      data: favorites,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Failed to get favorites' });
  }
};

// Get favorites count
export const getFavoritesCount = async (req, res) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.json({ count: 0 });
    }
    
    const count = await Favorite.getUserFavoritesCount(userId);
    
    res.json({ count });
  } catch (error) {
    console.error('Get favorites count error:', error);
    res.status(500).json({ message: 'Failed to get favorites count' });
  }
};
