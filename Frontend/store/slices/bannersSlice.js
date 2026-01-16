import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/apiService';

// Async thunks
export const fetchActiveBanners = createAsyncThunk(
  'banners/fetchActiveBanners',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/banners/active');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch banners');
    }
  }
);

export const fetchAllBanners = createAsyncThunk(
  'banners/fetchAllBanners',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/banners');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch banners');
    }
  }
);

export const createBanner = createAsyncThunk(
  'banners/createBanner',
  async (bannerData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/banners', bannerData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create banner');
    }
  }
);

export const updateBanner = createAsyncThunk(
  'banners/updateBanner',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/banners/${id}`, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update banner');
    }
  }
);

export const deleteBanner = createAsyncThunk(
  'banners/deleteBanner',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/banners/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete banner');
    }
  }
);

export const toggleBannerActive = createAsyncThunk(
  'banners/toggleBannerActive',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/api/banners/${id}/toggle`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle banner status');
    }
  }
);

export const updateBannerOrder = createAsyncThunk(
  'banners/updateBannerOrder',
  async (orders, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/banners/order/update', { orders });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update banner order');
    }
  }
);

const bannersSlice = createSlice({
  name: 'banners',
  initialState: {
    banners: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearBannersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch active banners
      .addCase(fetchActiveBanners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = action.payload.data || [];
      })
      .addCase(fetchActiveBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch all banners (admin)
      .addCase(fetchAllBanners.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.banners = action.payload.data || [];
      })
      .addCase(fetchAllBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create banner
      .addCase(createBanner.fulfilled, (state, action) => {
        if (action.payload.data) {
          state.banners.push(action.payload.data);
        }
      })
      // Update banner
      .addCase(updateBanner.fulfilled, (state, action) => {
        const index = state.banners.findIndex(b => b.id === action.payload.data?.id);
        if (index !== -1 && action.payload.data) {
          state.banners[index] = action.payload.data;
        }
      })
      // Delete banner
      .addCase(deleteBanner.fulfilled, (state, action) => {
        state.banners = state.banners.filter(b => b.id !== action.payload);
      })
      // Toggle banner active
      .addCase(toggleBannerActive.fulfilled, (state, action) => {
        const index = state.banners.findIndex(b => b.id === action.payload.data?.id);
        if (index !== -1 && action.payload.data) {
          state.banners[index] = action.payload.data;
        }
      });
  },
});

export const { clearBannersError } = bannersSlice.actions;
export default bannersSlice.reducer;
