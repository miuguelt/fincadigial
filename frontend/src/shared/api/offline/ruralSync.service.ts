import api from '@/shared/api/client';
import { offlineQueue } from './offlineQueue';
import type { TransportPacket } from './transports';

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
    const { data } = await api.post('/sync/push', {
      device_id: getDeviceId(),
      finca_id: fincaId,
      operations: operations.map((op) => ({
        operation_id: op.operation_id || op.id,
        entity_type: op.entity_type || 'http_request',
        entity_id: op.entity_id,
        operation: op.operation || op.method,
        payload: op.data,
        base_version: op.base_version,
        origin_device_id: op.originDeviceId || getDeviceId(),
        created_at_device: new Date(op.timestamp).toISOString(),
      })),
    });
    return data;
  },

  async pull(lastCursor = 0, fincaId?: number) {
    const { data } = await api.post('/sync/pull', {
      device_id: getDeviceId(),
      finca_id: fincaId,
      last_cursor: lastCursor,
    });
    return data;
  },

  async buildPacket(fincaId?: number): Promise<TransportPacket> {
    return {
      packetId: `villaluz-${Date.now()}`,
      deviceId: getDeviceId(),
      fincaId,
      operations: await offlineQueue.getPendingOperations(),
      createdAt: new Date().toISOString(),
    };
  },
};

