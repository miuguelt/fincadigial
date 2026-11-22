import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { dbGetAll, dbPut, dbDelete } from '@/shared/api/offline/queue/queueDb';
import { resolveQueueConflicts } from '@/shared/api/offline/queue/queueConflicts';
import type { QueuedOperation } from '@/shared/api/offline/queue/types';
import * as apiFetchModule from '@/shared/api/apiFetch';

vi.mock('@/shared/api/apiFetch', () => ({
  apiFetch: vi.fn(),
}));

describe('OfflineQueue - Resiliencia y Sincronización Rural', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Limpiar elementos previos en IndexedDB
    const all = await dbGetAll();
    for (const op of all) {
      await dbDelete(op.id);
    }
  });

  it('debe encolar operaciones correctamente en IndexedDB con metadatos de entidad', async () => {
    const opId1 = await offlineQueue.enqueue('POST', '/api/v1/animals', {
      record: 'NOV-102',
      weight: 350,
    });
    const opId2 = await offlineQueue.enqueue('PUT', '/api/v1/paddocks/4', {
      status: 'Ocupado',
    });

    expect(opId1).toBeDefined();
    expect(opId2).toBeDefined();

    const pending = await offlineQueue.getPendingOperations();
    expect(pending.length).toBe(2);

    const animalOp = pending.find((op) => op.id === opId1);
    expect(animalOp?.method).toBe('POST');
    expect(animalOp?.entityType).toBe('animals');
    expect(animalOp?.status).toBe('pending');

    const paddockOp = pending.find((op) => op.id === opId2);
    expect(paddockOp?.method).toBe('PUT');
    expect(paddockOp?.entityType).toBe('paddocks');
    expect(paddockOp?.entityId).toBe('4');

    const counts = await offlineQueue.getStatusCounts();
    expect(counts.pending).toBe(2);
    expect(counts.failed).toBe(0);
    expect(counts.syncing).toBe(false);
  });

  it('debe resolver conflictos Last-Write-Wins en cola preservando POSTs independientes', () => {
    const postOp1: QueuedOperation = {
      id: 'op-post-1',
      timestamp: 1000,
      method: 'POST',
      url: '/api/v1/milk-production',
      data: { liters: 12.5 },
      retries: 0,
      maxRetries: 3,
      status: 'pending',
      originDeviceId: 'dev-1',
      syncVersion: 1000,
      entityType: 'milk-production',
      operation: 'create',
    };

    const postOp2: QueuedOperation = {
      id: 'op-post-2',
      timestamp: 1010,
      method: 'POST',
      url: '/api/v1/milk-production',
      data: { liters: 14.0 },
      retries: 0,
      maxRetries: 3,
      status: 'pending',
      originDeviceId: 'dev-2',
      syncVersion: 1010,
      entityType: 'milk-production',
      operation: 'create',
    };

    const putOld: QueuedOperation = {
      id: 'op-put-old',
      timestamp: 1000,
      method: 'PUT',
      url: '/api/v1/animals/55',
      data: { weight: 420 },
      retries: 0,
      maxRetries: 3,
      status: 'pending',
      originDeviceId: 'dev-1',
      syncVersion: 1000,
      entityType: 'animals',
      entityId: '55',
      operation: 'update',
    };

    const putNew: QueuedOperation = {
      id: 'op-put-new',
      timestamp: 2000,
      method: 'PUT',
      url: '/api/v1/animals/55',
      data: { weight: 435 },
      retries: 0,
      maxRetries: 3,
      status: 'pending',
      originDeviceId: 'dev-1',
      syncVersion: 2000,
      entityType: 'animals',
      entityId: '55',
      operation: 'update',
    };

    const { survivors, discarded } = resolveQueueConflicts([postOp1, postOp2, putOld, putNew]);

    // Los dos POST se conservan porque son registros independientes
    expect(survivors.some((o) => o.id === 'op-post-1')).toBe(true);
    expect(survivors.some((o) => o.id === 'op-post-2')).toBe(true);

    // Del PUT sobre animals/55 solo debe sobrevivir el más reciente (putNew)
    expect(survivors.some((o) => o.id === 'op-put-new')).toBe(true);
    expect(survivors.some((o) => o.id === 'op-put-old')).toBe(false);
    expect(discarded.some((o) => o.id === 'op-put-old')).toBe(true);
  });

  it('debe sincronizar la cola exitosamente y despachar eventos de sincronización', async () => {
    vi.mocked(apiFetchModule.apiFetch).mockResolvedValue({ status: 200 } as any);

    await offlineQueue.enqueue('POST', '/api/v1/treatments', {
      animal_id: 12,
      product: 'Ivermectina 1%',
      dose: '10ml',
    });

    const eventSpy = vi.fn();
    window.addEventListener('offline-queue-synced', eventSpy);

    await offlineQueue.syncQueue();

    const pendingAfter = await offlineQueue.getPendingCount();
    expect(pendingAfter).toBe(0);
    expect(eventSpy).toHaveBeenCalled();

    window.removeEventListener('offline-queue-synced', eventSpy);
  });

  it('debe permitir reintentar operaciones fallidas y limpiar la cola', async () => {
    const failedOp: QueuedOperation = {
      id: 'op-failed-1',
      timestamp: Date.now(),
      method: 'POST',
      url: '/api/v1/controls',
      data: { notes: 'Revisión pezuña' },
      retries: 3,
      maxRetries: 3,
      status: 'failed',
      error: 'HTTP 500 Internal Error',
      originDeviceId: 'tablet-01',
      syncVersion: Date.now(),
      entityType: 'controls',
      operation: 'create',
    };

    await dbPut(failedOp);

    let counts = await offlineQueue.getStatusCounts();
    expect(counts.failed).toBe(1);

    await offlineQueue.clearFailed();
    counts = await offlineQueue.getStatusCounts();
    expect(counts.failed).toBe(0);
  });
});
