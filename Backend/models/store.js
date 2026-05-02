import db from '../config/knex.js';

const Store = {
  // Find all stores with filters
  findAll: async (filters = {}) => {
    const { q, is_active, limit = 50, offset = 0 } = filters;
    const l = Math.min(parseInt(limit, 10) || 50, 200);
    const o = parseInt(offset, 10) || 0;

    const query = db('stores');
    
    // Search filter
    if (q) {
      query.where(function () {
        this.whereILike('name', `%${q}%`)
          .orWhereILike('description', `%${q}%`)
          .orWhereILike('location', `%${q}%`);
      });
    }
    
    // Active status filter
    if (is_active !== undefined) {
      query.where('is_active', is_active);
    }

    // Get total count
    const totalRow = await query.clone().clearSelect().clearOrder().count({ total: '*' }).first();
    const total = Number(totalRow?.total || 0);

    // Get stores with sorting and pagination
    const stores = await query
      .clone()
      .orderBy('created_at', 'desc')
      .limit(l)
      .offset(o);
    
    return { 
      data: stores, 
      meta: { total, limit: l, offset: o } 
    };
  },

  // Find store by id
  findById: async (id) => {
    return db('stores').where({ id }).first();
  },

  // Create a new store
  create: async (storeData) => {
    const { 
      name, 
      name_en, 
      name_ar, 
      name_ku, 
      description, 
      location,
      phone,
      email,
      image_url,
      is_active = true 
    } = storeData;
    
    if (!name) {
      throw new Error('name is required');
    }

    const [insertId] = await db('stores').insert({
      name,
      name_en: name_en || null,
      name_ar: name_ar || null,
      name_ku: name_ku || null,
      description: description || null,
      location: location || null,
      phone: phone || null,
      email: email || null,
      image_url: image_url || null,
      is_active,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });
    
    return Store.findById(insertId);
  },

  // Update a store
  update: async (id, updateData) => {
    const { 
      name, 
      name_en, 
      name_ar, 
      name_ku, 
      description, 
      location,
      phone,
      email,
      image_url,
      is_active 
    } = updateData;

    const fields = {};
    
    if (name !== undefined) fields.name = name;
    if (name_en !== undefined) fields.name_en = name_en;
    if (name_ar !== undefined) fields.name_ar = name_ar;
    if (name_ku !== undefined) fields.name_ku = name_ku;
    if (description !== undefined) fields.description = description;
    if (location !== undefined) fields.location = location;
    if (phone !== undefined) fields.phone = phone;
    if (email !== undefined) fields.email = email;
    if (image_url !== undefined) fields.image_url = image_url;
    if (is_active !== undefined) fields.is_active = is_active;
    
    fields.updated_at = db.fn.now();

    const count = await db('stores').where({ id }).update(fields);
    
    if (count === 0) return null;
    
    return Store.findById(id);
  },

  // Delete a store
  delete: async (id) => {
    // First, set store_id to null for all products associated with this store
    await db('products').where({ store_id: id }).update({ store_id: null });
    
    // Then delete the store
    const count = await db('stores').where({ id }).del();
    return count > 0;
  },

  // Get orders that include products from a specific store
  getOrders: async (storeId, filters = {}) => {
    const { start_date, end_date, status } = filters;

    const query = db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .join('products', 'order_items.product_id', 'products.id')
      .leftJoin('users', 'orders.user_id', 'users.id')
      .where('products.store_id', storeId)
      .select(
        'orders.id',
        'orders.status',
        'orders.created_at',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.phone as user_phone',
        'users.email as user_email',
        db.raw('SUM(order_items.quantity) as store_items_count'),
        db.raw('SUM(order_items.quantity * COALESCE(order_items.base_price, order_items.price)) as store_total_amount')
      )
      .groupBy(
        'orders.id',
        'orders.status',
        'orders.created_at',
        'users.first_name',
        'users.last_name',
        'users.phone',
        'users.email'
      )
      .orderBy('orders.created_at', 'desc');

    if (start_date) {
      query.whereRaw('DATE(orders.created_at) >= ?', [start_date]);
    }

    if (end_date) {
      query.whereRaw('DATE(orders.created_at) <= ?', [end_date]);
    }

    if (status && status !== 'all') {
      query.where('orders.status', status);
    }

    const orders = await query;

    const summary = orders.reduce(
      (acc, order) => {
        acc.total_orders += 1;
        acc.total_amount += Number(order.store_total_amount || 0);
        return acc;
      },
      { total_orders: 0, total_amount: 0 }
    );

    return {
      orders,
      summary,
    };
  },

  // Get stores count
  count: async () => {
    const result = await db('stores').count({ total: '*' }).first();
    return Number(result?.total || 0);
  },
};

export default Store;
