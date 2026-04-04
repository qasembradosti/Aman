import db from '../config/knex.js';

const applyStoreScopeToOrders = (query, storeId) => {
  if (!storeId) {
    return query;
  }

  const normalizedStoreId = Number(storeId);

  return query.whereExists(function () {
    this.select(db.raw('1'))
      .from('order_items')
      .join('products', 'order_items.product_id', 'products.id')
      .whereRaw('order_items.order_id = orders.id')
      .andWhere('products.store_id', normalizedStoreId);
  });
};

const Order = {
  // Get all orders with pagination and filters
  getAll: async ({
    page = 1,
    limit = 20,
    status,
    search,
    user_id,
    store_id,
  } = {}) => {
    const offset = (page - 1) * limit;
    
    let query = db('orders')
      .select(
        'orders.*',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.phone as user_phone',
        'users.email as user_email',
        store_id
          ? db.raw(
              `(SELECT COUNT(*)
                FROM order_items
                JOIN products ON products.id = order_items.product_id
               WHERE order_items.order_id = orders.id
                 AND products.store_id = ?) as items_count`,
              [Number(store_id)],
            )
          : db.raw(
              '(SELECT COUNT(*) FROM order_items WHERE order_items.order_id = orders.id) as items_count',
            ),
        store_id
          ? db.raw(
              `(SELECT COALESCE(SUM(order_items.quantity * order_items.price), 0)
                FROM order_items
                JOIN products ON products.id = order_items.product_id
               WHERE order_items.order_id = orders.id
                 AND products.store_id = ?) as scoped_total_amount`,
              [Number(store_id)],
            )
          : db.raw(
              '(SELECT COALESCE(SUM(order_items.commission_price * order_items.quantity), 0) FROM order_items WHERE order_items.order_id = orders.id) as commission_total',
            ),
        store_id ? db.raw('0 as commission_total') : db.raw('NULL as scoped_total_amount')
      )
      .leftJoin('users', 'orders.user_id', 'users.id');

    // Filter by user_id if provided
    if (user_id) {
      query = query.where('orders.user_id', user_id);
    }

    query = applyStoreScopeToOrders(query, store_id);

    if (status && status !== 'all') {
      query = query.where('orders.status', status);
    }

    if (search) {
      query = query.where(function() {
        this.where('orders.id', 'like', `%${search}%`)
          .orWhere('users.first_name', 'like', `%${search}%`)
          .orWhere('users.last_name', 'like', `%${search}%`)
          .orWhere('users.phone', 'like', `%${search}%`);
      });
    }

    const totalRow = await query.clone().clearSelect().count({ total: '*' }).first();
    const total = parseInt(totalRow.total);

    const orders = await query
      .orderBy('orders.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const normalizedOrders = store_id
      ? orders.map(({ scoped_total_amount, ...order }) => ({
          ...order,
          total_amount: Number(scoped_total_amount || 0),
          commission_total: 0,
        }))
      : orders;

    return {
      orders: normalizedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  // Get single order with items and user details
  getById: async (id, { store_id } = {}) => {
    let orderQuery = db('orders')
      .select(
        'orders.*',
        'users.first_name as user_first_name',
        'users.last_name as user_last_name',
        'users.phone as user_phone',
        'users.email as user_email'
      )
      .leftJoin('users', 'orders.user_id', 'users.id')
      .where('orders.id', id);

    orderQuery = applyStoreScopeToOrders(orderQuery, store_id);

    const order = await orderQuery.first();

    if (!order) return null;

    // Get order items with product details including commission_price
    const itemsQuery = db('order_items')
      .select(
        'order_items.*',
        'products.name_en',
        'products.name_ku',
        'products.name_ar',
        'products.description_en',
        'products.description_ku',
        'products.description_ar'
      )
      .leftJoin('products', 'order_items.product_id', 'products.id')
      .where('order_items.order_id', id);

    if (store_id) {
      itemsQuery.where('products.store_id', Number(store_id));
    }

    const items = await itemsQuery;

    if (store_id && items.length === 0) {
      return null;
    }

    // Add product_name field with priority: Kurdish > English > Arabic
    items.forEach(item => {
      item.product_name = item.name_ku || item.name_en || item.name_ar || 'N/A';
      item.product_description = item.description_ku || item.description_en || item.description_ar || '';
      if (store_id) {
        item.price = Number(item.price ?? 0);
        item.commission_price = 0;
      }
    });

    // Get product images for each item
    for (const item of items) {
      if (item.product_id) {
        const images = await db('product_images')
          .where('product_id', item.product_id)
          .orderBy('is_main', 'desc');
        item.product_images = images;
        // Set the main image URL for easy access with proper path
        if (images.length > 0) {
          const imagePath = images[0].image_url;
          // Add /images/products/ prefix if not already a full path
          if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('/')) {
            item.image = `/images/products/${imagePath}`;
          } else {
            item.image = imagePath;
          }
        } else {
          item.image = null;
        }
      }
    }

    if (store_id) {
      const scopedTotal = items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      );

      return {
        ...order,
        items,
        subtotal: scopedTotal,
        total_amount: scopedTotal,
        shipping_cost: 0,
        discount: 0,
        commission_total: 0,
      };
    }

    return { ...order, items };
  },

  // Create new order
  create: async (orderData) => {
    const { user_id, items, total_amount, shipping_address, payment_method, notes } = orderData;
    
    const trx = await db.transaction();
    
    try {
      // Create order
      const [orderId] = await trx('orders').insert({
        user_id,
        total_amount,
        shipping_address: JSON.stringify(shipping_address),
        payment_method,
        notes,
        status: 'pending',
        created_at: new Date()
      });

      // Create order items with commission_price from products table to be secure
      const orderItems = [];
      for (const item of items) {
        const product = await trx('products').select('commission_price').where('id', item.product_id).first();
        orderItems.push({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          commission_price: product?.commission_price || 0
        });
      }

      await trx('order_items').insert(orderItems);

      // Update product stock (optional - remove if products table doesn't have stock column)
      // Uncomment below if you have a stock column (quantity_in_stock, total_stock, stock, etc.)
      /*
      for (const item of items) {
        await trx('products')
          .where('id', item.product_id)
          .decrement('quantity_in_stock', item.quantity); // or 'stock' or 'total_stock'
      }
      */

      await trx.commit();
      return orderId;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // Update order status
  updateStatus: async (id, status) => {
    return db('orders')
      .where('id', id)
      .update({ 
        status,
        updated_at: new Date()
      });
  },

  // Delete order
  delete: async (id) => {
    const trx = await db.transaction();
    
    try {
      // Get order items to restore stock
      const items = await trx('order_items').where('order_id', id);
      
      // Restore product stock
      for (const item of items) {
        await trx('products')
          .where('id', item.product_id)
          .increment('total_stock', item.quantity);
      }

      // Delete order (cascade will handle order_items)
      await trx('orders').where('id', id).del();
      
      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },

  // Get order statistics
  getStats: async () => {
    const stats = await db('orders')
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending'),
        db.raw('SUM(CASE WHEN status = "processing" THEN 1 ELSE 0 END) as processing'),
        db.raw('SUM(CASE WHEN status = "shipped" THEN 1 ELSE 0 END) as shipped'),
        db.raw('SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered'),
        db.raw('SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled'),
        db.raw('SUM(total_amount) as total_revenue')
      )
      .first();

    return stats;
  },

  // Calculate total commission for an order
  calculateCommission: async (orderId) => {
    // Join with products to get commission if missing in order_items (backwards compatibility)
    const items = await db('order_items')
      .leftJoin('products', 'order_items.product_id', 'products.id')
      .select(
        'order_items.commission_price as item_commission', 
        'products.commission_price as product_commission',
        'order_items.quantity'
      )
      .where('order_items.order_id', orderId);

    const totalCommission = items.reduce((sum, item) => {
      // Use recorded commission, or fallback to current product commission
      const commission = Number(item.item_commission) > 0 
        ? Number(item.item_commission) 
        : Number(item.product_commission || 0);
        
      return sum + (commission * Number(item.quantity));
    }, 0);

    return totalCommission;
  },

  // Check if commission has been withdrawn for an order
  isCommissionWithdrawn: async (orderId) => {
    const order = await db('orders')
      .select('commission_withdrawn')
      .where('id', orderId)
      .first();
    
    return order?.commission_withdrawn === 1 || order?.commission_withdrawn === true;
  },

  // Mark commission as withdrawn
  markCommissionWithdrawn: async (orderId) => {
    return db('orders')
      .where('id', orderId)
      .update({ 
        commission_withdrawn: true,
        commission_withdrawn_at: new Date()
      });
  }
};

export default Order;
