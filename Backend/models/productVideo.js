import db from '../config/knex.js';

const ProductVideo = {
  // Add a video for a product
  add: async (productId, videoUrl, opts = {}) => {
    const { isMain = false } = opts;
    const [id] = await db('product_videos').insert({
      product_id: productId,
      video_url: videoUrl,
      is_main: isMain ? 1 : 0,
    });
    return ProductVideo.findById(id);
  },

  // Find video by id
  findById: async (id) => {
    return db('product_videos').where({ id }).first();
  },

  // List all videos for a product
  listByProduct: async (productId) => {
    return db('product_videos')
      .where({ product_id: productId })
      .orderBy('is_main', 'desc')
      .orderBy('id', 'asc');
  },

  // Delete a video
  delete: async (id) => {
    const affected = await db('product_videos').where({ id }).del();
    return affected > 0;
  },

  // Delete all videos for a product
  deleteByProduct: async (productId) => {
    return db('product_videos').where({ product_id: productId }).del();
  },

  // Set a video as main
  setMain: async (id, productId) => {
    // First, unset all main videos for this product
    await db('product_videos')
      .where({ product_id: productId })
      .update({ is_main: 0 });
    
    // Then set the specified video as main
    await db('product_videos').where({ id }).update({ is_main: 1 });
    return ProductVideo.findById(id);
  },
};

export default ProductVideo;
