import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import { canAccessAdminPanel } from '../../lib/access';

// Load user from localStorage on init
const loadUserFromStorage = () => {
  try {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (token && user) {
      const parsedUser = JSON.parse(user);
      if (!canAccessAdminPanel(parsedUser)) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        return { token: null, user: null };
      }
      return { token, user: parsedUser };
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
  }
  return { token: null, user: null };
};

const { token: initialToken, user: initialUser } = loadUserFromStorage();

// Async thunk for login
export const loginAdmin = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      if (!canAccessAdminPanel(user)) {
        return rejectWithValue(
          'Access denied. Only superadmin users, delivery company users, or admin users assigned to a store can access the admin panel.',
        );
      }
      
      // Store in localStorage
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminUser', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Login failed'
      );
    }
  }
);

// Async thunk for logout
export const logoutAdmin = createAsyncThunk(
  'auth/logout',
  async () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
