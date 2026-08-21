export interface BoardField {
  id: number;
  name: string;
  capacity: number | null;
  area: string | null;
  state: string | null;
  /** Conteo de animales vivos que reporta el backend (referencia, no agrupa). */
  reportedCount: number;
  isGrazingReady: boolean | null;
  restDaysRemaining: number | null;
  lastGrazingDate: string | null;
}

export interface BoardAnimal {
  id: number;
  record: string;
  sex: string | null;
  ageMonths: number | null;
  weight: number | null;
  alerts: number;
  fieldId: number | null;
  /** Nombre de respaldo: el listado optimizado de animales lo entrega en vez del ID. */
  fieldName: string | null;
}

const toId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const toCapacity = (value: unknown): number | null => {
  const capacity = Number(value);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
};

export const mapFieldForBoard = (raw: any): BoardField => ({
  id: Number(raw.id),
  name: String(raw.name ?? `Potrero ${raw.id}`),
  capacity: toCapacity(raw.capacity_num ?? raw.capacity),
  area: raw.area ?? null,
  state: raw.state ?? null,
  reportedCount: Number(raw.animal_count ?? 0) || 0,
  isGrazingReady: typeof raw.is_grazing_ready === 'boolean' ? raw.is_grazing_ready : null,
  restDaysRemaining: Number.isFinite(Number(raw.rest_days_remaining)) ? Number(raw.rest_days_remaining) : null,
  lastGrazingDate: raw.last_grazing_date ?? null,
});

export const mapAnimalForBoard = (raw: any): BoardAnimal => ({
  id: Number(raw.id),
  record: String(raw.record || `Animal ${raw.id}`),
  sex: raw.sex ?? raw.gender ?? null,
  ageMonths: Number.isFinite(Number(raw.age_in_months)) ? Number(raw.age_in_months) : null,
  weight: Number.isFinite(Number(raw.weight)) ? Number(raw.weight) : null,
  alerts: Number(raw.pending_alerts_count ?? 0) || 0,
  fieldId: toId(raw.current_field_id ?? raw.field_id ?? raw.current_field?.id),
  fieldName: raw.current_field_name ?? raw.field_name ?? raw.current_field?.name ?? null,
});

const compareByRecord = (a: BoardAnimal, b: BoardAnimal) =>
  a.record.localeCompare(b.record, 'es', { numeric: true, sensitivity: 'base' });

const normalizeFieldName = (value: string | null | undefined) => value?.trim().toLowerCase() || '';

/** Resuelve el ID cuando el endpoint solo devuelve current_field_name. */
export const resolveBoardAnimalFieldId = (animal: BoardAnimal, fields: BoardField[]) => {
  if (animal.fieldId != null) return animal.fieldId;
  const name = normalizeFieldName(animal.fieldName);
  if (!name) return null;
  return fields.find((field) => normalizeFieldName(field.name) === name)?.id ?? null;
};

/** Actualiza una asignación local y sincroniza el nombre de respaldo al instante. */
export const applyBoardAnimalAssignments = (
  animals: BoardAnimal[],
  assignments: Map<number, number | null>,
  fields?: BoardField[],
) => {
  const fieldNameById = new Map<number, string>();
  if (fields) {
    fields.forEach((f) => fieldNameById.set(f.id, f.name));
  }

  return animals.map((animal) => {
    if (!assignments.has(animal.id)) return animal;
    const fieldId = assignments.get(animal.id) ?? null;
    const nextFieldName =
      fieldId == null ? null : fieldNameById.get(fieldId) ?? animal.fieldName;
    return { ...animal, fieldId, fieldName: nextFieldName };
  });
};

/** Agrupa el inventario completo sin depender de una sola forma del contrato. */
export const groupAnimalsByField = (animals: BoardAnimal[], fields: BoardField[]) => {
  const groups = new Map<number, BoardAnimal[]>();
  const unassigned: BoardAnimal[] = [];
  fields.forEach((field) => groups.set(field.id, []));

  animals.forEach((animal) => {
    const fieldId = resolveBoardAnimalFieldId(animal, fields);
    const bucket = fieldId != null ? groups.get(fieldId) : undefined;
    if (bucket) bucket.push({ ...animal, fieldId });
    else unassigned.push(animal);
  });

  groups.forEach((items) => items.sort(compareByRecord));
  unassigned.sort(compareByRecord);
  return { groups, unassigned };
};
