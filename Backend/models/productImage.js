import db from '../config/knex.js';

// NOTE: DB schema (Aman.sql) defines columns: id, product_id, image_url, is_main
// Previous code expected a 'filename' column. We'll store the raw filename in image_url
// and compute full public URL when returning records.

const ProductImage = {
  add: async (productId, filename, { isMain = false } = {}) => {
    // Insert using image_url column; treat provided filename as stored value
    const [id] = await db('product_images').insert({ product_id: productId, image_url: filename, is_main: isMain });
    return await db('product_images').where({ id }).first();
  },
  listByProduct: async (productId) => {
    return db('product_images').where({ product_id: productId }).orderBy('id', 'asc');
  },
  setMain: async (imageId, productId) => {
    // Clear existing main then set new
    await db('product_images').where({ product_id: productId }).update({ is_main: false });
    await db('product_images').where({ id: imageId, product_id: productId }).update({ is_main: true });
    return await db('product_images').where({ id: imageId }).first();
  }
};

export default ProductImage;
