import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';

/** Restricts platform-wide screens to the configured master administrator. */
const SystemAdminRoute = () => {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!user?.is_system_admin && user?.role !== 'Administrador') {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

export default SystemAdminRoute;
