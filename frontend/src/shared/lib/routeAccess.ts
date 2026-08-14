/**
 * Política de acceso a rutas del frontend.
 *
 * Fuente única para tres preguntas que antes se respondían por separado
 * (y por eso se contradecían):
 *
 *  1. ¿Bajo qué prefijo debe vivir esta pantalla para el rol actual?  -> `toRolePath`
 *  2. ¿Puede este rol abrir esta URL?                                -> `canAccessRoutePath`
 *  3. ¿Qué permiso RBAC exige esta URL?                              -> `getRoutePermission`
 *
 * Los enlaces de la interfaz usan (1) y (2) para no ofrecer destinos que
 * terminarían en `/unauthorized`; `RoutePermissionBoundary` usa (2) y (3)
 * como red de seguridad para el acceso directo por URL.
 *
 * Espejo de `AppRoutes.tsx` (árbol de rutas) y de `shared/lib/rbac.ts`
 * (matriz de permisos). El backend sigue siendo la autoridad final.
 */

import { roleCan, type RbacAction } from '@/shared/lib/rbac';

export interface RoutePermissionRule {
  entity: string;
  action: RbacAction;
}

/** Prefijos de dashboard por rol (espejo de `AppRoutes.tsx`). */
export const ROLE_PREFIX_BY_ROLE: Record<string, string> = {
  Administrador: '/admin',
  Propietario: '/admin',
  Capataz: '/admin',
  Instructor: '/instructor',
  Veterinario: '/veterinario',
  Aprendiz: '/apprentice',
  Operario: '/operario',
};

/** Roles admitidos en cada prefijo (espejo de los `ProtectedRoute` de `AppRoutes`). */
const ROLES_BY_PREFIX: Record<string, string[]> = {
  admin: ['Administrador', 'Propietario', 'Capataz'],
  instructor: ['Administrador', 'Instructor', 'Veterinario'],
  veterinario: ['Administrador', 'Instructor', 'Veterinario'],
  apprentice: ['Administrador', 'Aprendiz', 'Operario'],
  operario: ['Administrador', 'Aprendiz', 'Operario'],
};

export const ROLE_ROUTE_ROOTS = new Set(Object.keys(ROLES_BY_PREFIX));

/**
 * Secciones que sólo existen bajo `/admin`: no hay equivalente en
 * `renderRoleRoutes`, así que nunca deben enlazarse desde otros roles.
 */
const ADMIN_ONLY_SECTIONS = [
  'financial',
  'analytics/multi-finca',
  'activity-log',
  'diagnostics',
  'operational',
  'base_model',
  'route_administration',
];

/** Rutas globales sin prefijo de rol. Un `/admin/<x>` de esta lista se reescribe a `/<x>`. */
const GLOBAL_SECTIONS = new Set(['alerts', 'chat', 'scanner']);

/** Nombres heredados de secciones que el árbol por rol escribe de otra forma. */
const SECTION_ALIASES: Record<string, string> = {
  control: 'controls',
  animalDiseases: 'disease-animals',
  animalFields: 'fields',
  genetic_improvements: 'genetic-improvements',
  user: 'users',
};

/** Secciones reservadas a quien administra la finca (espejo de los `ProtectedRoute` anidados). */
const FARM_MANAGER_SECTIONS = ['users', 'user-approval', 'membership'];
const FARM_MANAGER_ROLES = ['Administrador', 'Propietario'];

