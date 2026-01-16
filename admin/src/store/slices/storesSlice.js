import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchStores = createAsyncThunk(
    'stores/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/stores');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch stores');
        }
    }
);

export const createStore = createAsyncThunk(
    'stores/create',
    async (storeData, { rejectWithValue }) => {
        try {
            const response = await api.post('/stores', storeData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create store');
        }
    }
);

export const updateStore = createAsyncThunk(
    'stores/update',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/stores/${id}`, data);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update store');
        }
    }
);

export const deleteStore = createAsyncThunk(
    'stores/delete',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/stores/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete store');
        }
    }
);

const storesSlice = createSlice({
    name: 'stores',
    initialState: {
        items: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchStores.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchStores.fulfilled, (state, action) => {
                state.loading = false;
                console.log("Stores payload:", action.payload);
                // Handle both {data: [...], meta: {...}} and [...] response formats
                if (Array.isArray(action.payload)) {
                    state.items = action.payload;
                } else if (action.payload.data && Array.isArray(action.payload.data)) {
                    state.items = action.payload.data;
                } else {
                    state.items = [];
                    console.error('Unexpected stores response format:', action.payload);
                }
                console.log("Stores items set to:", state.items.length, "items");
            })
            .addCase(fetchStores.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.items = []; // Ensure items is always an array
            })
            // Create
            .addCase(createStore.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createStore.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    state.items.push(action.payload);
                }
            })
            .addCase(createStore.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Update
            .addCase(updateStore.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateStore.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    const index = state.items.findIndex(item => item.id === action.payload.id);
                    if (index !== -1) {
                        state.items[index] = action.payload;
                    }
                }
            })
            .addCase(updateStore.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Delete
            .addCase(deleteStore.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteStore.fulfilled, (state, action) => {
                state.loading = false;
                state.items = state.items.filter(item => item.id !== action.payload);
            })
            .addCase(deleteStore.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export default storesSlice.reducer;
