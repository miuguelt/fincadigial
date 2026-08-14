import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { canAccessRoutePath, getRoutePermission, type RoutePermissionRule } from '@/shared/lib/routeAccess';

export type { RoutePermissionRule };
export { getRoutePermission };

/**
 * Red de seguridad para el acceso directo por URL.
 * La navegación de la interfaz ya oculta lo que el rol no puede abrir
 * (`canAccessRoutePath` en menús, pestañas y accesos rápidos); esto sólo
 * atrapa lo que se escribe a mano o llega desde un enlace antiguo.
 */
const RoutePermissionBoundary: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, user, role, loading } = useAuth() as any;

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  const currentRoleRaw = role || user?.role || null;
  // Sin rol resuelto todavía: esperar en vez de mandar a /unauthorized.
  if (!currentRoleRaw) return null;

  const currentRole = normalizeRole(currentRoleRaw) || String(currentRoleRaw);
  if (!canAccessRoutePath(currentRole, location.pathname)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RoutePermissionBoundary;
