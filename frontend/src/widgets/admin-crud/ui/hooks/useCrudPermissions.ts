import { useMemo } from 'react';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { resolveEntity, roleCan } from '@/shared/lib/rbac';

/**
 * Qué puede hacer el rol actual sobre esta entidad.
 *
 * Cruza dos fuentes: lo que la config de la pantalla habilita y lo que el RBAC
 * permite al rol. Ambas deben decir sí; la config nunca amplía permisos.
 */
export function useCrudPermissions(config: any, role: unknown, user: any) {
  const currentRole = normalizeRole(role || user?.role) || String(role || user?.role || '');

  const permissionEntity = useMemo(
    () => resolveEntity(config.permissionEntity || config.entityName),
    [config.permissionEntity, config.entityName]
  );

  const canCreate = useMemo(
    () => config.enableCreateModal !== false && roleCan(currentRole, permissionEntity, 'create'),
    [config.enableCreateModal, currentRole, permissionEntity]
  );

  const canUpdate = useMemo(
    () => config.enableEditModal !== false && roleCan(currentRole, permissionEntity, 'update'),
    [config.enableEditModal, currentRole, permissionEntity]
  );

  const canDelete = useMemo(
    () => Boolean(config.enableDelete) && roleCan(currentRole, permissionEntity, 'delete'),
    [config.enableDelete, currentRole, permissionEntity]
  );

  return { currentRole, permissionEntity, canCreate, canUpdate, canDelete };
}
