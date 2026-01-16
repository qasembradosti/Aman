import express from 'express';
import {
  getReviews,
  getProductReviews,
  getProductReviewSummary,
  createReview,
  updateReview,
  deleteReview
} from '../controllers/reviewController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all reviews (with pagination and filters)
router.get('/reviews', getReviews);

// Get reviews for a specific product
router.get('/products/:productId/reviews', getProductReviews);

// Get review summary for a product
router.get('/products/:productId/reviews/summary', getProductReviewSummary);

// Create a new review (requires authentication)
router.post('/reviews', authenticateToken, createReview);

// Update a review (requires authentication)
router.put('/reviews/:id', authenticateToken, updateReview);

// Delete a review (requires authentication)
router.delete('/reviews/:id', authenticateToken, deleteReview);

export default router;
