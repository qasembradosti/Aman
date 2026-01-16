import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Fetch dashboard statistics
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    stats: {
      totalUsers: 0,
      totalProducts: 0,
      totalCategories: 0,
      totalBrands: 0,
      totalBanners: 0,
      totalNotifications: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      recentOrders: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalReviews: 0,
      averageRating: 0
    },
    ordersByStatus: {},
    topProducts: [],
    monthlySales: [],
    dailySales: [],
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        // Safely handle the payload with defaults
        state.stats = action.payload?.stats || state.stats;
        state.ordersByStatus = action.payload?.ordersByStatus || {};
        state.topProducts = action.payload?.topProducts || [];
        state.monthlySales = action.payload?.monthlySales || [];
        state.dailySales = action.payload?.dailySales || [];
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
