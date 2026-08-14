import { describe, expect, it } from 'vitest';
import { getRoutePermission } from '@/app/routes/RoutePermissionBoundary';
import { resolveEntity, roleCan } from '@/shared/lib/rbac';
import { canAccessRoutePath, getRolePrefix, getRouteSection, toRolePath } from '@/shared/lib/routeAccess';
import { SANIDAD_TAB_GROUPS } from '@/widgets/dashboard/treatments/SanidadTabs';
import {
  filterSidebarItemsByRole,
  sidebarItems,
  type Role,
  type SidebarItemConfig,
} from '@/widgets/dashboard/sidebarConfig';

const ROLES: Role[] = [
  'Administrador',
  'Propietario',
  'Capataz',
  'Instructor',
  'Veterinario',
  'Aprendiz',
  'Operario',
];

const NON_ADMIN_ROLES: Role[] = ['Instructor', 'Veterinario', 'Aprendiz', 'Operario'];

function flatten(items: SidebarItemConfig[]): SidebarItemConfig[] {
  return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
}

/** Reproduce cómo `RoleBasedSideBar` construye la URL de cada entrada. */
function sidebarPaths(role: Role): string[] {
  const prefix = getRolePrefix(role);
  return flatten(filterSidebarItemsByRole(sidebarItems, role))
    .map((item) => item.path)
    .filter((path): path is string => Boolean(path))
    .map((path) => (path.startsWith('/') ? path : `${prefix}/${path}`));
}

/** Reproduce el filtrado que hace `SanidadTabs` antes de pintar las pestañas. */
function sanidadTabPaths(role: Role): string[] {
  return Object.values(SANIDAD_TAB_GROUPS)
    .flatMap((group) => group.items)
    .map((item) => toRolePath(role, item.path))
    .filter((path) => canAccessRoutePath(role, path));
}

describe('política de acceso de rutas', () => {
  it('deniega a Instructor la gestión sensible aunque se escriba la URL directa', () => {
    const users = getRoutePermission('/instructor/users');
    const vaccines = getRoutePermission('/instructor/vaccines');

    expect(users).toEqual({ entity: 'users', action: 'read' });
    expect(vaccines).toEqual({ entity: 'vaccines', action: 'read' });
    expect(roleCan('Instructor', users!.entity, users!.action)).toBe(false);
    // El catálogo maestro es gestión sensible: Instructor registra aplicaciones
    // en `vaccinations`, pero no consulta ni modifica `/vaccines` directamente.
    expect(roleCan('Instructor', vaccines!.entity, vaccines!.action)).toBe(false);
    expect(roleCan('Instructor', 'vaccines', 'create')).toBe(false);
  });

  it('mantiene para Instructor las rutas operativas que sí puede leer', () => {
    const animals = getRoutePermission('/instructor/animals');
    const controls = getRoutePermission('/instructor/controls');
    const treatments = getRoutePermission('/instructor/treatments');

    expect(roleCan('Instructor', animals!.entity, animals!.action)).toBe(true);
    expect(roleCan('Instructor', controls!.entity, controls!.action)).toBe(true);
    expect(roleCan('Instructor', treatments!.entity, treatments!.action)).toBe(true);
  });

  it('protege acciones rápidas y formularios contra permisos de escritura', () => {
    const quickDisease = getRoutePermission('/quick/disease');
    const quickTreatment = getRoutePermission('/quick/treatment');
    const capatazFoodType = getRoutePermission('/admin/food-types/create');

    expect(roleCan('Instructor', quickDisease!.entity, quickDisease!.action)).toBe(false);
    expect(roleCan('Instructor', quickTreatment!.entity, quickTreatment!.action)).toBe(true);
    expect(roleCan('Capataz', capatazFoodType!.entity, capatazFoodType!.action)).toBe(false);
  });

  it('aplica permisos de escritura a las etiquetas usadas por las pantallas CRUD', () => {
    expect(resolveEntity('Persona')).toBe('users');
    expect(roleCan('Instructor', 'Persona', 'read')).toBe(false);
    expect(roleCan('Instructor', 'Medicamento de tratamiento', 'create')).toBe(true);
    expect(roleCan('Instructor', 'Medicamento de tratamiento', 'update')).toBe(false);
    expect(roleCan('Capataz', 'Control', 'create')).toBe(true);
    expect(roleCan('Capataz', 'Control', 'update')).toBe(false);
  });
});

