import type { AnimalInput, AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { ANIMAL_GENDERS } from '@/shared/constants/enums';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export { ANIMAL_GENDERS };

export const ANIMAL_STATUS_OPTIONS = [
  { value: 'Vivo', label: 'Vivo' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'Muerto', label: 'Muerto' },
] as const;

export const normalizeGender = (value: unknown): AnimalInput['sex'] | undefined => {
  if (value == null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  const aliases: Record<string, string> = { m: 'Macho', macho: 'Macho', male: 'Macho', f: 'Hembra', hembra: 'Hembra', female: 'Hembra', c: 'Castrado', castrado: 'Castrado', castrated: 'Castrado' };
  const mapped = aliases[normalized];
  return mapped && ANIMAL_GENDERS.some((option) => option.value === mapped) ? mapped as AnimalInput['sex'] : undefined;
};

export const normalizeStatus = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  const aliases: Record<string, string> = { vivo: 'Vivo', activo: 'Vivo', sano: 'Vivo', vendido: 'Vendido', sold: 'Vendido', muerto: 'Muerto', fallecido: 'Muerto', dead: 'Muerto' };
  const mapped = aliases[normalized];
  return mapped && ANIMAL_STATUS_OPTIONS.some((option) => option.value === mapped) ? mapped : undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (value == null || value === '') return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
};

const pick = (item: Record<string, any>, keys: string[]) => keys.map((key) => item[key]).find((value) => value != null && value !== '');

export const mapResponseToForm = (item: AnimalResponse & { [key: string]: any }): Partial<AnimalInput> => ({
  record: pick(item, ['record', 'code', 'registro']) || '',
  birth_date: pick(item, ['birth_date', 'birthDate', 'fecha_nacimiento']),
  weight: toNumber(pick(item, ['weight', 'peso'])),
  breeds_id: toNumber(pick(item, ['breeds_id', 'breed_id', 'breedId', 'raza_id'])),
  sex: normalizeGender(pick(item, ['sex', 'gender', 'sexo', 'genero'])),
  status: (normalizeStatus(pick(item, ['status', 'estado'])) || 'Vivo') as any,
  idFather: toNumber(pick(item, ['idFather', 'father_id', 'padre_id', 'fatherId'])),
  idMother: toNumber(pick(item, ['idMother', 'mother_id', 'madre_id', 'motherId'])),
  notes: pick(item, ['notes', 'observations', 'observaciones']) || '',
  entry_date: item.entry_date,
  purchase_date: item.purchase_date,
  sale_date: item.sale_date,
  exit_date: item.exit_date,
  exit_reason: item.exit_reason || '',
});

const validateBasicAnimal = (formData: Partial<AnimalInput>): string | null => {
  if (!formData.record?.trim()) return '⚠️ El registro es obligatorio. Ejemplo: REC0001, BOV001, etc.';
  if (!formData.birth_date) return '⚠️ La fecha de nacimiento es obligatoria para calcular la edad del animal.';
  const birthDate = new Date(formData.birth_date);
  const today = new Date();
  if (birthDate > today) return '⚠️ La fecha de nacimiento no puede ser futura. Verifique la fecha ingresada.';
  if ((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365) > 20) return '⚠️ La fecha de nacimiento indica que el animal tendría más de 20 años. ¿Es correcta esta fecha?';
  const breedNumber = Number(formData.breeds_id);
  if (formData.breeds_id == null || Number.isNaN(breedNumber) || breedNumber <= 0) return '⚠️ Debe seleccionar una raza. La raza es importante para el seguimiento genético.';
  if (!formData.sex) return '⚠️ El sexo del animal es obligatorio.';
  return null;
};

const validateWeight = (formData: Partial<AnimalInput>): string | null => {
  if (formData.weight == null) return '⚠️ El peso del animal es obligatorio.';
  const weight = Number(formData.weight);
  if (Number.isNaN(weight) || weight <= 0) return '⚠️ El peso debe ser un valor positivo mayor a 0 kg.';
  if (weight > 2000) return '⚠️ El peso parece excesivo (>2000 kg). Verifique el valor ingresado.';
  return null;
};

const validateRelationships = (formData: Partial<AnimalInput>): string | null => (
  formData.idFather && formData.idMother && formData.idFather === formData.idMother
    ? '⚠️ No puede seleccionar el mismo animal como padre y madre.'
    : null
);

export const validateForm = (formData: Partial<AnimalInput>): string | null => (
  validateBasicAnimal(formData) || validateWeight(formData) || validateRelationships(formData)
);

export const initialFormData: Partial<AnimalInput> = {
  record: '', birth_date: getTodayColombia(), weight: undefined, breeds_id: undefined as any,
  sex: 'Macho', status: 'Vivo' as any, idFather: undefined, idMother: undefined, notes: '',
};

export const animalFields = ['id', 'record', 'name', 'birth_date', 'weight', 'breeds_id', 'sex', 'status', 'idFather', 'idMother', 'age_in_months', 'is_adult', 'current_field_id', 'current_field_name', 'pending_alerts_count', 'created_at'];
