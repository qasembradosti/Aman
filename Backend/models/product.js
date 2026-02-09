import db from '../config/knex.js';

const Product = {
  // Find all products with filters
  findAll: async (filters = {}) => {
    const {
      q,
      category_id,
      brand_id,
      in_stock,
      is_trend,
      is_important,
      min_price,
      max_price,
      sort = 'created_at',
      order = 'desc',
      limit = 20,
      offset = 0,
    } = filters;

    const query = db('products')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .leftJoin('stores', 'products.store_id', 'stores.id')
      .select(
        'products.*',
        'brands.name as brand_name',
        'brands.logo_url as brand_logo',
        'categories.name as category_name',
        'stores.name as store_name'
      );

    // Search filter
    if (q) {
      query.where(function () {
        this.whereILike('products.name_en', `%${q}%`)
          .orWhereILike('products.name_ku', `%${q}%`)
          .orWhereILike('products.name_ar', `%${q}%`)
          .orWhereILike('products.description_en', `%${q}%`)
          .orWhereILike('products.description_ku', `%${q}%`)
          .orWhereILike('products.description_ar', `%${q}%`)
      });
    }

    // Category filter
    if (category_id) {
      query.where('products.category_id', category_id);
    }

    // Brand filter
    if (brand_id) {
      query.where('products.brand_id', brand_id);
    }

    // In stock filter
    if (in_stock !== undefined) {
      query.where('products.in_stock', in_stock);
    }

    // Trending filter
    if (is_trend !== undefined) {
      query.where('products.is_trend', is_trend);
    }

    // Important filter
    if (is_important !== undefined) {
      query.where('products.is_important', is_important);
    }

    // Price range filters
    if (min_price !== undefined && min_price !== null) {
      query.where('products.base_price', '>=', min_price);
    }
    if (max_price !== undefined && max_price !== null) {
      query.where('products.base_price', '<=', max_price);
    }

    // Get total count
    const totalRow = await query.clone().clearSelect().clearOrder().count({ total: '*' }).first();
    const total = Number(totalRow?.total || 0);

    // Apply sorting and pagination
    const validSortFields = ['created_at', 'base_price', 'name_en'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const products = await query
      .orderBy(`products.${sortField}`, sortOrder)
      .limit(parseInt(limit) || 20)
      .offset(parseInt(offset) || 0);

    return {
      data: products,
      meta: {
        total,
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0,
      },
    };
  },

  // Find product by id
  findById: async (id) => {
    return db('products')
      .leftJoin('brands', 'products.brand_id', 'brands.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .leftJoin('stores', 'products.store_id', 'stores.id')
      .select(
        'products.*',
        'brands.name as brand_name',
        'brands.logo_url as brand_logo',
        'categories.name as category_name',
        'stores.name as store_name'
      )
      .where('products.id', id)
      .first();
  },

  // Create a new product
  create: async (productData) => {
    const {
      name_en,
      name_ku,  
      name_ar,
      category_id,
      brand_id,
      store_id,
      base_price,
      sell_price,
      commission_price,
      in_stock,
      description_en,
      description_ku,
      description_ar,
      key_features_en,
      key_features_ku,
      key_features_ar,
      discount,
      discount_type,
      discount_expires,
      product_code,
      size,
      volume,
      colors,
      is_trend,
      is_important,
    } = productData;

    if (!name_en || !base_price) {
      throw new Error('name and base_price are required');
    }

    return await Product.findById(id);
  },

  // Update product
  update: async (id, productData) => {
    const updates = { ...productData };

    // Prevent updating immutable fields
    delete updates.id;
    delete updates.created_at;

    if (Object.prototype.hasOwnProperty.call(updates, 'key_features')) {
      if (updates.key_features == null) {
        updates.key_features = null;
      } else if (Array.isArray(updates.key_features)) {
        updates.key_features = JSON.stringify(updates.key_features);
      } else if (typeof updates.key_features === 'string') {
        const trimmed = updates.key_features.trim();
        if (!trimmed) {
          updates.key_features = null;
        } else {
          try {
            updates.key_features = JSON.stringify(JSON.parse(trimmed));
          } catch (err) {
            const parts = trimmed.split(',').map((f) => f.trim()).filter(Boolean);
            updates.key_features = JSON.stringify(parts);
          }
        }
      } else {
        updates.key_features = JSON.stringify(updates.key_features);
      }
    }

    // Handle colors field similar to key_features
    if (Object.prototype.hasOwnProperty.call(updates, 'colors')) {
      if (updates.colors == null) {
        updates.colors = null;
      } else if (Array.isArray(updates.colors)) {
        updates.colors = JSON.stringify(updates.colors);
      } else if (typeof updates.colors === 'string') {
        const trimmed = updates.colors.trim();
        if (!trimmed) {
          updates.colors = null;
        } else {
          try {
            updates.colors = JSON.stringify(JSON.parse(trimmed));
          } catch (err) {
            const parts = trimmed.split(',').map((c) => c.trim()).filter(Boolean);
            updates.colors = JSON.stringify(parts);
          }
        }
      } else {
        updates.colors = JSON.stringify(updates.colors);
      }
    }

    try {
      const numAffected = await db('products').where({ id }).update(updates);
      if (numAffected === 0) {
        return null; // Or throw an error if preferred
      }
      return await Product.findById(id);
    } catch (dbError) {
      console.error('Database error during product update:', dbError);
      throw dbError; // Re-throw to be caught by the controller
    }
  },

  // Delete product
  delete: async (id) => {
    const affected = await db('products').where({ id }).del();
    return affected > 0;
  },

  // Update stock
  updateStock: async (id, quantity, set = false) => {
    // Note: total_stock column doesn't exist in the database
    // This method is kept for potential future use
    const product = await Product.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    // Only update in_stock status
    await db('products').where({ id }).update({ 
      in_stock: quantity > 0 
    });
    return await Product.findById(id);
  },

  // Decrease stock
  decreaseStock: async (id, quantity) => {
    // This method is kept for potential future use
    const product = await Product.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    // Just update in_stock status
    await db('products').where({ id }).update({ 
      in_stock: false 
    });
    return await Product.findById(id);
  },
};

export default Product;
