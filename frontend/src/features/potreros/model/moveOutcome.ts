import type { BoardField } from './usePotrerosBoard';

/** Estado de un potrero recalculado por el backend tras mover ganado. */
export interface FieldUpdate {
  id: number;
  animal_count?: number;
  state?: string | null;
  is_grazing_ready?: boolean | null;
  rest_days_remaining?: number | null;
  last_grazing_date?: string | null;
}

/** Desglose que devuelven `/animal-fields/transfer` y `/animal-fields/bulk-remove`. */
export interface MoveMeta {
  transferred_count?: number;
  removed_count?: number;
  skipped_count?: number;
  total_requested?: number;
  fields?: FieldUpdate[];
}

export type MoveTone = 'success' | 'warning';

/** Cómo estaba el potrero destino antes de recibir el lote. */
export interface DestinationState {
  capacity: number | null;
  /** Venía en descanso: meter ganado antes de tiempo desgasta el pasto. */
  wasResting: boolean;
  restDaysRemaining?: number | null;
}

interface OutcomeInput {
  /** Animales que se enviaron a mover. */
  requested: number;
  /** Nombre del potrero destino, o `null` cuando es un retiro. */
  destinationLabel: string | null;
  destinationFieldId?: number | null;
  destination?: DestinationState;
  meta?: MoveMeta;
}

/** Avisos agronómicos sobre el potrero que acaba de recibir el ganado. */
function destinationWarnings(
  destinationFieldId: number | null | undefined,
  destination: DestinationState | undefined,
  meta: MoveMeta | undefined,
): string[] {
  if (!destination || destinationFieldId == null) return [];

  const warnings: string[] = [];
  const update = meta?.fields?.find((field) => Number(field.id) === Number(destinationFieldId));
  const count = Number(update?.animal_count);

  if (destination.capacity && Number.isFinite(count) && count > destination.capacity) {
    warnings.push(
      `Queda con ${count} animales y aguanta ${destination.capacity}: revisa el aforo.`,
    );
  }

  if (destination.wasResting) {
    const days = Number(destination.restDaysRemaining);
    warnings.push(
      days > 0
        ? `Ese potrero venía descansando y le faltaban ${days} ${days === 1 ? 'día' : 'días'}.`
        : 'Ese potrero venía descansando.',
    );
  }

  return warnings;
}

const animals = (count: number) => `${count} ${count === 1 ? 'animal' : 'animales'}`;

/**
 * Traduce la respuesta del servidor a un mensaje que dice la verdad.
 *
 * El tablero anunciaba siempre "N animales pasaron a X" contando lo que había
 * pedido, no lo que el backend movió: si otra persona ya los había ubicado allí,
 * el aviso mentía y el conteo del potrero no cuadraba con el mensaje.
 */
export function describeMoveOutcome({
  requested,
  destinationLabel,
  destinationFieldId,
  destination,
  meta,
}: OutcomeInput): {
  message: string;
  tone: MoveTone;
} {
  const isRemoval = destinationLabel == null;
  const reported = isRemoval ? meta?.removed_count : meta?.transferred_count;
  const moved = Number.isFinite(Number(reported)) ? Number(reported) : requested;
  const skipped = Number(meta?.skipped_count) || 0;

  if (moved === 0 && skipped > 0) {
    return {
      tone: 'warning',
      message: isRemoval
        ? `Ningún animal cambió: los ${skipped} ya estaban sin potrero.`
        : `Ningún animal se movió: ${skipped === 1 ? 'ya estaba' : `los ${skipped} ya estaban`} en ${destinationLabel}.`,
    };
  }

  const main = isRemoval
    ? `${animals(moved)} ${moved === 1 ? 'quedó' : 'quedaron'} sin potrero.`
    : `${animals(moved)} ${moved === 1 ? 'pasó' : 'pasaron'} a ${destinationLabel}.`;

  const parts = [main];
  if (skipped > 0) {
    parts.push(
      isRemoval
        ? `${skipped} ya ${skipped === 1 ? 'estaba' : 'estaban'} sin potrero.`
        : `${skipped} ya ${skipped === 1 ? 'estaba' : 'estaban'} ahí.`,
    );
  }
  if (!isRemoval) parts.push(...destinationWarnings(destinationFieldId, destination, meta));

  return {
    tone: parts.length > 1 ? 'warning' : 'success',
    message: parts.join(' '),
  };
}

/**
 * Aplica a las tarjetas del tablero los conteos y el descanso recalculados.
 * Evita que la ocupación y el estado del potrero queden colgados del refetch.
 */
export function applyFieldUpdates(fields: BoardField[], updates?: FieldUpdate[]): BoardField[] {
  if (!updates || updates.length === 0) return fields;

  const byId = new Map<number, FieldUpdate>();
  updates.forEach((update) => {
    const id = Number(update?.id);
    if (Number.isFinite(id)) byId.set(id, update);
  });
  if (byId.size === 0) return fields;

  return fields.map((field) => {
    const update = byId.get(field.id);
    if (!update) return field;

    return {
      ...field,
      reportedCount: Number.isFinite(Number(update.animal_count))
        ? Number(update.animal_count)
        : field.reportedCount,
      state: update.state ?? field.state,
      isGrazingReady:
        typeof update.is_grazing_ready === 'boolean' ? update.is_grazing_ready : field.isGrazingReady,
      restDaysRemaining: Number.isFinite(Number(update.rest_days_remaining))
        ? Number(update.rest_days_remaining)
        : field.restDaysRemaining,
      lastGrazingDate: update.last_grazing_date ?? field.lastGrazingDate,
    };
  });
}
