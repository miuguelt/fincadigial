export interface SchemaField {
  name: string;
  type: string;
  nullable?: boolean;
  primary_key?: boolean;
  default?: unknown;
}

export interface SchemaRelation {
  fields?: string[];
  depth?: number;
}

export interface SchemaModel {
  model: string;
  table: string;
  fields: SchemaField[];
  filterable: string[];
  searchable: string[];
  sortable: string[];
  required: string[];
  unique: string[];
  enums: Record<string, string[]>;
  relations: Record<string, SchemaRelation>;
}

export interface SchemaSummary {
  totalTables: number;
  totalFields: number;
  totalRelations: number;
  tenantScopedTables: number;
}

const DOMAIN_GROUPS: Array<{ label: string; tables: string[] }> = [
  { label: 'Identidad y acceso', tables: ['finca', 'user', 'user_finca', 'user_locations', 'membership_request', 'push_subscription', 'producer_profiles', 'professional_credentials', 'territories'] },
  { label: 'Gestión animal', tables: ['animals', 'animal_images', 'animal_fields', 'animal_diseases', 'animal_groups', 'animal_group_membership', 'animal_care_plans', 'animal_care_plan_stages', 'animal_disease_progress', 'animal_health_history', 'animal_movements', 'body_condition_scores', 'species', 'breeds'] },
  { label: 'Producción y reproducción', tables: ['milk_production', 'milk_summary', 'livestock_summary', 'animal_production_metrics', 'lactation_cycles', 'production_targets', 'seasonal_adjustments', 'breed_growth_standards', 'reproductive_events', 'offspring', 'genetic_improvements', 'transactions'] },
  { label: 'Salud e inventario', tables: ['treatments', 'treatment_medications', 'treatment_vaccines', 'treatment_protocols', 'treatment_protocol_insumos', 'treatment_recommendations', 'treatment_recommendation_controls', 'vaccinations', 'control', 'diseases', 'vaccines', 'medications', 'route_administrations', 'inventory_lots', 'inventory_movements', 'animal_alerts', 'animal_alert_configs', 'farm_entity_alerts', 'farm_entity_alert_configs'] },
  { label: 'Finca y operaciones', tables: ['fields', 'food_types', 'pasture_aforos', 'infrastructure', 'tasks', 'crop_plots', 'crop_activities', 'water_sources', 'water_measurements', 'weather_records', 'weather_alerts', 'climate_risk_alerts', 'market_offers', 'technical_assistance_requests', 'management_plans'] },
  { label: 'Auditoría y comunicación', tables: ['activity_log', 'activity_daily_agg', 'chat_messages', 'operational_costs', 'financial_summary', 'farm_expenses', 'devices', 'sync_operations', 'sync_sessions', 'sync_conflicts', 'sync_operation_receipts', 'node_messages', 'community_nodes'] },
];

const TABLE_LABELS: Record<string, string> = {
  activity_daily_agg: 'Resumen diario de actividad', activity_log: 'Registro de actividad', chat_messages: 'Mensajes',
  financial_summary: 'Resumen financiero', operational_costs: 'Costos operativos', farm_expenses: 'Gastos de finca', transactions: 'Transacciones',
  fields: 'Potreros', food_types: 'Tipos de alimento', infrastructure: 'Infraestructura', pasture_aforos: 'Aforos de pastura',
  route_administrations: 'Vías de administración', tasks: 'Tareas', animal_diseases: 'Enfermedades del animal',
  animal_fields: 'Ubicaciones del animal', animal_group_membership: 'Integrantes de grupos', animal_groups: 'Grupos de animales',
  animal_images: 'Imágenes de animales', animals: 'Animales', species: 'Especies', breeds: 'Razas', finca: 'Fincas',
  animal_care_plans: 'Planes de cuidado', animal_care_plan_stages: 'Etapas de planes de cuidado', animal_disease_progress: 'Seguimiento de enfermedades',
  animal_health_history: 'Historial sanitario', animal_movements: 'Movimientos de animales', body_condition_scores: 'Condición corporal',
  producer_profiles: 'Perfiles de productores', professional_credentials: 'Credenciales profesionales', territories: 'Territorios',
  animal_production_metrics: 'Métricas de producción animal', lactation_cycles: 'Ciclos de lactancia', production_targets: 'Metas de producción',
  seasonal_adjustments: 'Ajustes estacionales', crop_plots: 'Lotes de cultivo', crop_activities: 'Actividades de cultivo',
  water_sources: 'Fuentes de agua', water_measurements: 'Mediciones de agua', weather_records: 'Registros climáticos', weather_alerts: 'Alertas climáticas',
  climate_risk_alerts: 'Alertas de riesgo climático', market_offers: 'Ofertas de mercado', technical_assistance_requests: 'Solicitudes de asistencia técnica',
  management_plans: 'Planes de manejo', devices: 'Dispositivos', sync_operations: 'Operaciones de sincronización', sync_sessions: 'Sesiones de sincronización',
  sync_conflicts: 'Conflictos de sincronización', sync_operation_receipts: 'Confirmaciones de sincronización', node_messages: 'Mensajes entre nodos', community_nodes: 'Nodos comunitarios',
  breed_growth_standards: 'Estándares de crecimiento', treatment_protocols: 'Protocolos de tratamiento', treatment_protocol_insumos: 'Insumos de protocolos',
  treatment_recommendations: 'Recomendaciones de tratamiento', treatment_recommendation_controls: 'Controles de recomendaciones',
  membership_request: 'Solicitudes de vinculación', push_subscription: 'Suscripciones de notificaciones', user: 'Usuarios',
  user_finca: 'Membresías de finca', user_locations: 'Ubicaciones de usuario', genetic_improvements: 'Mejoras genéticas',
  livestock_summary: 'Resumen del ganado', milk_production: 'Producción de leche', milk_summary: 'Resumen de leche',
  offspring: 'Crías', reproductive_events: 'Eventos reproductivos', animal_alert_configs: 'Configuración de alertas',
  animal_alerts: 'Alertas de animales', control: 'Controles veterinarios', diseases: 'Enfermedades', inventory_lots: 'Lotes de inventario',
  inventory_movements: 'Movimientos de inventario', medications: 'Medicamentos', treatment_medications: 'Medicamentos de tratamientos',
  treatment_vaccines: 'Vacunas de tratamientos', treatments: 'Tratamientos', vaccinations: 'Vacunaciones', vaccines: 'Vacunas',
};

