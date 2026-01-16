import Review from '../models/review.js';
import db from '../config/knex.js';

// Get all reviews (with pagination and filters)
export const getReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, product_id, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = db('product_reviews')
      .select(
        'product_reviews.*',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'products.name as product_name'
      )
      .leftJoin('users', 'product_reviews.user_id', 'users.id')
      .leftJoin('products', 'product_reviews.product_id', 'products.id')
      .where(function() {
        this.where('users.role', '!=', 'superadmin').orWhereNull('users.role');
      });

    if (product_id) {
      query = query.where('product_reviews.product_id', product_id);
    }

    if (user_id) {
      query = query.where('product_reviews.user_id', user_id);
    }

    const totalRow = await query.clone().clearSelect().count({ total: '*' }).first();
    const total = parseInt(totalRow.total);

    const reviews = await query
      .orderBy('product_reviews.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
  }
};

// Get reviews for a specific product
export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const reviews = await Review.listByProduct(
      productId,
      parseInt(limit),
      parseInt(offset)
    );

    // Get user information for each review
    const reviewsWithUsers = await Promise.all(
      reviews.map(async (review) => {
        if (review.user_id) {
          const user = await db('users')
            .select('first_name', 'last_name')
            .where('id', review.user_id)
            .first();
          return { ...review, user };
        }
        return review;
      })
    );

    res.json(reviewsWithUsers);
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ message: 'Failed to fetch product reviews', error: error.message });
  }
};

// Get review summary for a product
export const getProductReviewSummary = async (req, res) => {
  try {
    const { productId } = req.params;
    const summary = await Review.getSummary(productId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching review summary:', error);
    res.status(500).json({ message: 'Failed to fetch review summary', error: error.message });
  }
};

// Create a new review
export const createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user?.id; // From auth middleware

    if (!product_id || !rating) {
      return res.status(400).json({ message: 'Product ID and rating are required' });
    }

    // Check if product exists
    const product = await db('products').where('id', product_id).first();
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed this product
    if (user_id) {
      const existingReview = await db('product_reviews')
        .where({ product_id, user_id })
        .first();
      
      if (existingReview) {
        return res.status(400).json({ message: 'You have already reviewed this product' });
      }
    }

    const review = await Review.add(product_id, {
      user_id,
      rating,
      comment
    });

    res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    if (error.code === 'INVALID_RATING') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review', error: error.message });
  }
};

// Update a review
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const user_id = req.user?.id;

    // Validate rating if provided
    if (rating !== undefined) {
      const r = Number(rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }
    }

    // Check if review exists
    const review = await db('product_reviews').where('id', id).first();
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns the review
    if (user_id && review.user_id !== user_id) {
      return res.status(403).json({ message: 'You can only update your own reviews' });
    }

    const updateData = {};
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    await db('product_reviews').where('id', id).update(updateData);

    const updatedReview = await db('product_reviews').where('id', id).first();

    res.json({
      message: 'Review updated successfully',
      review: updatedReview
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Failed to update review', error: error.message });
  }
};

// Delete a review
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Check if review exists
    const review = await db('product_reviews').where('id', id).first();
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns the review or is admin
    if (!isAdmin && user_id && review.user_id !== user_id) {
      return res.status(403).json({ message: 'You can only delete your own reviews' });
    }

    await db('product_reviews').where('id', id).del();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review', error: error.message });
  }
};
