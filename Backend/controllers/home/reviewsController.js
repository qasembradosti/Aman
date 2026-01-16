import Review from '../../models/review.js';
import Product from '../../models/product.js';

export const createReview = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const review = await Review.add(id, req.body);
    res.status(201).json(review);
  } catch (err) {
    const status = err.code === 'INVALID_RATING' ? 400 : 500;
    res.status(status).json({ message: 'Failed to create review', error: err.message, code: err.code });
  }
};

export const listProductReviews = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const limit = Number(req.query.limit || 20);
    const offset = Number(req.query.offset || 0);
    const reviews = await Review.listByProduct(id, limit, offset);
    res.json({ data: reviews, meta: { limit, offset } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list reviews', error: err.message });
  }
};

export const getReviewSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const summary = await Review.getSummary(id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch review summary', error: err.message });
  }
};
