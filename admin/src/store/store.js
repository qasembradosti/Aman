import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';
import categoriesReducer from './slices/categoriesSlice';
import ordersReducer from './slices/ordersSlice';
import reviewsReducer from './slices/reviewsSlice';
import notificationsReducer from './slices/notificationsSlice';
import usersReducer from './slices/usersSlice';
import dashboardReducer from './slices/dashboardSlice';
import storesReducer from './slices/storesSlice';
import withdrawalsReducer from './slices/withdrawalsSlice';
import supportChatReducer from './slices/supportChatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    categories: categoriesReducer,
    orders: ordersReducer,
    reviews: reviewsReducer,
    notifications: notificationsReducer,
    users: usersReducer,
    dashboard: dashboardReducer,
    stores: storesReducer,
    withdrawals: withdrawalsReducer,
    supportChat: supportChatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
