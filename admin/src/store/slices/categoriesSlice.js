import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCategories = createAsyncThunk(
    'categories/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            console.log('Calling API endpoint: /categories');
            console.log('Base URL:', import.meta.env.VITE_API_URL);
            const response = await api.get('/categories');

            console.log('Fetched categories response:', response.data);
            console.log('Categories data array:', response.data.data);
            console.log('Categories count:', response.data.data?.length || response.data.length);
            return response.data;
        } catch (error) {
            console.error('Error fetching categories:', error);
            console.error('Error response:', error.response);
            console.error('Error message:', error.message);
            console.error('Error status:', error.response?.status);
            console.error('Error data:', error.response?.data);
            console.error('Is network error:', error.message === 'Network Error');
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch categories');
        }
    }
);

export const createCategory = createAsyncThunk(
    'categories/create',
    async (categoryData, { rejectWithValue }) => {
        try {
            const response = await api.post('/categories', categoryData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create category');
        }
    }
);

export const updateCategory = createAsyncThunk(
    'categories/update',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/categories/${id}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update category');
        }
    }
);

export const deleteCategory = createAsyncThunk(
    'categories/delete',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/categories/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete category');
        }
    }
);

const categoriesSlice = createSlice({
    name: 'categories',
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCategories.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.loading = false;
                console.log("Categories payload:", action.payload);
                // Handle both {data: [...], meta: {...}} and [...] response formats
                if (Array.isArray(action.payload)) {
                    state.items = action.payload;
                } else if (action.payload.data && Array.isArray(action.payload.data)) {
                    state.items = action.payload.data;
                } else {
                    state.items = [];
                    console.error('Unexpected categories response format:', action.payload);
                }
                console.log("Categories items set to:", state.items.length, "items");
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.items = []; // Ensure items is always an array
            })
            // Create
            .addCase(createCategory.fulfilled, (state, action) => {
                if (action.payload) {
                    state.items.push(action.payload);
                }
            })
            // Update
            .addCase(updateCategory.fulfilled, (state, action) => {
                if (action.payload) {
                    const index = state.items.findIndex((c) => c.id === action.payload.id);
                    if (index !== -1) {
                        state.items[index] = action.payload;
                    }
                }
            })
            // Delete
            .addCase(deleteCategory.fulfilled, (state, action) => {
                state.items = state.items.filter((c) => c.id !== action.payload);
            });
    },
});

export default categoriesSlice.reducer;
