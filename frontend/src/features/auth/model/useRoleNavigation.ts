import { useCallback, useMemo } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { canAccessRoutePath, toRolePath } from '@/shared/lib/routeAccess';

/**
 * Navegación consciente del rol.
 *
 * Las pantallas compartidas se escribieron con rutas `/admin/...`, pero cada
 * rol vive bajo su propio prefijo. Este hook traduce la ruta al prefijo activo
 * (`rolePath`), permite ocultar enlaces que el rol no puede abrir (`canAccess`)
 * y navega ya traducido (`goTo`).
 */
export function useRoleNavigation() {
  const navigate = useNavigate();
  const { user, role } = useAuth() as any;

  const currentRole = useMemo(() => {
    const raw = role || user?.role || null;
    return raw ? normalizeRole(raw) || String(raw) : null;
  }, [role, user?.role]);

  const rolePath = useCallback(
    (path: string) => toRolePath(currentRole, path),
    [currentRole],
  );

  const canAccess = useCallback(
    (path: string) => canAccessRoutePath(currentRole, toRolePath(currentRole, path)),
    [currentRole],
  );

  const goTo = useCallback(
    (path: string, options?: NavigateOptions) => navigate(toRolePath(currentRole, path), options),
    [currentRole, navigate],
  );

  return { role: currentRole, rolePath, canAccess, goTo };
}
