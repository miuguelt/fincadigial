import { getCookie } from '@/shared/utils/cookieUtils';
import { apiFetch } from '@/shared/api/apiFetch';
import { toRelativeApiPath } from '@/shared/api/urlUtils';
import { API_CONFIG } from '@/shared/api/config';
import { ConflictResolver } from './ConflictResolver';
import { FieldNodeService } from './FieldNodeService';

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

const DB_NAME = 'VillaLuzQueue';
const DB_VERSION = 1;
const QUEUE_STORE = 'offlineQueue';
// La falta de cobertura no es un fallo permanente. La operación permanece
// pendiente durante días y sólo se elimina después de una respuesta exitosa.
// El backoff de la aplicación evita reintentos agresivos mientras no haya ruta.
const MAX_RETRIES = Number.MAX_SAFE_INTEGER;
/** Último cursor recibido de /sync/pull, para pedir sólo lo nuevo. */
const PULL_CURSOR_KEY_PREFIX = 'villaluz_sync_pull_cursor';
/** Operación del protocolo sync v2 -> verbo HTTP con el que se reencola. */
const OPERATION_METHODS: Record<string, QueuedOperation['method']> = {
  create: 'POST',
  update: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
};

// ─────────────────────────────────────────────────────────────
// Helpers de mapeo de URL a Entidad
// ─────────────────────────────────────────────────────────────

function inferEntityFromUrl(url: string): { entityType: string; entityId?: string } {
  const parts = url.split('/');
  // Buscar la parte después de /api/v1/ o similar
  const apiIndex = parts.findIndex(p => p === 'v1' || p === 'api');
  const entityPart = apiIndex !== -1 ? parts[apiIndex + 1] : parts[parts.length - 2] || 'unknown';

  // Si el último componente es un número o UUID, es el entityId
  const lastPart = parts[parts.length - 1];
  const isId = lastPart && (
    !isNaN(Number(lastPart)) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart)
  );

  return {
    entityType: entityPart.replace(/-/g, '_'),
    entityId: isId ? lastPart : undefined
  };
}

function inferOperation(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST': return 'create';
    case 'PUT': return 'update';
    case 'PATCH': return 'patch';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}

// ─────────────────────────────────────────────────────────────
// IndexedDB helpers (misma DB que el cache HTTP, store separado)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────

/**
 * Conexión única a la cola. Antes cada lectura o escritura abría una conexión
 * nueva y no la cerraba: en una sesión larga sin cobertura se acumulaban
 * cientos de conexiones vivas, y cualquier `deleteDatabase` o cambio de versión
 * del esquema quedaba bloqueado indefinidamente por ellas.
 */
let queueDbPromise: Promise<IDBDatabase> | null = null;

function openQueueDB(): Promise<IDBDatabase> {
  if (queueDbPromise) return queueDbPromise;

  queueDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      // Si otra pestaña pide borrar o migrar la base, soltamos la conexión en
      // vez de bloquearla, y la siguiente operación la reabre.
      db.onversionchange = () => {
        db.close();
        queueDbPromise = null;
      };
      db.onclose = () => {
        queueDbPromise = null;
      };
      resolve(db);
    };
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  }).catch((error) => {
    queueDbPromise = null;
    throw error;
  });

  return queueDbPromise;
}

