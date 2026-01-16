import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/apiService';
import { USE_STATIC_AUTH, tryStaticLogin } from '../../constants/devAuth';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      console.log('Attempting login with:', { username });

      // Dev-only static auth: short-circuit API when enabled and credentials match
      if (USE_STATIC_AUTH) {
        const staticResult = tryStaticLogin({ username, password });
        if (staticResult) {
          const { token, user } = staticResult;
          await AsyncStorage.setItem('token', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          console.log('✅ Static auth: token and user saved to AsyncStorage');
          return { token, user };
        }
      }

      const response = await api.post('/api/auth/login', { username, password });
      console.log('Login response:', response.data);
      const { token, user } = response.data;
      
      // Store token and user in AsyncStorage
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return { token, user };
    } catch (error) {
      return rejectWithValue(errorMessage);
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { user, otpSent } = response.data;
      return { user, otpSent };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const startPhoneVerification = createAsyncThunk(
  'auth/startPhoneVerification',
  async (options = {}, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/verify-phone/start', options);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send verification code');
    }
  }
);

export const verifyPhone = createAsyncThunk(
  'auth/verifyPhone',
  async ({ code }, { rejectWithValue, getState }) => {
    try {
      const response = await api.post('/api/auth/verify-phone/check', { code });
      // Persist updated user status to storage so it survives app restarts
      const state = getState();
      const currentUser = state?.auth?.user || null;
      const updatedUser = currentUser
        ? { ...currentUser, phone_verified: true, status: 'active' }
        : null;
      if (updatedUser) {
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return { ...(response.data || {}), user: updatedUser };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Verification failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      console.log('Updating profile with:', profileData);
      const response = await api.put('/api/auth/profile', profileData);
      console.log('Update profile response:', response.data);
      const { user } = response.data;
      
      // Update user in AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('✅ Updated user saved to AsyncStorage');
      
      return { user };
    } catch (error) {
      console.error('Update profile error:', error);
      return rejectWithValue(error.response?.data?.message || 'Profile update failed');
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      console.log('Changing password...');
      const response = await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });
      console.log('Change password response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      return rejectWithValue(error.response?.data?.message || 'Password change failed');
    }
  }
);

// Request password reset (send code)
export const requestPasswordReset = createAsyncThunk(
  'auth/requestPasswordReset',
  async ({ identifier, channel = 'whatsapp', lang, fallback = 'no' }, { rejectWithValue }) => {
    try {
      // Determine field: username/email/phone
      const payload = { channel, lang, fallback };
      if (!identifier) {
        return rejectWithValue('Please provide username, email, or phone');
      }
      const trimmed = String(identifier).trim();
      if (/^7\d{9}$/.test(trimmed.replace(/\D/g, ''))) {
        payload.phone = trimmed;
      } else if (trimmed.includes('@')) {
        payload.email = trimmed;
      } else {
        payload.username = trimmed;
      }
      const response = await api.post('/api/auth/request-password-reset', payload);
      return { ...response.data, payloadSent: payload };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to request password reset');
    }
  }
);

// Reset password with verification code
export const resetPasswordWithCode = createAsyncThunk(
  'auth/resetPasswordWithCode',
  async ({ identifier, code, newPassword }, { rejectWithValue }) => {
    try {
      if (!code || !newPassword) {
        return rejectWithValue('Code and new password are required');
      }
      const payload = { code, newPassword };
      const trimmed = String(identifier || '').trim();
      if (trimmed) {
        if (/^7\d{9}$/.test(trimmed.replace(/\D/g, ''))) {
          payload.phone = trimmed;
        } else if (trimmed.includes('@')) {
          payload.email = trimmed;
        } else {
          payload.username = trimmed;
        }
      }
      const response = await api.post('/api/auth/reset-password', payload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reset password');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  console.log('🔓 Logging out...');
  // Remove token and user from AsyncStorage
  await AsyncStorage.multiRemove(['token', 'user']);
  console.log('✅ Token and user removed from AsyncStorage');
  return null;
});

export const loadTokenFromStorage = createAsyncThunk(
  'auth/loadToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      
      if (token && userJson) {
        try {
          const user = JSON.parse(userJson);
          console.log('✅ Token and user loaded from storage:', { username: user.username });
          return { token, user };
        } catch (parseError) {
          console.error('❌ Failed to parse user JSON:', parseError);
          // Clear corrupted data
          await AsyncStorage.removeItem('user');
          await AsyncStorage.removeItem('token');
          return rejectWithValue('Corrupted user data');
        }
      }
      
      if (token) {
        console.log('⚠️ Token loaded but no user data found');
        return { token, user: null };
      }
      
      console.log('ℹ️ No token found in storage');
      return rejectWithValue('No token found');
    } catch (error) {
      console.error('❌ Failed to load from storage:', error);
      return rejectWithValue(error?.message || 'Failed to load token');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        // We don't auto-authenticate on register, but UI may choose to login next
        // Keep last registered user info if needed
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.error = null;
        console.log('✅ Profile updated in Redux state');
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        console.log('✅ Password changed successfully');
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Request Password Reset
      .addCase(requestPasswordReset.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestPasswordReset.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(requestPasswordReset.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Reset Password With Code
      .addCase(resetPasswordWithCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPasswordWithCode.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(resetPasswordWithCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Start Phone Verification
      .addCase(startPhoneVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startPhoneVerification.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(startPhoneVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Verify Phone
      .addCase(verifyPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyPhone.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (action.payload?.user) {
          state.user = action.payload.user;
        } else if (state.user) {
          // Fallback: ensure in-memory state reflects verification
          state.user.phone_verified = true;
          state.user.status = 'active';
        }
      })
      .addCase(verifyPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      // Load token from storage
      .addCase(loadTokenFromStorage.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        console.log('✅ Auth state restored from storage');
      })
      .addCase(loadTokenFromStorage.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        console.log('ℹ️ No stored auth session found');
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
