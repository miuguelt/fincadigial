import { useCallback } from 'react';
import { User, Role } from "@/entities/user/model/types";

/**
 * Mapeo de permisos granulares por rol.
 * Debe mantenerse sincronizado con el backend (app/utils/rbac.py)
 */
const ROLE_PERMISSIONS: Record<string, any> = {
  [Role.Administrador]: '*',
  [Role.Propietario]: '*',
  [Role.Capataz]: {
    'animals': ['read', 'create', 'update'],
    'fields': ['read', 'create', 'update'],
    'animal-fields': ['read', 'create', 'update'],
    'breeds': ['read'],
    'species': ['read'],
    'vaccinations': ['read', 'create'],
    'treatments': ['read', 'create', 'update'],
    'controls': ['read', 'create', 'update'],
    'animal-diseases': ['read', 'create', 'update'],
    'infrastructure': ['read', 'create', 'update'],
    'tasks': ['read', 'create', 'update'],
  },
  [Role.Veterinario]: {
    'vaccinations': ['read', 'create'],
    'treatments': ['read', 'create', 'update'],
    'controls': ['read', 'create', 'update'],
    'animal-diseases': ['read', 'create', 'update'],
    'vaccines': ['read'],
    'medications': ['read'],
    'fincas': ['read'],
    'inventory': ['read', 'create', 'update'],
  },
  [Role.Instructor]: {
    'animals': ['read'],
    'vaccinations': ['read', 'create'],
    'treatments': ['read', 'create'],
    'controls': ['read', 'create'],
    'breeds': ['read'],
    'species': ['read'],
    'fincas': ['read'],
  },
  [Role.Operario]: {
    'animals': ['read'],
    'controls': ['read', 'create'],
    'animal-fields': ['read', 'create'],
    'fields': ['read'],
    'fincas': ['read'],
    'tasks': ['read', 'update'],
    'inventory': ['read'],
  },
  [Role.Aprendiz]: {
    'animals': ['read'],
    'breeds': ['read'],
    'species': ['read'],
    'vaccinations': ['read'],
    'treatments': ['read'],
    'controls': ['read'],
    'fincas': ['read'],
    'tasks': ['read'],
    'inventory': ['read'],
  }
};

export const usePermissions = (user: User | null, isAuthenticated: boolean) => {
  /**
   * Verifica permisos. Soporta formatos:
   * - 'resource:action' (ej: 'animals:create')
   * - 'legacy_string' (mantiene compatibilidad con strings antiguos si existen)
   */
  const hasPermission = useCallback((permission: string) => {
    if (!user || !isAuthenticated) return false;

    const currentRole = user.role;
    const perms = ROLE_PERMISSIONS[currentRole];

    if (!perms) return false;
    if (perms === '*') return true;

    // Si el formato es resource:action
    if (permission.includes(':')) {
      const [resource, action] = permission.split(':');
      const resourcePerms = perms[resource];
      
      if (!resourcePerms) return false;
      if (resourcePerms === '*') return true;
      return resourcePerms.includes(action);
    }

    // Fallback para permisos tipo legacy (basados en strings simples si se usan)
    // Se asume que estos mapean a resource:read o similar
    const [resource] = permission.split(':');
    return !!perms[resource];
  }, [user, isAuthenticated]);

  return { hasPermission };
};

