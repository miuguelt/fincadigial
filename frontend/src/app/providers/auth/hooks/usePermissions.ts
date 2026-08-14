import { useCallback } from 'react';
import { User } from "@/entities/user/model/types";
import { roleCanPermission } from "@/shared/lib/rbac";

/**
 * Permisos granulares por rol.
 * La matriz vive en `@/shared/lib/rbac` y es espejo de `backend/app/utils/rbac.py`.
 */
export const usePermissions = (user: User | null, isAuthenticated: boolean) => {
  /**
   * Verifica permisos. Soporta formatos:
   * - 'resource:action' (ej: 'animals:create')
   * - 'resource' a secas (se interpreta como 'resource:read')
   */
  const hasPermission = useCallback((permission: string) => {
    if (!user || !isAuthenticated) return false;
    return roleCanPermission(user.role, permission);
  }, [user, isAuthenticated]);

  return { hasPermission };
};
