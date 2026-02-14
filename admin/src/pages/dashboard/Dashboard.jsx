import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboardStats } from '../../store/slices/dashboardSlice';
import { 
  Users, 
  Package, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Star,
  BarChart3,
  Tag,
  Image,
  Bell,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  const dispatch = useDispatch();
  const { stats, ordersByStatus, topProducts, monthlySales, loading } = useSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0) + ' IQD';
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Package className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Avg Order Value</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.averageOrderValue)}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <ShoppingBag className="h-4 w-4" />
            <span>Recent Orders (7d)</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">{stats.recentOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Clock className="h-4 w-4" />
            <span>Pending Orders</span>
          </div>
          <p className="text-xl font-semibold text-orange-600">{stats.pendingOrders}</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
            <Star className="h-4 w-4" />
            <span>Avg Rating</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">{stats.averageRating.toFixed(1)} / 5.0</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Sales Chart */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Monthly Sales</h3>
          </div>
          <div className="space-y-2">
            {monthlySales.length > 0 ? (
              <div className="h-64 flex items-end gap-2 justify-between">
                {monthlySales.map((data, index) => {
                  const maxRevenue = Math.max(...monthlySales.map(m => m.revenue));
                  const heightPercentage = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative group"
                        style={{ height: `${heightPercentage}%`, minHeight: data.revenue > 0 ? '4px' : '0' }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {formatCurrency(data.revenue)}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">{monthNames[data.month - 1]}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No sales data available</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{product.totalSold} sold</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No product sales yet</p>
            )}
          </div>
        </div>

        {/* Orders by Status */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {Object.keys(ordersByStatus).length > 0 ? (
              <>
                {ordersByStatus.pending > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Pending</span>
                    <span className="text-sm font-semibold text-yellow-700">{ordersByStatus.pending}</span>
                  </div>
                )}
                {ordersByStatus.processing > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Processing</span>
                    <span className="text-sm font-semibold text-blue-700">{ordersByStatus.processing}</span>
                  </div>
                )}
                {ordersByStatus.shipped > 0 && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Shipped</span>
                    <span className="text-sm font-semibold text-purple-700">{ordersByStatus.shipped}</span>
                  </div>
                )}
                {ordersByStatus.delivered > 0 && (
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Delivered</span>
                    <span className="text-sm font-semibold text-green-700">{ordersByStatus.delivered}</span>
                  </div>
                )}
                {ordersByStatus.cancelled > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">Cancelled</span>
                    <span className="text-sm font-semibold text-red-700">{ordersByStatus.cancelled}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">No orders yet</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Categories</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{stats.totalCategories}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Brands</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{stats.totalBrands}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Banners</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{stats.totalBanners}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Notifications</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{stats.totalNotifications}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Reviews</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{stats.totalReviews}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