async function dbGetAll(): Promise<QueuedOperation[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readonly');
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result as QueuedOperation[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function dbPut(op: QueuedOperation): Promise<void> {
  try {
    const db = await openQueueDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const req = tx.objectStore(QUEUE_STORE).put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* noop */ }
}

async function dbDelete(id: string): Promise<void> {
  try {
    const db = await openQueueDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      const req = tx.objectStore(QUEUE_STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────
// OfflineQueue
// ─────────────────────────────────────────────────────────────

/**
 * Aplica Last Write Wins sobre las operaciones que mutan el mismo recurso.
 *
 * Dos dispositivos sin cobertura pueden editar el mismo animal; al reconectar,
 * enviar ambas ediciones en orden de cola hacía que la más vieja sobrescribiera
 * a la más reciente. Sólo sobrevive la de mayor syncVersion, y el descarte
 * queda registrado en ConflictResolver para que el administrador lo audite.
 *
 * Los POST quedan fuera: crean recursos distintos aunque compartan URL.
 */
export function resolveQueueConflicts(operations: QueuedOperation[]): {
  survivors: QueuedOperation[];
  discarded: QueuedOperation[];
} {
  const byResource = new Map<string, QueuedOperation>();
  const survivors: QueuedOperation[] = [];
  const discarded: QueuedOperation[] = [];

  for (const op of operations) {
    if (op.method === 'POST') {
      survivors.push(op);
      continue;
    }

    const key = `${op.method}:${op.url}`;
    const existing = byResource.get(key);
    if (!existing) {
      byResource.set(key, op);
      continue;
    }

    const { winner, loser } = ConflictResolver.resolve(existing, op);
    byResource.set(key, winner);
    discarded.push(loser);
  }

  survivors.push(...byResource.values());
  // Conservar el orden de encolado original entre las supervivientes.
  survivors.sort((a, b) => operations.indexOf(a) - operations.indexOf(b));
  return { survivors, discarded };
}

const GET_DEVICE_ID = () => {
  let id = localStorage.getItem('villaluz_device_id');
  if (!id) {
    id = `dev-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('villaluz_device_id', id);
  }
  return id;
};

function getFincaId(): number {
  try {
    return parseInt(localStorage.getItem('villaluz_finca_id') || '0', 10) || 0;
  } catch {
    return 0;
  }
}

function getPullCursorKey(fincaId: number, deviceId: string): string {
  return `${PULL_CURSOR_KEY_PREFIX}:${fincaId}:${deviceId}`;
}

class OfflineQueue {
  private isSyncing = false;
  private syncCallbacks: Array<(success: boolean, operation: QueuedOperation) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        setTimeout(() => this.syncQueue().catch(() => {}), 1000);
      });
    }
  }

  async enqueue(
    method: QueuedOperation['method'],
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<string> {
    const canonicalUrl = toRelativeApiPath(url);
    const { entityType, entityId } = inferEntityFromUrl(canonicalUrl);
    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      method,
      url: canonicalUrl,
      data,
      headers,
      retries: 0,
      maxRetries: MAX_RETRIES,
      status: 'pending',
      originDeviceId: GET_DEVICE_ID(),
      syncVersion: Date.now(),
      entityType,
      entityId,
      operation: inferOperation(method),
      payload: data
    };

    await dbPut(operation);

    if (typeof navigator !== 'undefined' && (navigator.onLine || FieldNodeService.getUrl()) && !this.isSyncing) {
      setTimeout(() => this.syncQueue().catch(() => {}), 500);
    }

    return operation.id;
  }

  async getPendingOperations(): Promise<QueuedOperation[]> {
    const all = await dbGetAll();
    return all.filter(op => op.status !== 'completed');
  }

  async getPendingCount(): Promise<number> {
    const all = await dbGetAll();
    return all.filter(op => op.status === 'pending').length;
  }

  async syncQueue(): Promise<void> {
    const isOnline = typeof navigator === 'undefined' || navigator.onLine;
    const hasFieldNode = Boolean(FieldNodeService.getUrl());
    const hasSameOriginApi = API_CONFIG.baseURL.startsWith('/');
    // navigator.onLine only describes internet reachability imperfectly. A
    // configured farm node is a valid route even when the browser reports no
    // internet, so do not abandon the queue in that case.
    if ((!isOnline && !hasFieldNode && !hasSameOriginApi)) return;

    if (this.isSyncing) {
      console.log('[OfflineQueue] syncQueue already running, skipping');
      return;
    }

    const pending = await this.getPendingOperations();
    if (pending.length === 0) return;

    this.isSyncing = true;

    try {

    const { survivors, discarded } = resolveQueueConflicts(pending);
    for (const loser of discarded) {
      await dbDelete(loser.id);
      this.notifyCallbacks(true, { ...loser, status: 'completed' });
    }

    for (const operation of survivors) {
      if (operation.status === 'syncing') continue;
      if (operation.nextAttemptAt && operation.nextAttemptAt > Date.now()) continue;

      operation.status = 'syncing';
      await dbPut(operation);

      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(operation.headers || {}),
        };

        const csrfToken = getCookie('csrf_access_token') ?? undefined;
        if (csrfToken) {
          headers['X-CSRF-Token'] = headers['X-CSRF-Token'] || csrfToken;
          headers['X-CSRF-TOKEN'] = headers['X-CSRF-TOKEN'] || csrfToken;
        }

        let res: { status: number };
        try {
          const primary = await apiFetch({
            url: toRelativeApiPath(operation.url),
            method: operation.method,
            data: operation.data,
            headers,
            withCredentials: true,
            validateStatus: () => true,
            // Avoid re-enqueue loops if replay still fails
            skipOffline: true,
          } as any);
          res = primary;
        } catch (primaryError) {
          if (!hasFieldNode) throw primaryError;

          // A device may have LAN reachability but no internet. Replay the
          // original domain mutation through the node, preserving method and
          // endpoint instead of only depositing an unapplied oplog record.
          await FieldNodeService.mutate(
            operation.method,
            toRelativeApiPath(operation.url),
            operation.data,
          );
          res = { status: 200 };
        }

        if (res.status >= 200 && res.status < 300) {
          operation.nextAttemptAt = undefined;
          await dbDelete(operation.id);
          this.notifyCallbacks(true, { ...operation, status: 'completed' });
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (error: any) {
        operation.retries++;
        operation.error = error.message || 'Error desconocido';

        const esErrorAuth = /401|403|unauthorized|forbidden|token.*expired|csrf/i.test(error.message || '');

        if (esErrorAuth) {
          operation.status = 'failed';
          operation.error = 'Sesión expirada - Requiring login';
          await dbPut(operation);
          this.notifyCallbacks(false, operation);
          try {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('sync-auth-error', { detail: { operationId: operation.id } }));
            }
          } catch { /* noop */ }
          continue;
        }

        if (operation.retries >= operation.maxRetries) {
          operation.status = 'failed';
          await dbPut(operation);
          this.notifyCallbacks(false, operation);
        } else {
          const backoffMs = Math.min(5 * 60 * 1000, 1000 * (2 ** Math.min(operation.retries, 8)));
          operation.nextAttemptAt = Date.now() + backoffMs;
          operation.status = 'pending';
          await dbPut(operation);
        }
      }
    }

    } finally {
      this.isSyncing = false;
    }

    const remaining = await this.getPendingCount();
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-synced', { detail: { remaining } }));
      }
    } catch { /* noop */ }
  }

  onSyncResult(callback: (success: boolean, operation: QueuedOperation) => void): () => void {
    this.syncCallbacks.push(callback);
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
    };
  }

  async clearCompleted(): Promise<void> {
    const all = await dbGetAll();
    for (const op of all) {
      if (op.status === 'completed') await dbDelete(op.id);
    }
  }

  async clearFailed(): Promise<void> {
    const all = await dbGetAll();
    for (const op of all) {
      if (op.status === 'failed') await dbDelete(op.id);
    }
  }

  async clearFailedOperations(): Promise<void> {
    return this.clearFailed();
  }

  async retryFailedOperations(): Promise<void> {
    const all = await dbGetAll();
    for (const op of all) {
      if (op.status === 'failed') {
        op.status = 'pending';
        op.retries = 0;
        op.error = undefined;
        op.nextAttemptAt = undefined;
        await dbPut(op);
      }
    }
    await this.syncQueue();
  }

  async resetStuckOperations(): Promise<number> {
    const all = await dbGetAll();
    const ahora = Date.now();
    let reseteadas = 0;

    for (const op of all) {
      const estaAtascada =
        (op.status === 'pending' && op.nextAttemptAt && op.nextAttemptAt - ahora > 60000) ||
        (op.status === 'pending' && op.retries > 3) ||
        op.status === 'failed';

      if (estaAtascada) {
        op.status = 'pending';
        op.retries = 0;
        op.nextAttemptAt = undefined;
        op.error = undefined;
        await dbPut(op);
        reseteadas++;
      }
    }

    if (reseteadas > 0) {
      console.log(`[OfflineQueue] ${reseteadas} operaciones atascadas reseteadas`);
      if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
        setTimeout(() => this.syncQueue().catch(() => {}), 100);
      }
    }

    return reseteadas;
  }

  async getStatusCounts(): Promise<{ pending: number; failed: number; syncing: boolean }> {
    const all = await dbGetAll();
    const pending = all.filter(op => op.status === 'pending').length;
    const failed = all.filter(op => op.status === 'failed').length;
    return { pending, failed, syncing: this.isSyncing };
  }

  /**
   * Verificar si una operación ya existe por su ID
   * Usado para sincronización Mesh/P2P
   */
  async hasOperation(id: string): Promise<boolean> {
    const all = await dbGetAll();
    return all.some(op => op.id === id);
  }

  /**
   * Agregar una operación recibida desde otro dispositivo (sincronización Mesh)
   * La operación viene con datos del dispositivo origen
   */
  async addOperation(operation: QueuedOperation & { source?: string; receivedFrom?: string; receivedAt?: string }): Promise<void> {
    // Verificar que no exista ya
    const exists = await this.hasOperation(operation.id);
    if (exists) {
      console.log(`[OfflineQueue] Operación ${operation.id} ya existe, ignorando duplicado`);
      return;
    }

    // Asegurar que la operación esté marcada como pendiente
    const opToAdd: QueuedOperation = {
      ...operation,
      status: 'pending',
      retries: 0,
      maxRetries: MAX_RETRIES,
      // Preservar metadata de sincronización
      originDeviceId: operation.originDeviceId || operation.receivedFrom || 'unknown',
      syncVersion: operation.syncVersion || Date.now()
    };

    await dbPut(opToAdd);
    console.log(`[OfflineQueue] Operación agregada desde Mesh: ${operation.id} (${operation.receivedFrom || 'unknown'})`);

    // Intentar sincronizar si estamos online
    if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
      setTimeout(() => this.syncQueue().catch(() => {}), 500);
    }
  }

  /**
   * Baja del servidor las operaciones que otros dispositivos de la misma finca
   * han sincronizado (POST /sync/pull) y las encola localmente.
   *
   * El cursor se guarda en localStorage para que cada llamada pida sólo lo
   * nuevo. Sin red devuelve 0 en lugar de propagar el error: quien llama es el
   * ciclo de sincronización en segundo plano.
   */
  async pullFromServer(limit = 100): Promise<{ received: number; hasMore: boolean }> {
    const fincaId = getFincaId();
    const deviceId = GET_DEVICE_ID();
    if (!fincaId || !deviceId) {
      return { received: 0, hasMore: false };
    }

    const cursorKey = getPullCursorKey(fincaId, deviceId);
    const lastCursor = parseInt(localStorage.getItem(cursorKey) || '0', 10);

    try {
      let responseBody: any;
      try {
        const response = await apiFetch({
          url: '/sync/pull',
          method: 'POST',
          data: { finca_id: fincaId, device_id: deviceId, last_cursor: lastCursor, limit },
        } as any);
        responseBody = (response as any).data;
      } catch (primaryError) {
        if (!FieldNodeService.getUrl()) throw primaryError;
        responseBody = await FieldNodeService.post('/sync/pull', {
          finca_id: fincaId,
          device_id: deviceId,
          last_cursor: lastCursor,
          limit,
        });
      }

      const body = responseBody?.data ?? responseBody ?? {};
      const operations: any[] = body.operations ?? [];

      for (const op of operations) {
        await this.addOperation({
          id: op.operation_id,
          timestamp: Date.parse(op.created_at_device || op.created_at || '') || Date.now(),
          method: OPERATION_METHODS[op.operation] || op.method || 'POST',
          url: op.url || (op.entity_type ? `/${String(op.entity_type).replace(/_/g, '-')}` : ''),
          data: op.payload,
          retries: 0,
          maxRetries: MAX_RETRIES,
          status: 'pending',
          entityType: op.entity_type,
          entityId: op.entity_id,
          originDeviceId: op.origin_device_id,
          syncVersion: op.logical_clock,
          receivedFrom: op.origin_device_id,
        } as QueuedOperation & { receivedFrom?: string });
      }

      if (body.next_cursor) {
        localStorage.setItem(cursorKey, String(body.next_cursor));
      }

      return { received: operations.length, hasMore: Boolean(body.has_more) };
    } catch {
      return { received: 0, hasMore: false };
    }
  }

  private notifyCallbacks(success: boolean, operation: QueuedOperation): void {
    this.syncCallbacks.forEach(cb => {
      try { cb(success, operation); } catch { /* noop */ }
    });
  }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;
