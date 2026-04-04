import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  canAccessAdminPanel,
  canAccessAdminPath,
  getDefaultAdminPath,
} from '../lib/access';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPanel(user)) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPath(user, location.pathname)) {
    return <Navigate to={getDefaultAdminPath(user)} replace />;
  }

  return children;
};

export default ProtectedRoute;