/** Entidad RBAC que respalda cada sección del dashboard. */
const RESOURCE_RULES: Array<{ prefix: string; entity: string }> = [
  { prefix: 'animals', entity: 'animals' },
  { prefix: 'fields', entity: 'fields' },
  { prefix: 'vaccinations', entity: 'vaccinations' },
  { prefix: 'vaccines', entity: 'vaccines' },
  { prefix: 'medications', entity: 'medications' },
  { prefix: 'diseases', entity: 'diseases' },
  { prefix: 'treatment_medications', entity: 'treatment-medications' },
  { prefix: 'treatment_vaccines', entity: 'treatment-vaccines' },
  { prefix: 'treatments', entity: 'treatments' },
  { prefix: 'controls', entity: 'controls' },
  { prefix: 'animal-fields', entity: 'animal-fields' },
  { prefix: 'disease-animals', entity: 'animal-diseases' },
  { prefix: 'genetic-improvements', entity: 'genetic-improvements' },
  { prefix: 'species', entity: 'species' },
  { prefix: 'breeds', entity: 'breeds' },
  { prefix: 'food-types', entity: 'food_types' },
  { prefix: 'inventory', entity: 'inventory' },
  { prefix: 'data-overview', entity: 'inventory' },
  { prefix: 'milk-production', entity: 'milk-production' },
  { prefix: 'tasks', entity: 'tasks' },
  { prefix: 'reproduction', entity: 'animals' },
  { prefix: 'growth', entity: 'animals' },
  { prefix: 'regulatory-reports', entity: 'animals' },
  { prefix: 'reports', entity: 'animals' },
  { prefix: 'analytics', entity: 'animals' },
  { prefix: 'calendar', entity: 'animals' },
  { prefix: 'tools', entity: 'tasks' },
];

const matchesSection = (section: string, prefix: string): boolean =>
  section === prefix || section.startsWith(`${prefix}/`);

