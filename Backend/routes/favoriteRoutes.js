import express from 'express';
import * as favoriteController from '../controllers/favoriteController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

console.log(' Favorites routes loading...');

const router = express.Router();

// Get favorites count (must be before /:productId routes)
router.get('/favorites/count', authenticateToken, favoriteController.getFavoritesCount);

// Check if product is favorited (must be before / route)
router.get('/favorites/check/:productId', authenticateToken, favoriteController.checkFavorite);

// Get user's favorites (must be last among GET routes)
router.get('/favorites', authenticateToken, favoriteController.getUserFavorites);

// Toggle favorite (add/remove)
router.post('/favorites/toggle', authenticateToken, favoriteController.toggleFavorite);

// Add to favorites
router.post('/favorites', authenticateToken, favoriteController.addFavorite);

// Remove from favorites
router.delete('/favorites/:productId', authenticateToken, favoriteController.removeFavorite);

console.log(' Favorites routes registered');

export default router;
