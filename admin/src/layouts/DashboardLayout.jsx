import { Outlet, NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutAdmin } from '../store/slices/authSlice';
import { useState } from 'react';
import { Home, Package, FolderTree, ShoppingCart, MessageSquare, Bell, Users, LogOut, Menu, Image, Tag, Store, Wallet, MessageCircle, FileText } from 'lucide-react';
import { isStoreAdmin } from '../lib/access';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/categories', label: 'Categories', icon: FolderTree },
  { path: '/brands', label: 'Brands', icon: Tag },
  { path: '/stores', label: 'Stores', icon: Store },
  { path: '/banners', label: 'Banners', icon: Image },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/wallets', label: 'Wallets', icon: Wallet },
  { path: '/withdrawals', label: 'Withdrawals', icon: Wallet },
  { path: '/reviews', label: 'Reviews', icon: MessageSquare },
  { path: '/support-chat', label: 'Support Chat', icon: MessageCircle },
  { path: '/content', label: 'About & FAQ', icon: FileText },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/users', label: 'Users', icon: Users },
];

const DashboardLayout = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const visibleNavItems = isStoreAdmin(user)
    ? navItems.filter(
        (item) => item.path === '/products' || item.path === '/orders',
      )
    : navItems;

  const handleLogout = () => {
    dispatch(logoutAdmin());
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Header - Fixed */}
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-lg font-semibold text-gray-900">
              {isStoreAdmin(user) ? 'Store Admin' : 'Admin'}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Fixed */}
        <aside
          className={`${
            sidebarOpen ? 'w-56' : 'w-0'
          } bg-white border-r border-gray-200 transition-all duration-200 overflow-hidden shrink-0`}
        >
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content - Scrollable */}
        <main 
          className="flex-1 overflow-y-auto p-6 overscroll-contain"
          style={{ willChange: 'scroll-position', transform: 'translateZ(0)' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardLayout;
