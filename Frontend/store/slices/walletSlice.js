import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/apiService';
import { logout, loadTokenFromStorage } from './authSlice';

// Async thunks - wallet fetch, withdraw and history
export const fetchWallet = createAsyncThunk(
  'wallet/fetchWallet',
  async ({ user_id }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/wallet`, { params: { user_id } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallet');
    }
  }
);
export const withdrawWallet = createAsyncThunk(
  'wallet/withdrawWallet',
  async ({ user_id, amount, reference, metadata }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/wallet/withdraw', {
        user_id,
        amount,
        reference,
        metadata,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to withdraw from wallet');
    }
  }
);

export const fetchWalletHistory = createAsyncThunk(
  'wallet/fetchWalletHistory',
  async ({ user_id, limit = 20, offset = 0 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/wallet/history?user_id=${user_id}&limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallet history');
    }
  }
);

export const createWithdrawalRequest = createAsyncThunk(
  'wallet/createWithdrawalRequest',
  async ({ amount, payment_details, user_note }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/withdrawals', {
        amount,
        payment_details,
        user_note,
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create withdrawal request');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    id: null,
    balance: 0,
    currency: 'IQD',
    history: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearHistory: (state) => {
      state.history = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch wallet
      .addCase(fetchWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.loading = false;
        const w = action.payload || {};
        state.id = w.id ?? state.id;
        state.balance = Number(w.balance ?? state.balance ?? 0);
        state.currency = w.currency || state.currency || 'IQD';
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Withdraw wallet
      .addCase(withdrawWallet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(withdrawWallet.fulfilled, (state, action) => {
        state.loading = false;
        // Add new transaction to history
        if (action.payload.transaction) {
          state.history.unshift(action.payload.transaction);
        }
        // Update balance if server returned it
        if (action.payload?.wallet?.balance !== undefined) {
          state.balance = Number(action.payload.wallet.balance);
          state.id = action.payload.wallet.id ?? state.id;
          state.currency = action.payload.wallet.currency || state.currency;
        } else if (action.payload?.balance !== undefined) {
          state.balance = Number(action.payload.balance);
        }
      })
      .addCase(withdrawWallet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch wallet history
      .addCase(fetchWalletHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWalletHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = action.payload;
      })
      .addCase(fetchWalletHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create withdrawal request
      .addCase(createWithdrawalRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWithdrawalRequest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createWithdrawalRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.id = null;
        state.balance = 0;
        state.currency = 'IQD';
        state.history = [];
        state.loading = false;
        state.error = null;
      })
      .addCase(loadTokenFromStorage.rejected, (state) => {
        state.id = null;
        state.balance = 0;
        state.currency = 'IQD';
        state.history = [];
        state.loading = false;
        state.error = null;
      });
  },
});

export const { clearError, clearHistory } = walletSlice.actions;
export default walletSlice.reducer;
