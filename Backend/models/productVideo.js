import db from '../config/knex.js';

const ProductVideo = {
  // Create a new video record
  create: async (data) => {
    const [id] = await db('product_videos').insert(data);
    return ProductVideo.findById(id);
  },

  // Update an existing video
  update: async (id, data) => {
    await db('product_videos').where({ id }).update(data);
    return ProductVideo.findById(id);
  },

  // Find video by product ID
  findByProductId: async (productId) => {
    return db('product_videos').where({ product_id: productId }).first();
  },

  // Add a video for a product (replaces existing video)
  add: async (productId, videoUrl, opts = {}) => {
    const { isMain = true } = opts; // Always main since only one video allowed
    
    // Delete any existing videos for this product
    await db('product_videos').where({ product_id: productId }).del();
    
    // Add the new video
    const [id] = await db('product_videos').insert({
      product_id: productId,
      video_url: videoUrl,
      is_main: 1, // Always main since only one video per product
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
export { ProductVideo };
