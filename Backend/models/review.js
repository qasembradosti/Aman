import db from '../config/knex.js';

const Review = {
  // Add a review for a product
  add: async (productId, { user_id = null, rating, comment = null }) => {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      const err = new Error('rating must be between 1 and 5');
      err.code = 'INVALID_RATING';
      throw err;
    }
    const [id] = await db('product_reviews').insert({
      product_id: productId,
      user_id,
      rating: r,
      comment,
    });
    return await db('product_reviews').where({ id }).first();
  },

  // List reviews for a product
  listByProduct: async (productId, limit = 20, offset = 0) => {
    return db('product_reviews')
      .where({ product_id: productId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  },

  // Get summary: average rating, count, per-star breakdown
  getSummary: async (productId) => {
    const row = await db('product_reviews')
      .where({ product_id: productId })
      .avg({ average: 'rating' })
      .count({ count: '*' })
      .first();
    const breakdownRows = await db('product_reviews')
      .where({ product_id: productId })
      .select('rating')
      .count({ c: '*' })
      .groupBy('rating');

    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    breakdownRows.forEach((r) => { breakdown[r.rating] = Number(r.c); });

    return {
      average: row?.average != null ? Number(row.average) : 0,
      count: row?.count != null ? Number(row.count) : 0,
      breakdown,
    };
  },
};

export default Review;
