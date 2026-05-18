import { getTodayColombia } from '@/shared/utils/dateUtils';
import type { AnimalResponse, AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { ANIMAL_GENDERS } from '@/shared/constants/enums';

const ANIMAL_STATUS_OPTIONS = [
  { value: 'Vivo', label: 'Vivo' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'Muerto', label: 'Muerto' },
] as const;

const normalizeGender = (value: unknown): AnimalInput['gender'] | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  let mapped: AnimalInput['gender'] | undefined;
  if (['m', 'macho', 'male'].includes(normalized)) mapped = 'Macho';
  if (['f', 'hembra', 'female'].includes(normalized)) mapped = 'Hembra';
  if (['c', 'castrado', 'castrated'].includes(normalized)) mapped = 'Castrado';
  if (!mapped) return undefined;
  return ANIMAL_GENDERS.some((opt) => opt.value === mapped) ? mapped : undefined;
};

const normalizeStatus = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  let mapped: string | undefined;
  if (['vivo', 'activo', 'sano'].includes(normalized)) mapped = 'Vivo';
  if (['vendido', 'sold'].includes(normalized)) mapped = 'Vendido';
  if (['muerto', 'fallecido', 'dead'].includes(normalized)) mapped = 'Muerto';
  if (!mapped) return undefined;
  return ANIMAL_STATUS_OPTIONS.some((opt) => opt.value === mapped) ? mapped : undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

// Mapear respuesta del backend al formulario
const mapResponseToForm = (item: AnimalResponse & { [k: string]: any }): Partial<AnimalInput> => {
  const status = normalizeStatus(item.status ?? item.estado) || 'Vivo';
  return {
    record: item.record || item.code || item.registro || '',
    birth_date: item.birth_date || item.birthDate || item.fecha_nacimiento,
    weight: toNumber(item.weight ?? item.peso),
    breed_id: toNumber(item.breeds_id ?? item.breed_id ?? item.breedId ?? item.raza_id),
    gender: normalizeGender(item.sex ?? item.gender ?? item.sexo ?? item.genero),
    status: status as any,
    father_id: toNumber(item.idFather ?? item.father_id ?? item.padre_id ?? item.fatherId),
    mother_id: toNumber(item.idMother ?? item.mother_id ?? item.madre_id ?? item.motherId),
    notes: item.notes ?? item.observations ?? item.observaciones ?? '',
    entry_date: item.entry_date,
    purchase_date: item.purchase_date,
    sale_date: item.sale_date,
    exit_date: item.exit_date,
    exit_reason: item.exit_reason || '',
  };
};

// Validación mejorada con advertencias y recomendaciones
const validateForm = (formData: Partial<AnimalInput>): string | null => {
  if (!formData.record || !formData.record.trim()) {
    return '⚠️ El registro es obligatorio. Ejemplo: REC0001, BOV001, etc.';
  }

  if (!formData.birth_date) {
    return '⚠️ La fecha de nacimiento es obligatoria para calcular la edad del animal.';
  }

  // Validar que la fecha de nacimiento no sea futura
  const birthDate = new Date(formData.birth_date);
  const today = new Date();
  if (birthDate > today) {
    return '⚠️ La fecha de nacimiento no puede ser futura. Verifique la fecha ingresada.';
  }

  // Advertir si el animal es muy viejo (más de 20 años)
  const yearsDiff = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsDiff > 20) {
    return '⚠️ La fecha de nacimiento indica que el animal tendría más de 20 años. ¿Es correcta esta fecha?';
  }

  const breedNum = Number(formData.breed_id);
  if (formData.breed_id == null || Number.isNaN(breedNum) || breedNum <= 0) {
    return '⚠️ Debe seleccionar una raza. La raza es importante para el seguimiento genético.';
  }

  if (!formData.gender) {
    return '⚠️ El sexo del animal es obligatorio.';
  }

  // Validar peso (requerido por el backend)
  if (formData.weight === undefined || formData.weight === null) {
    return '⚠️ El peso del animal es obligatorio.';
  }

  const weightNum = Number(formData.weight);
  if (Number.isNaN(weightNum) || weightNum <= 0) {
    return '⚠️ El peso debe ser un valor positivo mayor a 0 kg.';
  }

  if (weightNum > 2000) {
    return '⚠️ El peso parece excesivo (>2000 kg). Verifique el valor ingresado.';
  }

  // Advertir si se selecciona el mismo animal como padre y madre
  if (formData.father_id && formData.mother_id && formData.father_id === formData.mother_id) {
    return '⚠️ No puede seleccionar el mismo animal como padre y madre.';
  }

  return null;
};

// Datos iniciales
const initialFormData: Partial<AnimalInput> = {
  record: '',
  birth_date: getTodayColombia(),
  weight: undefined, // Requerido: será validado antes de enviar
  breed_id: undefined as any, // Forzar que el usuario seleccione
  gender: 'Macho',
  status: 'Vivo' as any,
  father_id: undefined,
  mother_id: undefined,
  notes: '',
};

export {
  ANIMAL_STATUS_OPTIONS,
  normalizeGender,
  normalizeStatus,
  toNumber,
  mapResponseToForm,
  validateForm,
  initialFormData
};

