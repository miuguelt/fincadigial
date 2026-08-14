import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { applyFieldUpdates, describeMoveOutcome, type MoveMeta, type MoveTone } from './moveOutcome';

/** El backend limita cada página a API_MAX_PAGE_SIZE (500). */
const ANIMALS_PAGE_SIZE = 500;
/** Tope defensivo: un tablero con más animales sería inmanejable en pantalla. */
export const MAX_BOARD_ANIMALS = 5000;

const BOARD_ANIMAL_FIELDS = [
  'id',
  'record',
  'sex',
  'birth_date',
  'weight',
  'age_in_months',
  'status',
  'current_field_id',
  'current_field_name',
  'pending_alerts_count',
].join(',');

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
}

/** Resultado de mover ganado, con el tono con que debe mostrarse el aviso. */
export interface MoveResult {
  ok: boolean;
  message: string;
  tone: MoveTone | 'error';
}

export interface PendingUndo {
  animalIds: number[];
  previousFieldByAnimal: Map<number, number | null>;
  destinationLabel: string;
}

const toId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const toCapacity = (value: unknown): number | null => {
  const capacity = Number(value);
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
};

const mapField = (raw: any): BoardField => ({
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

const mapAnimal = (raw: any): BoardAnimal => ({
  id: Number(raw.id),
  record: String(raw.record || `Animal ${raw.id}`),
  sex: raw.sex ?? raw.gender ?? null,
  ageMonths: Number.isFinite(Number(raw.age_in_months)) ? Number(raw.age_in_months) : null,
  weight: Number.isFinite(Number(raw.weight)) ? Number(raw.weight) : null,
  alerts: Number(raw.pending_alerts_count ?? 0) || 0,
  fieldId: toId(raw.current_field_id ?? raw.field_id ?? raw.current_field?.id),
});

const compareByRecord = (a: BoardAnimal, b: BoardAnimal) =>
  a.record.localeCompare(b.record, 'es', { numeric: true, sensitivity: 'base' });

/**
 * Carga completa del tablero de potreros.
 *
 * El tablero agrupa por potrero, así que necesita el inventario vivo entero:
 * conectarlo a la paginación de la tabla (25 por página) hacía que los conteos
 * por potrero mostraran solo una fracción del ganado.
 */
export function usePotrerosBoard() {
  const [fields, setFields] = useState<BoardField[]>([]);
  const [animals, setAnimals] = useState<BoardAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUndo, setLastUndo] = useState<PendingUndo | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * `silent` refresca sin tapar el tablero con la pantalla de carga: tras un
   * traslado la vista ya muestra datos buenos y el spinner completo hacía
   * perder el sitio donde se estaba trabajando.
   */
  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const fieldsPromise = fieldService.getPaginated({
        limit: ANIMALS_PAGE_SIZE,
        sort_by: 'name',
        sort_order: 'asc',
        cache_bust: Date.now(),
      });

      const collected: BoardAnimal[] = [];
      let page = 1;
      let totalPages = 1;
      let wasTruncated = false;

      do {
        const response = await animalsService.getAnimalsPaginated({
          status: 'Vivo',
          fields: BOARD_ANIMAL_FIELDS,
          sort: 'record',
          order: 'asc',
          page,
          limit: ANIMALS_PAGE_SIZE,
        });
        const rows = Array.isArray(response?.data) ? response.data : [];
        collected.push(...rows.map(mapAnimal));
        totalPages = Number(response?.total_pages) || 1;
        page += 1;
        if (collected.length >= MAX_BOARD_ANIMALS) {
          wasTruncated = page <= totalPages;
          break;
        }
      } while (page <= totalPages);

      const fieldsResponse = await fieldsPromise;
      const fieldRows = Array.isArray(fieldsResponse?.data) ? fieldsResponse.data : [];

      if (!mountedRef.current) return;
      setFields(fieldRows.map(mapField));
      setAnimals(collected);
      setTruncated(wasTruncated);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e?.message || 'No se pudieron cargar los potreros y el ganado.');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => void load({ silent: true });
    window.addEventListener('animal-fields:updated', handler);
    return () => window.removeEventListener('animal-fields:updated', handler);
  }, [load]);

  const fieldById = useMemo(() => {
    const map = new Map<number, BoardField>();
    fields.forEach((field) => map.set(field.id, field));
    return map;
  }, [fields]);

  const grouped = useMemo(() => {
    const groups = new Map<number, BoardAnimal[]>();
    const unassigned: BoardAnimal[] = [];
    fields.forEach((field) => groups.set(field.id, []));

    animals.forEach((animal) => {
      const bucket = animal.fieldId != null ? groups.get(animal.fieldId) : undefined;
      if (bucket) bucket.push(animal);
      else unassigned.push(animal);
    });

    groups.forEach((items) => items.sort(compareByRecord));
    unassigned.sort(compareByRecord);
    return { groups, unassigned };
  }, [animals, fields]);

  const totals = useMemo(() => {
    const capacity = fields.reduce((sum, field) => sum + (field.capacity || 0), 0);
    const unassigned = grouped.unassigned.length;
    const assigned = animals.length - unassigned;
    return {
      fields: fields.length,
      animals: animals.length,
      assigned,
      unassigned,
      capacity,
      available: Math.max(0, capacity - assigned),
      occupation: capacity > 0 ? Math.round((assigned / capacity) * 100) : null,
    };
  }, [animals.length, fields, grouped.unassigned.length]);

  const applyAssignments = useCallback((assignments: Map<number, number | null>) => {
    setAnimals((previous) =>
      previous.map((animal) =>
        assignments.has(animal.id) ? { ...animal, fieldId: assignments.get(animal.id)! } : animal,
      ),
    );
  }, []);

  /**
   * Traslada (o retira, con `targetFieldId === null`) un lote de animales.
   * Aplica el cambio en pantalla al instante y lo revierte si el backend falla.
   */
  const moveAnimals = useCallback(
    async (animalIds: number[], targetFieldId: number | null): Promise<MoveResult> => {
      const ids = animalIds.filter((id) => Number.isFinite(id));
      if (ids.length === 0) return { ok: false, tone: 'error', message: 'No hay animales seleccionados.' };

      const previousFieldByAnimal = new Map<number, number | null>();
      animals.forEach((animal) => {
        if (ids.includes(animal.id)) previousFieldByAnimal.set(animal.id, animal.fieldId);
      });

      const pending = ids.filter((id) => previousFieldByAnimal.get(id) !== targetFieldId);
      if (pending.length === 0) {
        return { ok: true, tone: 'warning', message: 'Los animales ya estaban en ese lugar.' };
      }

      const destinationField = targetFieldId == null ? undefined : fieldById.get(targetFieldId);
      const destinationLabel = targetFieldId == null
        ? 'sin potrero'
        : destinationField?.name || 'el potrero elegido';
      // Se guarda ANTES de mover: el traslado marca el potrero como pastoreado
      // hoy, así que después ya no se sabría que venía descansando.
      const destinationBefore = destinationField && {
        capacity: destinationField.capacity,
        wasResting: destinationField.isGrazingReady === false,
        restDaysRemaining: destinationField.restDaysRemaining,
      };

      setSaving(true);
      applyAssignments(new Map(pending.map((id) => [id, targetFieldId])));
      try {
        const result = targetFieldId == null
          ? await animalFieldsService.bulkRemove({ animal_ids: pending })
          : await animalFieldsService.bulkTransfer({ animal_ids: pending, field_id: targetFieldId });

        if (!result.success) throw new Error(result.message);

        const meta = result.meta as MoveMeta | undefined;
        // Conteo, estado y descanso recalculados por el backend: la tarjeta del
        // potrero se repinta con esos datos sin esperar la recarga.
        setFields((previous) => applyFieldUpdates(previous, meta?.fields));

        // Deshacer solo revierte lo que realmente se movió.
        const movedOrigins = new Map<number, number | null>();
        pending.forEach((id) => movedOrigins.set(id, previousFieldByAnimal.get(id) ?? null));
        setLastUndo({ animalIds: pending, previousFieldByAnimal: movedOrigins, destinationLabel });
        window.dispatchEvent(new CustomEvent('animal-fields:updated'));

        const outcome = describeMoveOutcome({
          requested: pending.length,
          destinationLabel: targetFieldId == null ? null : destinationLabel,
          destinationFieldId: targetFieldId,
          destination: destinationBefore,
          meta,
        });
        return { ok: true, ...outcome };
      } catch (e: any) {
        applyAssignments(previousFieldByAnimal);
        return {
          ok: false,
          tone: 'error',
          message: e?.message || 'No se pudo mover el ganado. Intenta de nuevo.',
        };
      } finally {
        setSaving(false);
      }
    },
    [animals, applyAssignments, fieldById],
  );

  /** Devuelve cada animal del último traslado a donde estaba. */
  const undoLastMove = useCallback(async (): Promise<MoveResult> => {
    if (!lastUndo) return { ok: false, tone: 'error', message: 'No hay nada que deshacer.' };

    const byPreviousField = new Map<number | null, number[]>();
    lastUndo.previousFieldByAnimal.forEach((fieldId, animalId) => {
      const bucket = byPreviousField.get(fieldId) || [];
      bucket.push(animalId);
      byPreviousField.set(fieldId, bucket);
    });

    setSaving(true);
    applyAssignments(lastUndo.previousFieldByAnimal);
    try {
      for (const [fieldId, ids] of byPreviousField) {
        const result = fieldId == null
          ? await animalFieldsService.bulkRemove({ animal_ids: ids })
          : await animalFieldsService.bulkTransfer({ animal_ids: ids, field_id: fieldId });
        if (!result.success) throw new Error(result.message);
        setFields((previous) => applyFieldUpdates(previous, (result.meta as MoveMeta | undefined)?.fields));
      }
      setLastUndo(null);
      window.dispatchEvent(new CustomEvent('animal-fields:updated'));
      return { ok: true, tone: 'success', message: 'Listo, el ganado volvió a su potrero anterior.' };
    } catch (e: any) {
      await load({ silent: true });
      return {
        ok: false,
        tone: 'error',
        message: e?.message || 'No se pudo deshacer. Revisa la lista actualizada.',
      };
    } finally {
      setSaving(false);
    }
  }, [applyAssignments, lastUndo, load]);

  const dismissUndo = useCallback(() => setLastUndo(null), []);

  return {
    fields,
    animals,
    fieldById,
    grouped,
    totals,
    loading,
    error,
    truncated,
    saving,
    lastUndo,
    reload: load,
    moveAnimals,
    undoLastMove,
    dismissUndo,
  };
}
