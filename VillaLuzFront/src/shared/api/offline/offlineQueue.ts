import { getCookie } from '@/shared/utils/cookieUtils';
import { apiFetch } from '@/shared/api/apiFetch';

export interface QueuedOperation {
  id: string;
  timestamp: number;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  retries: number;
  maxRetries: number;
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
const MAX_RETRIES = 3;

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

function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
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

const GET_DEVICE_ID = () => {
  let id = localStorage.getItem('villaluz_device_id');
  if (!id) {
    id = `dev-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('villaluz_device_id', id);
  }
  return id;
};

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
    const { entityType, entityId } = inferEntityFromUrl(url);
    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      method,
      url,
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

    if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
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
    if (this.isSyncing || !isOnline) return;

    const pending = await this.getPendingOperations();
    if (pending.length === 0) return;

    this.isSyncing = true;

    for (const operation of pending) {
      if (operation.status === 'syncing') continue;

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

        const res = await apiFetch({
          url: operation.url,
          method: operation.method,
          data: operation.data,
          headers,
          withCredentials: true,
          validateStatus: () => true,
        } as any);

        if (res.status >= 200 && res.status < 300) {
          await dbDelete(operation.id);
          this.notifyCallbacks(true, { ...operation, status: 'completed' });
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (error: any) {
        operation.retries++;
        operation.error = error.message || 'Error desconocido';

        if (operation.retries >= operation.maxRetries) {
          operation.status = 'failed';
          await dbPut(operation);
          this.notifyCallbacks(false, operation);
        } else {
          operation.status = 'pending';
          await dbPut(operation);
        }
      }
    }

    this.isSyncing = false;

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
        await dbPut(op);
      }
    }
    await this.syncQueue();
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

  private notifyCallbacks(success: boolean, operation: QueuedOperation): void {
    this.syncCallbacks.forEach(cb => {
      try { cb(success, operation); } catch { /* noop */ }
    });
  }
}

export const offlineQueue = new OfflineQueue();
export default offlineQueue;