const ROUTES: Record<string, string> = {
  animals: '/admin/animals', fields: '/admin/fields', species: '/admin/species', breeds: '/admin/breeds', user: '/admin/users',
  finca: '/admin/fincas', diseases: '/admin/diseases', vaccines: '/admin/vaccines', vaccinations: '/admin/vaccinations',
  medications: '/admin/medications', treatments: '/admin/treatments', control: '/admin/control', animal_fields: '/admin/animal-fields',
  animal_diseases: '/admin/disease-animals', genetic_improvements: '/admin/genetic-improvements', food_types: '/admin/food-types',
  milk_production: '/admin/milk-production', tasks: '/admin/tasks', inventory_lots: '/admin/inventory', inventory_movements: '/admin/inventory',
  treatment_medications: '/admin/treatment_medications', treatment_vaccines: '/admin/treatment_vaccines', route_administrations: '/admin/route_administration',
  animal_alerts: '/admin/alerts', animal_alert_configs: '/admin/alerts/configs', activity_log: '/admin/activity-log',
  animal_care_plans: '/admin/plans', animal_care_plan_stages: '/admin/plans', animal_disease_progress: '/admin/disease-animals',
  animal_health_history: '/admin/animals', animal_movements: '/admin/animals', body_condition_scores: '/admin/growth',
  breed_growth_standards: '/admin/growth', farm_expenses: '/admin/financial', financial_summary: '/admin/financial', operational_costs: '/admin/financial',
  treatment_protocols: '/admin/treatment-protocols', treatment_recommendations: '/admin/treatment_recommendations', treatment_recommendation_controls: '/admin/treatment_recommendations',
  finca_images: '/admin/fincas', lactation_cycles: '/admin/milk-production', livestock_summary: '/admin/analytics/executive', milk_summary: '/admin/analytics/executive',
  production_targets: '/admin/analytics/executive', seasonal_adjustments: '/admin/analytics/executive', sinigan_registrations: '/admin/regulatory-reports',
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function asRelations(value: unknown): Record<string, SchemaRelation> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, relation]) => [
    key,
    relation && typeof relation === 'object' && !Array.isArray(relation)
      ? { fields: asStringArray((relation as any).fields), depth: Number((relation as any).depth ?? 1) }
      : {},
  ]));
}

export function normalizeSchemaModels(payload: unknown): SchemaModel[] {
  const candidate = Array.isArray(payload)
    ? payload
    : (payload as any)?.data?.models ?? (payload as any)?.models ?? (payload as any)?.data ?? [];
  if (!Array.isArray(candidate)) return [];

  const byTable = new Map<string, SchemaModel>();
  for (const item of candidate) {
    if (!item || typeof item !== 'object') continue;
    const table = String((item as any).table ?? (item as any).model ?? '').trim();
    if (!table || byTable.has(table)) continue;
    const fields = Array.isArray((item as any).fields)
      ? (item as any).fields.filter((field: any) => field && typeof field.name === 'string').map((field: any) => ({
        name: field.name, type: String(field.type ?? 'TEXT'), nullable: field.nullable,
        primary_key: field.primary_key, default: field.default,
      }))
      : [];
    byTable.set(table, {
      model: String((item as any).model ?? table), table, fields,
      filterable: asStringArray((item as any).filterable), searchable: asStringArray((item as any).searchable),
      sortable: asStringArray((item as any).sortable), required: asStringArray((item as any).required),
      unique: asStringArray((item as any).unique), enums: ((item as any).enums && typeof (item as any).enums === 'object') ? (item as any).enums : {},
      relations: asRelations((item as any).relations),
    });
  }
  return Array.from(byTable.values()).sort((a, b) => getModelDisplayName(a.table).localeCompare(getModelDisplayName(b.table), 'es-CO'));
}

export function getSchemaSummary(models: SchemaModel[]): SchemaSummary {
  return {
    totalTables: models.length,
    totalFields: models.reduce((total, model) => total + model.fields.length, 0),
    totalRelations: models.reduce((total, model) => total + Object.keys(model.relations).length, 0),
    tenantScopedTables: models.filter((model) => model.fields.some((field) => field.name === 'finca_id')).length,
  };
}

export function getModelDisplayName(table: string): string {
  return TABLE_LABELS[table] ?? table.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getTableDomain(table: string): string {
  return DOMAIN_GROUPS.find((group) => group.tables.includes(table))?.label ?? 'Otros';
}

export function getModelRoute(table: string): string | null {
  return ROUTES[table] ?? null;
}

export function getDomainLabels(): string[] {
  return DOMAIN_GROUPS.map((group) => group.label);
}
