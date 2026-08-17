import { apiFetch } from '@/shared/api/apiFetch';
import { FieldNodeService } from '../FieldNodeService';
import { MAX_RETRIES, OPERATION_METHODS, type QueuedOperation } from './types';

/**
 * Descarga (POST /sync/pull) las operaciones que otros dispositivos de la misma
 * finca ya sincronizaron, y las traduce al formato local de la cola.
 */
export type PullRequest = {
  fincaId: number;
  deviceId: string;
  lastCursor: number;
  limit: number;
};

export type PullBatch = {
  operations: Array<QueuedOperation & { receivedFrom?: string }>;
  nextCursor?: string;
  hasMore: boolean;
};

const toQueuedOperation = (op: any): QueuedOperation & { receivedFrom?: string } => ({
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
});

export async function fetchPullBatch(request: PullRequest): Promise<PullBatch> {
  const { fincaId, deviceId, lastCursor, limit } = request;
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

  return {
    operations: operations.map(toQueuedOperation),
    nextCursor: body.next_cursor ? String(body.next_cursor) : undefined,
    hasMore: Boolean(body.has_more),
  };
}
