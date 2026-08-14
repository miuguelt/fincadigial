 
/**
 * Matriz RBAC del cliente — espejo de `backend/app/utils/rbac.py`.
 *
 * Fuente única de verdad en el frontend para decidir qué rutas se montan,
 * qué opciones del menú se muestran y qué peticiones vale la pena disparar.
 * El backend sigue siendo la autoridad: esto solo evita 403 predecibles.
 *
 * IMPORTANTE: cualquier cambio en `ROLE_PERMISSIONS` de `rbac.py` debe
 * replicarse aquí (y viceversa).
 */

export type RbacAction = 'read' | 'create' | 'update' | 'delete';

type EntityPermissions = Record<string, RbacAction[]>;

const READ: RbacAction[] = ['read'];
const READ_CREATE: RbacAction[] = ['read', 'create'];
const READ_CREATE_UPDATE: RbacAction[] = ['read', 'create', 'update'];
const FULL: RbacAction[] = ['read', 'create', 'update', 'delete'];
const NONE: RbacAction[] = [];

/** Entidades del Módulo Campesino: públicas para cualquier usuario autenticado. */
export const CAMPESINO_ENTITIES = new Set([
  'crop-plots', 'crop-activities', 'water-sources', 'water-measurements',
  'climate-risks', 'market-offers', 'technical-assistance', 'offline-learning',
]);

/**
 * Entidades sensibles: la lectura sigue restringida por rol.
 * Cualquier otra entidad es legible por todo rol conocido (espejo de
 * `READ_RESTRICTED_ENTITIES` en rbac.py).
 */
export const READ_RESTRICTED_ENTITIES = new Set(['users', 'security']);

export const ROLE_PERMISSIONS: Record<string, '*' | EntityPermissions> = {
  Administrador: '*',
  Propietario: '*',

  Capataz: {
    'animals': READ_CREATE_UPDATE,
    'animal-diseases': READ_CREATE_UPDATE,
    'animal-fields': READ_CREATE_UPDATE,
    'animal-groups': READ_CREATE_UPDATE,
    'breeds': READ,
    'controls': READ_CREATE,
    'diseases': READ,
    'fields': READ_CREATE_UPDATE,
    'finca-location': READ_CREATE_UPDATE,
    'fincas': READ,
    'food_types': READ,
    'genetic-improvements': READ_CREATE,
    'infrastructure': READ_CREATE_UPDATE,
    'inventory': READ_CREATE_UPDATE,
    'lactation-cycles': READ_CREATE_UPDATE,
    'management-plans': READ,
    'milk-production': READ_CREATE_UPDATE,
    'operational': READ_CREATE_UPDATE,
    'production-targets': READ_CREATE_UPDATE,
    'route-administrations': READ,
    'species': READ,
    'tasks': READ_CREATE_UPDATE,
    'treatment-medications': READ_CREATE,
    'treatment-recommendations': READ_CREATE,
    'treatment-vaccines': READ_CREATE,
    'treatments': READ_CREATE,
    'users': NONE,
    'vaccinations': READ_CREATE,
  },

  Veterinario: {
    'animal-analytics': NONE,
    'animals': READ,
    'animal-diseases': READ_CREATE_UPDATE,
    'animal-fields': READ,
    'animal-groups': READ,
    'breeds': READ,
    'controls': READ_CREATE_UPDATE,
    'diseases': READ_CREATE_UPDATE,
    'fields': READ,
    'fincas': READ,
    'food_types': READ,
    'inventory': READ_CREATE_UPDATE,
    'lactation-cycles': READ_CREATE_UPDATE,
    'medications': READ,
    'milk-production': READ_CREATE_UPDATE,
    'production-targets': READ,
    'route-administrations': READ,
    'species': READ,
    'tasks': FULL,
    'treatment-medications': READ_CREATE_UPDATE,
    'treatment-recommendations': READ_CREATE_UPDATE,
    'treatment-vaccines': READ_CREATE_UPDATE,
    'treatments': READ_CREATE_UPDATE,
    'vaccinations': READ_CREATE,
    'vaccines': READ,
  },

  Instructor: {
    'animals': READ,
    'animal-diseases': READ,
    'animal-fields': READ,
    'animal-groups': READ,
    'breeds': READ,
    'controls': READ_CREATE,
    'diseases': READ,
    'fields': READ,
    'fincas': READ,
    'food_types': READ,
    'lactation-cycles': READ_CREATE,
    'milk-production': READ_CREATE,
    'route-administrations': READ,
    'species': READ,
    'tasks': FULL,
    'treatment-medications': READ_CREATE,
    'treatment-recommendations': READ_CREATE,
    'treatment-vaccines': READ_CREATE,
    'treatments': READ_CREATE,
    'vaccinations': READ_CREATE,
    'vaccines': NONE,
  },

  Operario: {
    'animals': READ,
    'animal-diseases': READ,
    'animal-fields': READ_CREATE,
    'animal-groups': READ,
    'breeds': READ,
    'controls': READ_CREATE,
    'diseases': READ,
    'fields': READ,
    'fincas': READ,
    'food_types': READ,
    'genetic-improvements': READ,
    'inventory': READ,
    'lactation-cycles': READ,
    'medications': READ,
    'milk-production': READ_CREATE,
    'operational': READ_CREATE,
    'route-administrations': READ,
    'species': READ,
    'tasks': ['read', 'update'],
    'treatment-medications': READ,
    'treatment-recommendations': READ,
    'treatment-vaccines': READ,
    'treatments': READ,
    'vaccinations': READ,
    'vaccines': READ,
  },

  Aprendiz: {
    'animals': READ,
    'animal-diseases': READ,
    'animal-fields': READ,
    'animal-groups': READ,
    'breeds': READ,
    'controls': READ,
    'diseases': READ,
    'fields': READ,
    'fincas': READ,
    'food_types': READ,
    'genetic-improvements': READ,
    'inventory': READ,
    'lactation-cycles': READ,
    'medications': READ,
    'milk-production': READ,
    'production-targets': READ,
    'route-administrations': READ,
    'species': READ,
    'tasks': READ,
    'treatment-medications': READ,
    'treatment-recommendations': READ,
    'treatment-vaccines': READ,
    'treatments': READ,
    'vaccinations': READ,
    'vaccines': READ,
  },
};

