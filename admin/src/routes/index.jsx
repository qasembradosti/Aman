import { createBrowserRouter } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Products from '../pages/products/Products';
import Categories from '../pages/categories/Categories';
import Brands from '../pages/brands/Brands';
import Stores from '../pages/stores/Stores';
import Orders from '../pages/orders/Orders';
import Reviews from '../pages/reviews/Reviews';
import Notifications from '../pages/notifications/Notifications';
import Users from '../pages/users/Users';
import Banners from '../pages/banners/Banners';
import Withdrawals from '../pages/withdrawals/Withdrawals';
import Wallets from '../pages/wallets/Wallets';
import SupportChat from '../pages/support/SupportChat';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'products',
        element: <Products />,
      },
      {
        path: 'categories',
        element: <Categories />,
      },
      {
        path: 'brands',
        element: <Brands />,
      },
      {
        path: 'stores',
        element: <Stores />,
      },
      {
        path: 'orders',
        element: <Orders />,
      },
      {
        path: 'reviews',
        element: <Reviews />,
      },
      {
        path: 'notifications',
        element: <Notifications />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'banners',
        element: <Banners />,
      },
      {
        path: 'withdrawals',
        element: <Withdrawals />,
      },
      {
        path: 'wallets',
        element: <Wallets />,
      },
      {
        path: 'support-chat',
        element: <SupportChat />,
      },
    ],
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <Login />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;
