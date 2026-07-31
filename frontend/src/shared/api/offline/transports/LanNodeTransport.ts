import { API_CONFIG } from '@/shared/api/config';
import { FieldNodeService } from '../FieldNodeService';
import type { TransportAdapter, TransportPacket, TransportPeer } from './TransportAdapter';

const DEFAULT_NODE_ENDPOINT = '/api/v1/sync';

export class LanNodeTransport implements TransportAdapter {
  readonly kind = 'lan' as const;

  constructor(private readonly endpoint = '') {}

  async discover(): Promise<TransportPeer[]> {
    const base = this.resolveEndpoint();
    try {
      const res = await fetch(`${base}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json', ...this.authHeaders() },
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) return [];
      return [{ id: base, name: 'Nodo Villa Luz Local', kind: this.kind, endpoint: base, lastSeenAt: new Date().toISOString() }];
    } catch {
      return [];
    }
  }

  async send(peer: TransportPeer, packet: TransportPacket): Promise<{ accepted: boolean; receipt?: unknown }> {
    const endpoint = peer.endpoint || this.resolveEndpoint();
    const res = await fetch(`${endpoint}/push`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...this.authHeaders() },
      body: JSON.stringify({
        device_id: packet.deviceId,
        finca_id: packet.fincaId,
        operations: packet.operations,
      }),
    });
    const receipt = await res.json().catch(() => null);
    return { accepted: res.ok, receipt };
  }

  async pull(peer: TransportPeer, deviceId: string, fincaId?: number, lastCursor = 0): Promise<unknown> {
    const endpoint = peer.endpoint || this.resolveEndpoint();
    const res = await fetch(`${endpoint}/pull`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...this.authHeaders() },
      body: JSON.stringify({ device_id: deviceId, finca_id: fincaId, last_cursor: lastCursor }),
    });
    return res.json().catch(() => null);
  }

  private authHeaders(): Record<string, string> {
    try {
      const token = localStorage.getItem(API_CONFIG.authStorageKey)
        || localStorage.getItem('access_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  }

  private resolveEndpoint() {
    const configured = this.endpoint || FieldNodeService.getUrl();
    if (configured.startsWith('http')) {
      const base = configured.replace(/\/$/, '');
      return base.endsWith('/sync') ? base : `${base}/sync`;
    }
    const relative = configured || DEFAULT_NODE_ENDPOINT;
    return `${API_CONFIG.baseURL.replace(/\/$/, '')}${relative.replace(/^\/api\/v1/, '')}`;
  }
}
