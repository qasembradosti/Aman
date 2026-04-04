import db from '../config/knex.js';
import {
  canAccessAdminPanel,
  isStoreAdmin,
} from '../middleware/adminPanelMiddleware.js';

const toInt = (value) => parseInt(value, 10) || 0;
const toFloat = (value) => parseFloat(value) || 0;

const buildStoreOrderItemsQuery = (storeId) =>
  db('order_items')
    .join('products', 'order_items.product_id', 'products.id')
    .join('orders', 'order_items.order_id', 'orders.id')
    .where('products.store_id', storeId);

const getStoreDashboardStats = async (storeId) => {
  const productsCount = await db('products')
    .where('store_id', storeId)
    .count('* as total')
    .first();

  const categoriesCount = await db('products')
    .where('store_id', storeId)
    .whereNotNull('category_id')
    .countDistinct({ total: 'category_id' })
    .first();

  const brandsCount = await db('products')
    .where('store_id', storeId)
    .whereNotNull('brand_id')
    .countDistinct({ total: 'brand_id' })
    .first();

  const ordersStats = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .select(
      db.raw('COUNT(DISTINCT orders.id) as total_orders'),
      db.raw('COALESCE(SUM(order_items.quantity * order_items.price), 0) as total_revenue'),
    )
    .first();

  const pendingOrdersCount = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .where('orders.status', 'pending')
    .countDistinct({ total: 'orders.id' })
    .first();

  const ordersByStatusRows = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .select('orders.status')
    .countDistinct({ count: 'orders.id' })
    .groupBy('orders.status');

  const recentOrdersCount = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .where('orders.created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
    .countDistinct({ total: 'orders.id' })
    .first();

  const topProducts = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .select('products.id', 'products.name_en as name')
    .sum('order_items.quantity as total_sold')
    .groupBy('products.id', 'products.name_en')
    .orderBy('total_sold', 'desc')
    .limit(5);

  const monthlySales = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .select(
      db.raw('MONTH(orders.created_at) as month'),
      db.raw('YEAR(orders.created_at) as year'),
      db.raw('COUNT(DISTINCT orders.id) as order_count'),
      db.raw('COALESCE(SUM(order_items.quantity * order_items.price), 0) as revenue'),
    )
    .where('orders.created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 12 MONTH)'))
    .groupBy(db.raw('YEAR(orders.created_at), MONTH(orders.created_at)'))
    .orderBy('year', 'asc')
    .orderBy('month', 'asc');

  const dailySales = await buildStoreOrderItemsQuery(storeId)
    .clone()
    .select(
      db.raw('DATE(orders.created_at) as date'),
      db.raw('COUNT(DISTINCT orders.id) as order_count'),
      db.raw('COALESCE(SUM(order_items.quantity * order_items.price), 0) as revenue'),
    )
    .where('orders.created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
    .groupBy(db.raw('DATE(orders.created_at)'))
    .orderBy('date', 'asc');

  const outOfStockCount = await db('products')
    .where('store_id', storeId)
    .where('in_stock', false)
    .count('* as total')
    .first();

  let reviewsCount = { total: 0 };
  let avgRating = { average: 0 };

  try {
    reviewsCount = await db('product_reviews')
      .join('products', 'product_reviews.product_id', 'products.id')
      .where('products.store_id', storeId)
      .count('* as total')
      .first();

    avgRating = await db('product_reviews')
      .join('products', 'product_reviews.product_id', 'products.id')
      .where('products.store_id', storeId)
      .avg('product_reviews.rating as average')
      .first();
  } catch (reviewsError) {
    console.warn('Product reviews table not available:', reviewsError.message);
  }

  const totalOrders = toInt(ordersStats?.total_orders);
  const totalRevenue = toFloat(ordersStats?.total_revenue);

  return {
    stats: {
      totalUsers: 0,
      totalProducts: toInt(productsCount?.total),
      totalCategories: toInt(categoriesCount?.total),
      totalBrands: toInt(brandsCount?.total),
      totalBanners: 0,
      totalNotifications: 0,
      totalOrders,
      pendingOrders: toInt(pendingOrdersCount?.total),
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      recentOrders: toInt(recentOrdersCount?.total),
      lowStockProducts: 0,
      outOfStockProducts: toInt(outOfStockCount?.total),
      totalReviews: toInt(reviewsCount?.total),
      averageRating: toFloat(avgRating?.average),
    },
    ordersByStatus: ordersByStatusRows.reduce((acc, item) => {
      acc[item.status] = toInt(item.count);
      return acc;
    }, {}),
    topProducts: topProducts.map((product) => ({
      id: product.id,
      name: product.name,
      totalSold: toInt(product.total_sold),
    })),
    monthlySales: monthlySales.map((item) => ({
      month: toInt(item.month),
      year: toInt(item.year),
      orderCount: toInt(item.order_count),
      revenue: toFloat(item.revenue),
    })),
    dailySales: dailySales.map((item) => ({
      date: item.date,
      orderCount: toInt(item.order_count),
      revenue: toFloat(item.revenue),
    })),
  };
};

const getGlobalDashboardStats = async () => {
  const usersCount = await db('users').count('* as total').first();
  const productsCount = await db('products').count('* as total').first();
  const categoriesCount = await db('categories').count('* as total').first();
  const brandsCount = await db('brands').count('* as total').first();
  const bannersCount = await db('banners').count('* as total').first();
  const notificationsCount = await db('notifications').count('* as total').first();

  let ordersStats = { total_orders: 0, total_revenue: 0, average_order_value: 0 };
  let pendingOrdersCount = { total: 0 };
  let ordersByStatus = [];
  let recentOrdersCount = { total: 0 };
  let topProducts = [];
  let monthlySales = [];
  let dailySales = [];

  try {
    pendingOrdersCount = await db('orders')
      .where('status', 'pending')
      .count('* as total')
      .first();

    ordersStats = await db('orders')
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
        db.raw('COALESCE(AVG(total_amount), 0) as average_order_value'),
      )
      .first();

    ordersByStatus = await db('orders')
      .select('status')
      .count('* as count')
      .groupBy('status');

    recentOrdersCount = await db('orders')
      .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
      .count('* as total')
      .first();

    topProducts = await db('order_items')
      .select('products.id', 'products.name_en as name')
      .sum('order_items.quantity as total_sold')
      .leftJoin('products', 'order_items.product_id', 'products.id')
      .groupBy('products.id', 'products.name_en')
      .orderBy('total_sold', 'desc')
      .limit(5);

    monthlySales = await db('orders')
      .select(
        db.raw('MONTH(created_at) as month'),
        db.raw('YEAR(created_at) as year'),
        db.raw('COUNT(*) as order_count'),
        db.raw('COALESCE(SUM(total_amount), 0) as revenue'),
      )
      .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 12 MONTH)'))
      .groupBy(db.raw('YEAR(created_at), MONTH(created_at)'))
      .orderBy('year', 'asc')
      .orderBy('month', 'asc');

    dailySales = await db('orders')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as order_count'),
        db.raw('COALESCE(SUM(total_amount), 0) as revenue'),
      )
      .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');
  } catch (ordersError) {
    console.warn('Orders table not available:', ordersError.message);
  }

  const outOfStockCount = await db('products')
    .where('in_stock', false)
    .count('* as total')
    .first();

  let reviewsCount = { total: 0 };
  let avgRating = { average: 0 };

  try {
    reviewsCount = await db('product_reviews').count('* as total').first();
    avgRating = await db('product_reviews').avg('rating as average').first();
  } catch (reviewsError) {
    console.warn('Product reviews table not available:', reviewsError.message);
  }

  return {
    stats: {
      totalUsers: toInt(usersCount?.total),
      totalProducts: toInt(productsCount?.total),
      totalCategories: toInt(categoriesCount?.total),
      totalBrands: toInt(brandsCount?.total),
      totalBanners: toInt(bannersCount?.total),
      totalNotifications: toInt(notificationsCount?.total),
      totalOrders: toInt(ordersStats?.total_orders),
      pendingOrders: toInt(pendingOrdersCount?.total),
      totalRevenue: toFloat(ordersStats?.total_revenue),
      averageOrderValue: toFloat(ordersStats?.average_order_value),
      recentOrders: toInt(recentOrdersCount?.total),
      lowStockProducts: 0,
      outOfStockProducts: toInt(outOfStockCount?.total),
      totalReviews: toInt(reviewsCount?.total),
      averageRating: toFloat(avgRating?.average),
    },
    ordersByStatus: ordersByStatus.reduce((acc, item) => {
      acc[item.status] = toInt(item.count);
      return acc;
    }, {}),
    topProducts: topProducts.map((product) => ({
      id: product.id,
      name: product.name,
      totalSold: toInt(product.total_sold),
    })),
    monthlySales: monthlySales.map((item) => ({
      month: toInt(item.month),
      year: toInt(item.year),
      orderCount: toInt(item.order_count),
      revenue: toFloat(item.revenue),
    })),
    dailySales: dailySales.map((item) => ({
      date: item.date,
      orderCount: toInt(item.order_count),
      revenue: toFloat(item.revenue),
    })),
  };
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    if (!canAccessAdminPanel(req.user)) {
      return res.status(403).json({
        message:
          'Access denied. Superadmin or store admin with a store assignment is required.',
      });
    }

    if (isStoreAdmin(req.user)) {
      const data = await getStoreDashboardStats(Number(req.user.store_id));
      return res.json(data);
    }

    const data = await getGlobalDashboardStats();
    res.json(data);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
};
