import db from '../config/knex.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get total users count
    const usersCount = await db('users')
      .count('* as total')
      .first();

    // Get total products count
    const productsCount = await db('products')
      .count('* as total')
      .first();

    // Get total categories count
    const categoriesCount = await db('categories')
      .count('* as total')
      .first();

    // Get total brands count
    const brandsCount = await db('brands')
      .count('* as total')
      .first();

    // Get total banners count
    const bannersCount = await db('banners')
      .count('* as total')
      .first();

    // Get total notifications count
    const notificationsCount = await db('notifications')
      .count('* as total')
      .first();

    // Check if orders table exists
    let ordersStats = { total_orders: 0, total_revenue: 0, average_order_value: 0 };
    let pendingOrdersCount = { total: 0 };
    let ordersByStatus = [];
    let recentOrdersCount = { total: 0 };
    let topProducts = [];
    let monthlySales = [];
    let dailySales = [];
    
    try {
      // Get pending orders count
      pendingOrdersCount = await db('orders')
        .where('status', 'pending')
        .count('* as total')
        .first();

      // Get total orders count and revenue
      ordersStats = await db('orders')
        .select(
          db.raw('COUNT(*) as total_orders'),
          db.raw('COALESCE(SUM(total_amount), 0) as total_revenue'),
          db.raw('COALESCE(AVG(total_amount), 0) as average_order_value')
        )
        .first();

      // Get orders by status
      ordersByStatus = await db('orders')
        .select('status')
        .count('* as count')
        .groupBy('status');

      // Get recent orders (last 7 days)
      recentOrdersCount = await db('orders')
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 7 DAY)'))
        .count('* as total')
        .first();

      // Get top selling products (based on order_items)
      topProducts = await db('order_items')
        .select('products.name', 'products.id')
        .sum('order_items.quantity as total_sold')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .groupBy('products.id', 'products.name')
        .orderBy('total_sold', 'desc')
        .limit(5);

      // Get monthly sales data for the current year
      monthlySales = await db('orders')
        .select(
          db.raw('MONTH(created_at) as month'),
          db.raw('YEAR(created_at) as year'),
          db.raw('COUNT(*) as order_count'),
          db.raw('COALESCE(SUM(total_amount), 0) as revenue')
        )
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 12 MONTH)'))
        .groupBy(db.raw('YEAR(created_at), MONTH(created_at)'))
        .orderBy('year', 'asc')
        .orderBy('month', 'asc');

      // Get daily sales for the last 30 days
      dailySales = await db('orders')
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as order_count'),
          db.raw('COALESCE(SUM(total_amount), 0) as revenue')
        )
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 30 DAY)'))
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date', 'asc');
    } catch (ordersError) {
      console.warn('Orders table not available:', ordersError.message);
    }

    // Get out of stock products
    const outOfStockCount = await db('products')
      .where('in_stock', false)
      .count('* as total')
      .first();

    // Get low stock products (set to 0 since total_stock column doesn't exist)
    const lowStockCount = { total: 0 };

    // Check if product_reviews table exists
    let reviewsCount = { total: 0 };
    let avgRating = { average: 0 };
    
    try {
      // Get total reviews
      reviewsCount = await db('product_reviews')
        .count('* as total')
        .first();

      // Get average rating
      avgRating = await db('product_reviews')
        .avg('rating as average')
        .first();
    } catch (reviewsError) {
      console.warn('Product reviews table not available:', reviewsError.message);
    }

    res.json({
      stats: {
        totalUsers: parseInt(usersCount.total) || 0,
        totalProducts: parseInt(productsCount.total) || 0,
        totalCategories: parseInt(categoriesCount.total) || 0,
        totalBrands: parseInt(brandsCount.total) || 0,
        totalBanners: parseInt(bannersCount.total) || 0,
        totalNotifications: parseInt(notificationsCount.total) || 0,
        totalOrders: parseInt(ordersStats.total_orders) || 0,
        pendingOrders: parseInt(pendingOrdersCount.total) || 0,
        totalRevenue: parseFloat(ordersStats.total_revenue) || 0,
        averageOrderValue: parseFloat(ordersStats.average_order_value) || 0,
        recentOrders: parseInt(recentOrdersCount.total) || 0,
        lowStockProducts: parseInt(lowStockCount.total) || 0,
        outOfStockProducts: parseInt(outOfStockCount.total) || 0,
        totalReviews: parseInt(reviewsCount.total) || 0,
        averageRating: parseFloat(avgRating.average) || 0
      },
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      topProducts: topProducts.map(p => ({
        id: p.id,
        name: p.name,
        totalSold: parseInt(p.total_sold) || 0
      })),
      monthlySales: monthlySales.map(m => ({
        month: parseInt(m.month),
        year: parseInt(m.year),
        orderCount: parseInt(m.order_count),
        revenue: parseFloat(m.revenue)
      })),
      dailySales: dailySales.map(d => ({
        date: d.date,
        orderCount: parseInt(d.order_count),
        revenue: parseFloat(d.revenue)
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch dashboard statistics', 
      error: error.message 
    });
  }
};
