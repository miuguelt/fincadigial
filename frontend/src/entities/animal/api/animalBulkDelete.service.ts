/**
 * Eliminación masiva de animales.
 *
 * El backend elimina lo que puede y devuelve, uno por uno, los animales que
 * quedaron bloqueados por integridad referencial junto con el motivo.
 */

import api from '@/shared/api/client';
import type { BlockingDependency } from '@/shared/api/deletion-error';

export interface BlockedAnimal {
  id: number;
  label: string;
  message: string;
  blocking: BlockingDependency[];
}

export interface BulkDeleteResult {
  success: boolean;
  message: string;
  deletedIds: number[];
  missingIds: number[];
  cascadeTotal: number;
  blocked: BlockedAnimal[];
}

function toBlocking(raw: any): BlockingDependency {
  const label = raw?.label || raw?.table || 'Registros relacionados';
  return {
    table: raw?.table,
    label,
    count: typeof raw?.count === 'number' ? raw.count : null,
    message: raw?.message || label,
    samples: Array.isArray(raw?.samples) ? raw.samples : undefined,
  };
}

function toBlockedAnimal(raw: any): BlockedAnimal {
  return {
    id: Number(raw?.id),
    label: raw?.label || `el animal con ID ${raw?.id}`,
    message: raw?.message || 'No se puede eliminar por registros relacionados.',
    blocking: Array.isArray(raw?.blocking) ? raw.blocking.map(toBlocking) : [],
  };
}

export async function bulkDeleteAnimals(ids: number[]): Promise<BulkDeleteResult> {
  try {
    const response = await api.post('animals/bulk-delete', { ids });
    const body = response?.data ?? {};
    const data = body?.data ?? {};

    return {
      success: body?.success !== false,
      message: body?.message || 'Eliminación masiva completada',
      deletedIds: Array.isArray(data?.deleted_ids) ? data.deleted_ids.map(Number) : [],
      missingIds: Array.isArray(data?.missing_ids) ? data.missing_ids.map(Number) : [],
      cascadeTotal: Number(data?.cascade_total ?? 0),
      blocked: Array.isArray(data?.blocked) ? data.blocked.map(toBlockedAnimal) : [],
    };
  } catch (error: any) {
    return {
      success: false,
      message:
        error?.response?.data?.message
        || error?.message
        || 'No se pudo completar la eliminación masiva',
      deletedIds: [],
      missingIds: [],
      cascadeTotal: 0,
      blocked: [],
    };
  }
}
