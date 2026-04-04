import db from '../config/knex.js';

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

let productColumnsPromise = null;

const getProductColumns = async () => {
  if (!productColumnsPromise) {
    productColumnsPromise = db('products')
      .columnInfo()
      .then((columns) => new Set(Object.keys(columns)))
      .catch((error) => {
        productColumnsPromise = null;
        throw error;
      });
  }

  return productColumnsPromise;
};

const filterSupportedFields = async (payload) => {
  const columns = await getProductColumns();

  return Object.fromEntries(
    Object.entries(payload).filter(([field, value]) => value !== undefined && columns.has(field)),
  );
};

const normalizeJsonListField = (payload, field) => {
  if (!hasOwn(payload, field)) {
    return;
  }

  const value = payload[field];

  if (value == null || value === '') {
    payload[field] = null;
    return;
  }

  if (Array.isArray(value)) {
    payload[field] = JSON.stringify(value);
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) {
      payload[field] = null;
      return;
    }

    try {
      payload[field] = JSON.stringify(JSON.parse(trimmed));
    } catch (err) {
      const parts = trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      payload[field] = JSON.stringify(parts);
    }

    return;
  }

  payload[field] = JSON.stringify(value);
};

const normalizeTextListField = (payload, field) => {
  if (!hasOwn(payload, field)) {
    return;
  }

  const value = payload[field];

  if (value == null) {
    payload[field] = null;
    return;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');

    payload[field] = normalized || null;
    return;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    payload[field] = trimmed || null;
    return;
  }

  payload[field] = String(value);
};

const normalizeListFields = (payload) => {
  normalizeJsonListField(payload, 'key_features');
  normalizeJsonListField(payload, 'colors');
  normalizeTextListField(payload, 'key_features_en');
  normalizeTextListField(payload, 'key_features_ar');
  normalizeTextListField(payload, 'key_features_ku');
};

const Product = {
  // Find all products with filters
  findAll: async (filters = {}) => {
    const {
      q,
      category_id,
      brand_id,
      store_id,
      in_stock,
      is_trend,
      is_important,
      has_discount,
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

    // Store filter
    if (store_id) {
      query.where('products.store_id', store_id);
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

    // Discount filter
    if (has_discount !== undefined) {
      const normalized = String(has_discount).toLowerCase();
      const wantsDiscounted =
        normalized === '1' ||
        normalized === 'true' ||
        normalized === 'yes';
      const wantsNonDiscounted =
        normalized === '0' ||
        normalized === 'false' ||
        normalized === 'no';

      if (wantsDiscounted) {
        query.where('products.discount', '>', 0);
      } else if (wantsNonDiscounted) {
        query.where(function () {
          this.whereNull('products.discount').orWhere('products.discount', '<=', 0);
        });
      }
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
    const { name_en, base_price } = productData;

    if (!name_en || base_price === undefined || base_price === null || base_price === '') {
      throw new Error('name and base_price are required');
    }

    const allowedFields = [
      'name_en',
      'name_ku',
      'name_ar',
      'category_id',
      'brand_id',
      'store_id',
      'base_price',
      'sell_price',
      'commission_price',
      'in_stock',
      'description_en',
      'description_ku',
      'description_ar',
      'key_features',
      'key_features_en',
      'key_features_ku',
      'key_features_ar',
      'discount',
      'discount_type',
      'discount_expires',
      'product_code',
      'size',
      'volume',
      'colors',
      'is_trend',
      'is_important',
    ];

    const insertData = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(productData, field) && productData[field] !== undefined) {
        insertData[field] = productData[field];
      }
    }

    normalizeListFields(insertData);

    if (!insertData.discount_type) {
      insertData.discount_type = 'percentage';
    }

    const supportedInsertData = await filterSupportedFields(insertData);
    const inserted = await db('products').insert(supportedInsertData);
    const insertedRaw = Array.isArray(inserted) ? inserted[0] : inserted;
    const id = typeof insertedRaw === 'object' && insertedRaw !== null
      ? (insertedRaw.id ?? insertedRaw.insertId)
      : insertedRaw;

    if (!id) {
      throw new Error('Failed to create product record');
    }

    return await Product.findById(id);
  },

  // Update product
  update: async (id, productData) => {
    const updates = Object.fromEntries(
      Object.entries(productData).filter(([, value]) => value !== undefined),
    );

    // Prevent updating immutable fields
    delete updates.id;
    delete updates.created_at;
    delete updates.updated_at;

    normalizeListFields(updates);

    const supportedUpdates = await filterSupportedFields(updates);

    if (Object.keys(supportedUpdates).length === 0) {
      return await Product.findById(id);
    }

    try {
      const numAffected = await db('products').where({ id }).update(supportedUpdates);
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
