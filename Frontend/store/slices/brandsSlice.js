import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/apiService';

// Async thunks
export const fetchBrands = createAsyncThunk(
  'brands/fetchBrands',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/api/brands?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching brands:', error);
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch brands');
    }
  }
);

export const fetchBrandById = createAsyncThunk(
  'brands/fetchBrandById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/brands/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch brand');
    }
  }
);

const brandsSlice = createSlice({
  name: 'brands',
  initialState: {
    items: [],
    currentBrand: null,
    meta: {
      total: 0,
      limit: 50,
      offset: 0,
    },
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBrand: (state) => {
      state.currentBrand = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch brands
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.data || action.payload || [];
        state.meta = action.payload?.meta || state.meta;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch brand by ID
      .addCase(fetchBrandById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrandById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBrand = action.payload;
      })
      .addCase(fetchBrandById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentBrand } = brandsSlice.actions;
export default brandsSlice.reducer;
