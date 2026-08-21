/**
 * Registro del vínculo animal↔chip en el servidor.
 *
 * Grabar el arete y registrar el vínculo son dos cosas distintas: lo primero
 * ocurre en el celular y lo segundo en la base de datos. Cuando no hay señal
 * —que en el potrero es lo normal— el cliente encola la vinculación y esta
 * capa lo dice sin disimulo, para que la pantalla no muestre como confirmado
 * lo que todavía no se guardó.
 */

import api from '@/shared/api/client';
import { readStandardErrorPayload } from '@/shared/api/error-parser';
import { wasQueuedOffline } from '@/shared/api/offlineResult';
import { clearServiceCaches } from '@/shared/api/service-registry';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';

const BASE = '/animals/nfc';

export interface BindTagRequest {
  animalId: number;
  nfcUid?: string;
  lfTagCode?: string;
  writtenAt?: Date;
  /** Reasigna el chip aunque pertenezca a otro animal. */
  force?: boolean;
}

export interface TagHolder {
  id: number;
  record: string;
}

export interface BindTagResult {
  /** Confirmado por el servidor. `false` significa encolado, no guardado. */
  persisted: boolean;
  animal?: Record<string, unknown>;
  message: string;
}

/** El chip pertenece a otro animal; la interfaz decide si reasignar. */
export class TagConflictError extends Error {
  constructor(
    message: string,
    readonly holder: TagHolder | null,
    readonly uid: string
  ) {
    super(message);
    this.name = 'TagConflictError';
  }
}

const readConflict = (error: unknown): TagConflictError | null => {
  const response = (error as { response?: { status?: number; data?: any } })?.response;
  if (response?.status !== 409) return null;

  const conflict = response.data?.details?.conflict ?? response.data?.conflict;
  return new TagConflictError(
    response.data?.message || 'El chip ya está asignado a otro animal',
    conflict?.holder_id
      ? { id: Number(conflict.holder_id), record: String(conflict.holder_record ?? '') }
      : null,
    String(conflict?.code ?? '')
  );
};

const afterWrite = async () => {
  // El arete cambia la identidad del animal: listados, buscador y fichas
  // abiertas deben dejar de mostrar el estado anterior.
  await clearServiceCaches('animals');
  emitDataRefresh('animals');
};

export const nfcBindingService = {
  /** Registra el chip recién grabado. Lanza `TagConflictError` si ya es de otro animal. */
  async bind(request: BindTagRequest): Promise<BindTagResult> {
    try {
      const response = await api.post(`${BASE}/bind`, {
        animal_id: request.animalId,
        nfc_uid: request.nfcUid,
        lf_tag_code: request.lfTagCode,
        written_at: (request.writtenAt ?? new Date()).toISOString(),
        force: request.force ?? false,
      });

      if (wasQueuedOffline(response)) {
        return {
          persisted: false,
          message: 'Sin señal: el arete quedó grabado y la vinculación se enviará al reconectar.',
        };
      }

      await afterWrite();
      return {
        persisted: true,
        animal: response.data?.data,
        message: response.data?.message || 'Chip vinculado',
      };
    } catch (error) {
      const conflict = readConflict(error);
      if (conflict) throw conflict;
      throw new Error(
        readStandardErrorPayload(error).message || 'No se pudo registrar el chip'
      );
    }
  },

  /** Retira la identificación electrónica (arete perdido o chip dañado). */
  async unbind(animalId: number): Promise<BindTagResult> {
    const response = await api.post(`${BASE}/unbind`, { animal_id: animalId });
    if (wasQueuedOffline(response)) {
      return {
        persisted: false,
        message: 'Sin señal: el retiro del chip se enviará al reconectar.',
      };
    }
    await afterWrite();
    return {
      persisted: true,
      animal: response.data?.data,
      message: response.data?.message || 'Chip retirado',
    };
  },

  /** Resuelve a qué animal pertenece un chip leído. `null` si no es de la finca. */
  async lookup(params: { nfcUid?: string; lfTagCode?: string }): Promise<TagHolder | null> {
    try {
      const response = await api.get(`${BASE}/lookup`, {
        params: { nfc_uid: params.nfcUid, lf_tag_code: params.lfTagCode },
      });
      const animal = response.data?.data;
      if (!animal?.id) return null;
      return { id: Number(animal.id), record: String(animal.record ?? '') };
    } catch {
      // Sin señal o sin coincidencia. El arete se graba igual: el conflicto se
      // detecta también por el contenido del propio chip.
      return null;
    }
  },
};