describe('toRolePath', () => {
  it('lleva la ruta al prefijo del rol', () => {
    expect(toRolePath('Veterinario', '/admin/treatments')).toBe('/veterinario/treatments');
    expect(toRolePath('Aprendiz', '/admin/animals?detail=7')).toBe('/apprentice/animals?detail=7');
    expect(toRolePath('Administrador', '/admin/treatments')).toBe('/admin/treatments');
  });

  it('normaliza los nombres heredados de sección', () => {
    expect(toRolePath('Veterinario', '/admin/control')).toBe('/veterinario/controls');
    expect(toRolePath('Instructor', '/admin/genetic_improvements')).toBe(
      '/instructor/genetic-improvements',
    );
  });

  it('envía las secciones globales a su ruta sin prefijo', () => {
    expect(toRolePath('Veterinario', '/admin/alerts')).toBe('/alerts');
    expect(toRolePath('Operario', '/admin/scanner')).toBe('/scanner');
  });

  it('deja intactas las secciones exclusivas de administración', () => {
    expect(toRolePath('Veterinario', '/admin/diagnostics')).toBe('/admin/diagnostics');
    expect(canAccessRoutePath('Veterinario', '/admin/diagnostics')).toBe(false);
  });

  it('no toca rutas que no llevan prefijo de rol', () => {
    expect(toRolePath('Veterinario', '/quick/treatment')).toBe('/quick/treatment');
    expect(toRolePath('Veterinario', '/campesino/health')).toBe('/campesino/health');
  });
});

describe('getRouteSection', () => {
  it('ignora el prefijo de rol al comparar secciones', () => {
    expect(getRouteSection('/veterinario/treatments/analytics')).toBe('treatments/analytics');
    expect(getRouteSection('/admin/treatments/analytics')).toBe('treatments/analytics');
    expect(getRouteSection('/admin/control')).toBe('controls');
  });
});

describe('canAccessRoutePath', () => {
  it('deja al Veterinario entrar a sus tratamientos y no a los de /admin', () => {
    expect(canAccessRoutePath('Veterinario', '/veterinario/treatments')).toBe(true);
    expect(canAccessRoutePath('Veterinario', '/veterinario/treatments/analytics')).toBe(true);
    expect(canAccessRoutePath('Veterinario', '/admin/treatments')).toBe(false);
  });

  it('reserva la gestión de personal a Administrador y Propietario', () => {
    expect(canAccessRoutePath('Administrador', '/admin/users')).toBe(true);
    expect(canAccessRoutePath('Propietario', '/admin/users')).toBe(true);
    expect(canAccessRoutePath('Capataz', '/admin/users')).toBe(false);
    expect(canAccessRoutePath('Veterinario', '/veterinario/users')).toBe(false);
    expect(canAccessRoutePath('Instructor', '/instructor/membership')).toBe(false);
  });

  it('respeta la matriz RBAC en las acciones rápidas', () => {
    expect(canAccessRoutePath('Veterinario', '/quick/treatment')).toBe(true);
    expect(canAccessRoutePath('Aprendiz', '/quick/treatment')).toBe(false);
    expect(canAccessRoutePath('Aprendiz', '/quick/milk')).toBe(false);
    expect(canAccessRoutePath('Operario', '/quick/milk')).toBe(true);
  });

  it('no deja cruzar el árbol de rutas de otro rol', () => {
    expect(canAccessRoutePath('Veterinario', '/apprentice/animals')).toBe(false);
    expect(canAccessRoutePath('Aprendiz', '/veterinario/animals')).toBe(false);
    expect(canAccessRoutePath('Capataz', '/instructor/animals')).toBe(false);
  });

  it('sin rol resuelto no concede acceso', () => {
    expect(canAccessRoutePath(null, '/admin/animals')).toBe(false);
    expect(canAccessRoutePath('', '/admin/animals')).toBe(false);
  });
});

describe('enlaces de navegación por rol', () => {
  it.each(ROLES)('el menú de %s sólo ofrece destinos que puede abrir', (role) => {
    for (const path of sidebarPaths(role)) {
      expect(canAccessRoutePath(role, path), `${role} -> ${path}`).toBe(true);
    }
  });

  it.each(ROLES)('las pestañas de sanidad de %s sólo ofrecen destinos que puede abrir', (role) => {
    for (const path of sanidadTabPaths(role)) {
      expect(canAccessRoutePath(role, path), `${role} -> ${path}`).toBe(true);
    }
  });

  it.each(NON_ADMIN_ROLES)('las pestañas de sanidad de %s no apuntan a /admin', (role) => {
    for (const path of sanidadTabPaths(role)) {
      expect(path.startsWith('/admin/'), `${role} -> ${path}`).toBe(false);
    }
  });

  it('el Veterinario conserva las pestañas de sanidad bajo su prefijo', () => {
    const paths = sanidadTabPaths('Veterinario');

    expect(paths).toContain('/veterinario/treatments');
    expect(paths).toContain('/veterinario/treatments/analytics');
    expect(paths).toContain('/veterinario/disease-animals');
    expect(paths).toContain('/veterinario/vaccinations');
    expect(paths).toContain('/veterinario/inventory');
  });
});
