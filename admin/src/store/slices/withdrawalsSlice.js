import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Fetch all withdrawal requests
export const fetchWithdrawalRequests = createAsyncThunk(
  'withdrawals/fetchWithdrawalRequests',
  async ({ page = 1, status = 'all' } = {}, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/withdrawals?page=${page}&status=${status}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch withdrawal requests');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch single withdrawal request
export const fetchWithdrawalRequest = createAsyncThunk(
  'withdrawals/fetchWithdrawalRequest',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/withdrawals/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch withdrawal request');
      return await response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Approve withdrawal request
export const approveWithdrawal = createAsyncThunk(
  'withdrawals/approveWithdrawal',
  async ({ id, admin_note }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/withdrawals/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ admin_note }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to approve withdrawal');
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Reject withdrawal request
export const rejectWithdrawal = createAsyncThunk(
  'withdrawals/rejectWithdrawal',
  async ({ id, admin_note }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/withdrawals/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ admin_note }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return rejectWithValue(data.message || 'Failed to reject withdrawal');
      }
      
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Delete withdrawal request
export const deleteWithdrawal = createAsyncThunk(
  'withdrawals/deleteWithdrawal',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/withdrawals/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete withdrawal request');
      return id;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const withdrawalsSlice = createSlice({
  name: 'withdrawals',
  initialState: {
    items: [],
    currentRequest: null,
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch withdrawal requests
      .addCase(fetchWithdrawalRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWithdrawalRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.requests || [];
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchWithdrawalRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch single request
      .addCase(fetchWithdrawalRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWithdrawalRequest.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRequest = action.payload;
      })
      .addCase(fetchWithdrawalRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Approve withdrawal
      .addCase(approveWithdrawal.pending, (state) => {
        state.error = null;
      })
      .addCase(approveWithdrawal.fulfilled, (state, action) => {
        state.loading = false;
        const updatedRequest = action.payload.request;
        const index = state.items.findIndex((item) => item.id === updatedRequest.id);
        if (index !== -1) {
          state.items[index] = updatedRequest;
        }
        if (state.currentRequest?.id === updatedRequest.id) {
          state.currentRequest = updatedRequest;
        }
      })
      .addCase(approveWithdrawal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Reject withdrawal
      .addCase(rejectWithdrawal.pending, (state) => {
        state.error = null;
      })
      .addCase(rejectWithdrawal.fulfilled, (state, action) => {
        state.loading = false;
        const updatedRequest = action.payload.request;
        const index = state.items.findIndex((item) => item.id === updatedRequest.id);
        if (index !== -1) {
          state.items[index] = updatedRequest;
        }
        if (state.currentRequest?.id === updatedRequest.id) {
          state.currentRequest = updatedRequest;
        }
      })
      .addCase(rejectWithdrawal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete withdrawal
      .addCase(deleteWithdrawal.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteWithdrawal.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item.id !== action.payload);
      })
      .addCase(deleteWithdrawal.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentRequest, clearError } = withdrawalsSlice.actions;
export default withdrawalsSlice.reducer;