const splitSuffix = (path: string): [string, string] => {
  const cut = path.search(/[?#]/);
  return cut === -1 ? [path, ''] : [path.slice(0, cut), path.slice(cut)];
};

/** Normaliza `/admin/animalDiseases` -> `animalDiseases` -> `disease-animals`. */
const normalizeSection = (section: string): string => {
  const clean = section.replace(/^\/+|\/+$/g, '');
  if (!clean) return '';
  const [head, ...rest] = clean.split('/');
  const canonicalHead = SECTION_ALIASES[head] ?? head;
  return [canonicalHead, ...rest].join('/');
};

/** Prefijo de ruta del dashboard según el rol. */
export function getRolePrefix(role?: string | null): string {
  return ROLE_PREFIX_BY_ROLE[String(role ?? '')] ?? '/admin';
}

/**
 * Devuelve la sección (sin prefijo de rol) de una ruta del dashboard.
 * `/veterinario/treatments/analytics` -> `treatments/analytics`.
 * Para rutas sin prefijo de rol devuelve la ruta normalizada sin la barra inicial.
 */
export function getRouteSection(path: string): string {
  const [pathname] = splitSuffix(path);
  const segments = pathname.split('/').filter(Boolean);
  if (ROLE_ROUTE_ROOTS.has(segments[0] ?? '')) return normalizeSection(segments.slice(1).join('/'));
  return normalizeSection(segments.join('/'));
}

/**
 * Reescribe una ruta escrita con prefijo `/admin` al prefijo del rol actual.
 * Las secciones globales pasan a su ruta sin prefijo y las exclusivas de
 * administración se dejan intactas (`canAccessRoutePath` las filtrará).
 */
export function toRolePath(role: string | null | undefined, path: string): string {
  if (!path.startsWith('/')) return path;

  const [pathname, suffix] = splitSuffix(path);
  const segments = pathname.split('/').filter(Boolean);
  if (!ROLE_ROUTE_ROOTS.has(segments[0] ?? '')) return path;

  const section = normalizeSection(segments.slice(1).join('/'));
  if (!section) return `${getRolePrefix(role)}${suffix}`;

  const head = section.split('/')[0];
  if (GLOBAL_SECTIONS.has(head)) return `/${section}${suffix}`;
  if (ADMIN_ONLY_SECTIONS.some((admin) => matchesSection(section, admin))) {
    return `/admin/${section}${suffix}`;
  }

  return `${getRolePrefix(role)}/${section}${suffix}`;
}

/** Permiso de las acciones rápidas (`/quick/<accion>`). */
const QUICK_ACTION_RULES: Record<string, RoutePermissionRule> = {
  control: { entity: 'controls', action: 'create' },
  transfer: { entity: 'animal-fields', action: 'create' },
  disease: { entity: 'animal-diseases', action: 'create' },
  treatment: { entity: 'treatments', action: 'create' },
  milk: { entity: 'milk-production', action: 'create' },
};

/** Secciones administrativas cuyo permiso no se deduce de `RESOURCE_RULES`. */
const MANAGEMENT_RULES: Array<{ prefix: string } & RoutePermissionRule> = [
  { prefix: 'users', entity: 'users', action: 'read' },
  { prefix: 'user-approval', entity: 'users', action: 'read' },
  { prefix: 'membership', entity: 'users', action: 'read' },
  { prefix: 'fincas', entity: 'fincas', action: 'update' },
];

/**
 * Formularios: la ruta base crea y la ruta con `:id` edita.
 * `food-types` usa `create`/`edit` en vez de `form`.
 */
const FORM_RULES: Array<{ prefix: string; entity: string }> = [
  { prefix: 'treatment_medications/form', entity: 'treatment-medications' },
  { prefix: 'treatment_vaccines/form', entity: 'treatment-vaccines' },
  { prefix: 'treatments/form', entity: 'treatments' },
];

/** Permiso de las rutas de escritura; `null` si la sección no es un formulario. */
function getFormPermission(section: string): RoutePermissionRule | null {
  if (section === 'food-types/create') return { entity: 'food_types', action: 'create' };
  if (matchesSection(section, 'food-types/edit')) return { entity: 'food_types', action: 'update' };

  for (const rule of FORM_RULES) {
    if (section === rule.prefix) return { entity: rule.entity, action: 'create' };
    if (matchesSection(section, rule.prefix)) return { entity: rule.entity, action: 'update' };
  }

  return null;
}

/**
 * Permiso RBAC que exige una ruta del frontend.
 * `null` significa que la ruta ya está cubierta por su grupo de roles o que es
 * una utilidad autenticada sin política por entidad.
 */
export function getRoutePermission(pathname: string): RoutePermissionRule | null {
  const [clean] = splitSuffix(pathname);
  const segments = clean.split('/').filter(Boolean);

  if (segments[0] === 'quick') return QUICK_ACTION_RULES[segments[1] ?? ''] ?? null;
  if (!ROLE_ROUTE_ROOTS.has(segments[0] ?? '')) return null;

  const section = normalizeSection(segments.slice(1).join('/'));
  if (!section) return null;

  const managementRule = MANAGEMENT_RULES.find((rule) => matchesSection(section, rule.prefix));
  if (managementRule) return { entity: managementRule.entity, action: managementRule.action };

  const formRule = getFormPermission(section);
  if (formRule) return formRule;

  const resourceRule = RESOURCE_RULES.find((rule) => matchesSection(section, rule.prefix));
  return resourceRule ? { entity: resourceRule.entity, action: 'read' } : null;
}

/**
 * ¿El rol puede abrir esta URL sin acabar en `/unauthorized`?
 * Comprueba el grupo de roles del prefijo, las secciones reservadas y el RBAC.
 */
function isInRoleTree(currentRole: string, root: string, section: string): boolean {
  if (!ROLES_BY_PREFIX[root].includes(currentRole)) return false;

  // Las secciones exclusivas de administración sólo existen bajo `/admin`.
  if (root !== 'admin' && ADMIN_ONLY_SECTIONS.some((admin) => matchesSection(section, admin))) {
    return false;
  }

  if (FARM_MANAGER_SECTIONS.some((managed) => matchesSection(section, managed))) {
    return FARM_MANAGER_ROLES.includes(currentRole);
  }

  return true;
}

export function canAccessRoutePath(role: string | null | undefined, path: string): boolean {
  const currentRole = String(role ?? '');
  if (!currentRole) return false;

  const [pathname] = splitSuffix(path);
  const segments = pathname.split('/').filter(Boolean);
  const root = segments[0] ?? '';

  if (ROLE_ROUTE_ROOTS.has(root)) {
    const section = normalizeSection(segments.slice(1).join('/'));
    if (!isInRoleTree(currentRole, root, section)) return false;
  }

  const rule = getRoutePermission(pathname);
  if (!rule) return true;
  return roleCan(currentRole, rule.entity, rule.action);
}