/** Alias de entidad — espejo de `_ENTITY_ALIASES` en rbac.py. */
const ENTITY_ALIASES: Record<string, string> = {
  'control': 'controls',
  'vaccine': 'vaccines',
  'medication': 'medications',
  'breed': 'breeds',
  'specie': 'species',
  'food_type': 'food_types',
  'food-type': 'food_types',
  'food-types': 'food_types',
  'disease': 'diseases',
  'animal_disease': 'animal-diseases',
  'animal-disease': 'animal-diseases',
  'disease-animals': 'animal-diseases',
  'genetic-improvement': 'genetic-improvements',
  'genetic_improvement': 'genetic-improvements',
  'genetic_improvements': 'genetic-improvements',
  'milk_production': 'milk-production',
  'lactation_cycle': 'lactation-cycles',
  'lactation-cycle': 'lactation-cycles',
  'lactation_cycles': 'lactation-cycles',
  'production_target': 'production-targets',
  'production-target': 'production-targets',
  'production_targets': 'production-targets',
  'treatment_medication': 'treatment-medications',
  'treatment_medications': 'treatment-medications',
  'treatment_vaccine': 'treatment-vaccines',
  'treatment_vaccines': 'treatment-vaccines',
  'treatment_recommendation': 'treatment-recommendations',
  'animal_group': 'animal-groups',
  'management_plan': 'management-plans',
  'management-plan': 'management-plans',
  'management_plans': 'management-plans',
  'operational_cost': 'operational',
  'operational-cost': 'operational',
  'operational_costs': 'operational',
  'route_administration': 'route-administrations',
  'route-administration': 'route-administrations',
  'route_administrations': 'route-administrations',
  'producer_profile': 'producer-profiles',
  // Nomenclatura heredada en singular usada por pantallas antiguas
  'animal': 'animals',
  'field': 'fields',
  'task': 'tasks',
  'user': 'users',
  'treatment': 'treatments',
  'vaccination': 'vaccinations',
  'finca': 'fincas',
  // Etiquetas de las pantallas CRUD compartidas.
  'persona': 'users',
  'enfermedad de animal': 'animal-diseases',
  'asignacion de animal': 'animal-fields',
  'raza': 'breeds',
  'enfermedad': 'diseases',
  'campo': 'fields',
  'tipo de alimento': 'food_types',
  'mejora genetica': 'genetic-improvements',
  'crecimiento de animal': 'animals',
  'lote de inventario': 'inventory',
  'medicamento': 'medications',
  'registro de leche': 'milk-production',
  'gasto operativo': 'operational',
  'plan de manejo': 'management-plans',
  'evento reproductivo': 'animals',
  'ruta de administracion': 'route-administrations',
  'especie': 'species',
  'tarea': 'tasks',
  'medicamento de tratamiento': 'treatment-medications',
  'recomendacion veterinaria': 'treatment-recommendations',
  'vacuna de tratamiento': 'treatment-vaccines',
  'tratamiento': 'treatments',
  'vacunacion': 'vaccinations',
  'vacuna': 'vaccines',
};

/** `write` es sinónimo heredado de `update` en pantallas antiguas. */
const ACTION_ALIASES: Record<string, RbacAction> = {
  write: 'update',
  view: 'read',
  list: 'read',
  edit: 'update',
  add: 'create',
  remove: 'delete',
};

const CANONICAL_ROLES = new Map(
  Object.keys(ROLE_PERMISSIONS).map((role) => [role.toLocaleLowerCase('es-CO'), role]),
);

const resolveRole = (role: string | null | undefined): string => {
  const normalized = String(role ?? '').trim();
  return CANONICAL_ROLES.get(normalized.toLocaleLowerCase('es-CO')) ?? normalized;
};

export const resolveEntity = (entity: string): string =>
  ENTITY_ALIASES[
    String(entity ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  ] ?? String(entity ?? '').trim().toLowerCase();

/**
 * ¿El rol puede ejecutar `action` sobre `entity`?
 * Réplica de `has_permission()` del backend, incluyendo default-deny.
 */
export function roleCan(
  role: string | null | undefined,
  entity: string,
  action: RbacAction = 'read',
): boolean {
  if (!role) return false;

  const resolved = resolveEntity(entity);
  if (CAMPESINO_ENTITIES.has(resolved)) return true;

  const perms = ROLE_PERMISSIONS[resolveRole(role)];
  if (!perms) return false;
  if (perms === '*') return true;

  const explicit = perms[resolved];

  // Lectura general para entidades no sensibles: solo se deniega si el rol la
  // tiene vetada de forma explícita (lista vacía). Entidad no listada => lectura.
  if (action === 'read' && !READ_RESTRICTED_ENTITIES.has(resolved)) {
    return explicit === undefined || explicit.length > 0;
  }

  return (explicit ?? []).includes(action);
}

/** Acepta el formato `'entidad:accion'` usado por `usePermissions`. */
export function roleCanPermission(
  role: string | null | undefined,
  permission: string,
): boolean {
  const [entity, rawAction] = permission.split(':');
  const action = ACTION_ALIASES[rawAction] ?? (rawAction as RbacAction) ?? 'read';
  return roleCan(role, entity, action || 'read');
}
