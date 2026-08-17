/** Contrato de la cola offline: una operación pendiente de replicar al servidor. */
export interface QueuedOperation {
  id: string;
  timestamp: number;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  retries: number;
  maxRetries: number;
  nextAttemptAt?: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
  originDeviceId?: string; // ID del dispositivo que generó el cambio
  syncVersion?: number;    // Para control de conflictos (timestamp o vector)

  // Campos para Protocolo Sync v2 (compatibilidad con backend)
  entityType?: string;
  entityId?: string;
  operation?: string;
  payload?: any;
  baseVersion?: number;
  logicalClock?: number;
  priority?: number;
}

// La falta de cobertura no es un fallo permanente. La operación permanece
// pendiente durante días y sólo se elimina después de una respuesta exitosa.
// El backoff de la aplicación evita reintentos agresivos mientras no haya ruta.
export const MAX_RETRIES = Number.MAX_SAFE_INTEGER;

/** Operación del protocolo sync v2 -> verbo HTTP con el que se reencola. */
export const OPERATION_METHODS: Record<string, QueuedOperation['method']> = {
  create: 'POST',
  update: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
};
