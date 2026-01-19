import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../../services/apiService';

// Fetch list of orders with optional filters
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      console.log('📦 Fetching orders with params:', params);
      const response = await apiService.get('/api/orders', { params });
      console.log('✅ Orders fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching orders:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Fetch a single order by id
export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/api/orders/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Create a new order
export const createOrderThunk = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Cancel an order
export const cancelOrderThunk = createAsyncThunk(
  'orders/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await apiService.patch(`/api/orders/${orderId}/cancel`);
      return { orderId, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

const initialState = {
  items: [],
  currentOrder: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderError: (state) => {
      state.error = null;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload || {};
        const rawOrders = payload.orders || payload.items || payload || [];
        
        // Transform backend data to match component expectations
        state.items = rawOrders.map(order => ({
          ...order,
          // Map backend field names to component field names
          total: order.total_amount || order.total,
          date: order.created_at || order.date,
          items: order.items_count || order.items || 0,
          products: [], // Products list not included in backend list endpoint
          // Keep original fields too for compatibility
        }));
        
        if (payload.pagination) {
          state.pagination = {
            page: payload.pagination.page || 1,
            limit: payload.pagination.limit || 20,
            total: payload.pagination.total || 0,
            totalPages: payload.pagination.totalPages || 0,
          };
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch orders';
      })
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.currentOrder = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload || null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch order details';
      })
      .addCase(createOrderThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(createOrderThunk.fulfilled, (state, action) => {
        // If the API returns the created order, prepend it
        if (action.payload?.order || action.payload?.id) {
          const newOrder = action.payload.order || action.payload;
          state.items = [newOrder, ...state.items];
        }
      })
      .addCase(createOrderThunk.rejected, (state, action) => {
        state.error = action.payload || 'Failed to create order';
      })
      .addCase(cancelOrderThunk.fulfilled, (state, action) => {
        const { orderId } = action.payload || {};
        if (orderId) {
          state.items = state.items.map((o) =>
            o.id === orderId ? { ...o, status: 'cancelled' } : o
          );
          if (state.currentOrder?.id === orderId) {
            state.currentOrder = { ...state.currentOrder, status: 'cancelled' };
          }
        }
      })
      .addCase(cancelOrderThunk.rejected, (state, action) => {
        state.error = action.payload || 'Failed to cancel order';
      });
  },
});

export const { clearOrderError, clearCurrentOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
