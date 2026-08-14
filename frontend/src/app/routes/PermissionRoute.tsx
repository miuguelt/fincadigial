import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { roleCan, type RbacAction } from '@/shared/lib/rbac';

interface PermissionRouteProps {
  /** Entidad de la matriz RBAC (ej: 'tasks', 'animal-diseases'). */
  entity: string;
  /** Acción mínima requerida para entrar. Por defecto 'read'. */
  action?: RbacAction;
}

/**
 * Guarda una ruta según la matriz RBAC en vez de una lista fija de roles.
 * Evita montar pantallas cuyo primer fetch el backend va a rechazar con 403.
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({ entity, action = 'read' }) => {
  const location = useLocation();
  const { isAuthenticated, user, role, loading } = useAuth() as any;

  // La compuerta de sesión la maneja ProtectedRoute; aquí solo esperamos.
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  const currentRoleRaw = role || user?.role || null;
  if (!currentRoleRaw) return null;

  const currentRole = normalizeRole(currentRoleRaw) || String(currentRoleRaw);
  if (!roleCan(currentRole, entity, action)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default PermissionRoute;
