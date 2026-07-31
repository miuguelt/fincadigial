import api from '@/shared/api/client';
import { offlineQueue } from './offlineQueue';
import type { TransportPacket } from './transports';
import { FieldNodeService } from './FieldNodeService';

const getDeviceId = () => {
  let id = localStorage.getItem('villaluz_device_id');
  if (!id) {
    id = `dev-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    localStorage.setItem('villaluz_device_id', id);
  }
  return id;
};

export const ruralSyncService = {
  getDeviceId,

  async registerDevice(name = navigator.userAgent.slice(0, 80), fincaId?: number) {
    const { data } = await api.post('/devices/register', {
      device_id: getDeviceId(),
      name,
      platform: navigator.platform,
      finca_id: fincaId,
    });
    return data;
  },

  async pushPending(fincaId?: number) {
    const operations = await offlineQueue.getPendingOperations();
    const payload = {
      device_id: getDeviceId(),
      finca_id: fincaId,
      operations: operations.map((op: any) => ({
        operation_id: op.operation_id || op.id,
        entity_type: op.entity_type || 'http_request',
        entity_id: op.entity_id,
        operation: op.operation || op.method,
        payload: op.data,
        base_version: op.base_version,
        origin_device_id: op.originDeviceId || getDeviceId(),
        created_at_device: new Date(op.timestamp).toISOString(),
      })),
    };
    try {
      const { data } = await api.post('/sync/push', payload);
      return data;
    } catch (primaryError) {
      try {
        return await FieldNodeService.post('/sync/push', payload);
      } catch {
        throw primaryError;
      }
    }
  },

  async pull(lastCursor = 0, fincaId?: number) {
    const payload = {
      device_id: getDeviceId(),
      finca_id: fincaId,
      last_cursor: lastCursor,
    };
    try {
      const { data } = await api.post('/sync/pull', payload);
      return data;
    } catch (primaryError) {
      try {
        return await FieldNodeService.post('/sync/pull', payload);
      } catch {
        throw primaryError;
      }
    }
  },

  async buildPacket(fincaId?: number): Promise<TransportPacket> {
    const deviceId = getDeviceId();
    const pending = await offlineQueue.getPendingOperations();
    return {
      packetId: `villaluz-${Date.now()}`,
      deviceId,
      fincaId,
      // Transport packets use the protocol-v2 shape. Keeping the original
      // HTTP URL and method is what lets a gateway replay every domain write
      // instead of treating it as an opaque generic operation.
      operations: pending.map((op: any) => ({
        operation_id: op.operation_id || op.id,
        entity_type: op.entityType || op.entity_type || 'http_request',
        entity_id: op.entityId || op.entity_id,
        operation: op.operation || op.method?.toLowerCase(),
        url: op.url,
        method: op.method,
        payload: op.payload ?? op.data,
        base_version: op.baseVersion ?? op.base_version,
        logical_clock: op.logicalClock ?? op.syncVersion,
        priority: op.priority ?? 100,
        origin_device_id: op.originDeviceId || deviceId,
        created_at_device: new Date(op.timestamp || Date.now()).toISOString(),
      })),
      createdAt: new Date().toISOString(),
    };
  },
};

