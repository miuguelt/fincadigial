/**
 * Enumeraciones y constantes centralizadas.
 * Valores sincronizados con GET /api/v1/enums al iniciar la app.
 * Los valores hardcodeados son fallback cuando la API no está disponible.
 */

// =============================================
// INTERFACES
// =============================================

interface EnumEntry { value: string; label: string }

// =============================================
// VACUNAS
// =============================================

export const VACCINE_TYPES: readonly EnumEntry[] = [
  { value: 'Atenuada', label: 'Atenuada' },
  { value: 'Inactivada', label: 'Inactivada' },
  { value: 'Toxoide', label: 'Toxoide' },
  { value: 'Subunidad', label: 'Subunidad' },
  { value: 'Conjugada', label: 'Conjugada' },
  { value: 'Recombinante', label: 'Recombinante' },
  { value: 'Adn', label: 'ADN' },
  { value: 'Arn', label: 'ARN' },
];

export const VACCINE_TYPE_VALUES = (): string[] => VACCINE_TYPES.map(t => t.value);

// =============================================
// ESTADOS
// =============================================

export const FIELD_STATES: readonly EnumEntry[] = [
  { value: 'Disponible', label: 'Disponible' },
  { value: 'Ocupado', label: 'Ocupado' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Restringido', label: 'Restringido' },
  { value: 'Dañado', label: 'Dañado' },
  { value: 'Activo', label: 'Activo' },
];

export const FIELD_STATE_VALUES = (): string[] => FIELD_STATES.map(s => s.value);

export const ANIMAL_DISEASE_STATUSES: readonly EnumEntry[] = [
  { value: 'Activo', label: 'Activo' },
  { value: 'En tratamiento', label: 'En tratamiento' },
  { value: 'Recuperado', label: 'Recuperado' },
  { value: 'Tratado', label: 'Tratado' },
  { value: 'Observación', label: 'Observación' },
  { value: 'Crónico', label: 'Crónico' },
];

export const ANIMAL_DISEASE_STATUS_VALUES = (): string[] => ANIMAL_DISEASE_STATUSES.map(s => s.value);

export const ANIMAL_DISEASE_SEVERITIES: readonly EnumEntry[] = [
  { value: 'Leve', label: 'Leve' },
  { value: 'Moderada', label: 'Moderada' },
  { value: 'Severa', label: 'Severa' },
  { value: 'Crítica', label: 'Crítica' },
];

export const ANIMAL_DISEASE_SEVERITY_VALUES = (): string[] => ANIMAL_DISEASE_SEVERITIES.map(s => s.value);

// =============================================
// RUTAS DE ADMINISTRACIÓN
// =============================================

export const ADMINISTRATION_ROUTES: readonly EnumEntry[] = [
  { value: 'Intramuscular', label: 'Intramuscular (IM)' },
  { value: 'Subcutánea', label: 'Subcutánea (SC)' },
  { value: 'Intravenosa', label: 'Intravenosa (IV)' },
  { value: 'Oral', label: 'Oral (VO)' },
  { value: 'Intranasal', label: 'Intranasal' },
  { value: 'Tópica', label: 'Tópica' },
];

export const ADMINISTRATION_ROUTE_VALUES = (): string[] => ADMINISTRATION_ROUTES.map(r => r.value);

// =============================================
// GÉNEROS
// =============================================

export const ANIMAL_GENDERS: readonly EnumEntry[] = [
  { value: 'Macho', label: 'Macho' },
  { value: 'Hembra', label: 'Hembra' },
  { value: 'Castrado', label: 'Castrado' },
];

export const ANIMAL_GENDER_VALUES = (): string[] => ANIMAL_GENDERS.map(g => g.value);

// =============================================
// ESTADOS DE ANIMAL
// =============================================

export const ANIMAL_STATES: readonly EnumEntry[] = [
  { value: 'Sano', label: 'Sano' },
  { value: 'Enfermo', label: 'Enfermo' },
  { value: 'En tratamiento', label: 'En tratamiento' },
  { value: 'En observación', label: 'En observación' },
  { value: 'Cuarentena', label: 'Cuarentena' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'Fallecido', label: 'Fallecido' },
];

export const ANIMAL_STATE_VALUES = (): string[] => ANIMAL_STATES.map(s => s.value);

// =============================================
// TIPOS DE ARCHIVO
// =============================================

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'] as const;
export const ALLOWED_ALL_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS] as const;

// =============================================
// HELPER FUNCTIONS
// =============================================

export function isValidOption<T extends readonly { value: string }[]>(value: string | undefined, options: T): boolean {
  if (!value) return false;
  return options.some(opt => opt.value === value);
}

export function getLabelForValue<T extends readonly { value: string; label: string }[]>(value: string | undefined, options: T): string | undefined {
  if (!value) return undefined;
  return options.find(opt => opt.value === value)?.label;
}

// =============================================
// CARGA DESDE API — llamar al iniciar la app
// =============================================

let _loaded = false;

function _updateFromAPI(data: Record<string, string[]>): void {
  const list = (key: string, target: EnumEntry[]): void => {
    const values = data[key];
    if (Array.isArray(values)) {
      target.length = 0;
      target.push(...values.map(v => ({ value: v, label: v })));
    }
  };
  list('vaccine_types', VACCINE_TYPES as EnumEntry[]);
  list('field_states', FIELD_STATES as EnumEntry[]);
  list('animal_disease_statuses', ANIMAL_DISEASE_STATUSES as EnumEntry[]);
  list('animal_disease_severities', ANIMAL_DISEASE_SEVERITIES as EnumEntry[]);
  list('administration_routes', ADMINISTRATION_ROUTES as EnumEntry[]);
  list('animal_genders', ANIMAL_GENDERS as EnumEntry[]);
  list('animal_states', ANIMAL_STATES as EnumEntry[]);
}

export async function refreshEnums(): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  try {
    const res = await fetch('/api/v1/enums');
    if (res.ok) {
      const data = await res.json() as Record<string, string[]>;
      _updateFromAPI(data);
    }
  } catch {
    // fallback silencioso a valores por defecto
  }
}

// =============================================
// TIPOS (compatibilidad con código existente)
// =============================================

export type VaccineTypeValue = typeof VACCINE_TYPES[number]['value'];
export type FieldStateValue = typeof FIELD_STATES[number]['value'];
export type AnimalDiseaseStatusValue = typeof ANIMAL_DISEASE_STATUSES[number]['value'];
export type AnimalDiseaseSeverityValue = typeof ANIMAL_DISEASE_SEVERITIES[number]['value'];
export type AdministrationRouteValue = typeof ADMINISTRATION_ROUTES[number]['value'];
export type AnimalGenderValue = typeof ANIMAL_GENDERS[number]['value'];
export type AnimalStateValue = typeof ANIMAL_STATES[number]['value'];
