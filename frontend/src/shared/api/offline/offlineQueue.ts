import { API_CONFIG } from '@/shared/api/config';
import { toRelativeApiPath } from '@/shared/api/urlUtils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';
import { FieldNodeService } from './FieldNodeService';
import { dbDelete, dbGetAll, dbPut } from './queue/queueDb';
import { resolveQueueConflicts } from './queue/queueConflicts';
import {
  getDeviceId,
  getFincaId,
  getPullCursorKey,
  inferEntityFromUrl,
  inferOperation,
} from './queue/queueIdentity';
import { fetchPullBatch } from './queue/queuePull';
import { applyOperationFailure, sendOperation } from './queue/queueSync';
import { MAX_RETRIES, type QueuedOperation } from './queue/types';

export type { QueuedOperation } from './queue/types';
export { resolveQueueConflicts } from './queue/queueConflicts';

/**
 * Cola de escrituras pendientes cuando la finca se queda sin conexión.
 *
 * Coordina persistencia (`queue/queueDb`), resolución de conflictos
 * (`queue/queueConflicts`), envío (`queue/queueSync`) y descarga de cambios de
 * otros dispositivos (`queue/queuePull`).
 */
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
      originDeviceId: getDeviceId(),
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
    let appliedServerChanges = false;

    try {
      const { survivors, discarded } = resolveQueueConflicts(pending);
      for (const loser of discarded) {
        await dbDelete(loser.id);
        this.notifyCallbacks(true, { ...loser, status: 'completed' });
      }

      for (const operation of survivors) {
        if (operation.status === 'syncing') continue;
        if (operation.nextAttemptAt && operation.nextAttemptAt > Date.now()) continue;

        const applied = await this.replayOperation(operation, hasFieldNode);
        if (applied) appliedServerChanges = true;
      }
    } finally {
      this.isSyncing = false;
    }

    const remaining = await this.getPendingCount();
    if (appliedServerChanges) emitDataRefresh();
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-queue-synced', { detail: { remaining } }));
      }
    } catch { /* noop */ }
  }

  /** Reenvía una operación y actualiza su estado. Devuelve true si el servidor la aplicó. */
  private async replayOperation(operation: QueuedOperation, hasFieldNode: boolean): Promise<boolean> {
    operation.status = 'syncing';
    await dbPut(operation);

    try {
      const res = await sendOperation(operation, hasFieldNode);

      if (res.status >= 200 && res.status < 300) {
        operation.nextAttemptAt = undefined;
        await dbDelete(operation.id);
        this.notifyCallbacks(true, { ...operation, status: 'completed' });
        return true;
      }

      throw new Error(`HTTP ${res.status}`);
    } catch (error: any) {
      const outcome = applyOperationFailure(operation, error);
      await dbPut(operation);

      if (outcome === 'auth') {
        this.notifyCallbacks(false, operation);
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sync-auth-error', { detail: { operationId: operation.id } }));
          }
        } catch { /* noop */ }
      } else if (outcome === 'failed') {
        this.notifyCallbacks(false, operation);
      }

      return false;
    }
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
    const deviceId = getDeviceId();
    if (!fincaId || !deviceId) {
      return { received: 0, hasMore: false };
    }

    const cursorKey = getPullCursorKey(fincaId, deviceId);
    const lastCursor = parseInt(localStorage.getItem(cursorKey) || '0', 10);

    try {
      const batch = await fetchPullBatch({ fincaId, deviceId, lastCursor, limit });

      for (const op of batch.operations) {
        await this.addOperation(op);
      }

      if (batch.nextCursor) {
        localStorage.setItem(cursorKey, batch.nextCursor);
      }

      return { received: batch.operations.length, hasMore: batch.hasMore };
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
