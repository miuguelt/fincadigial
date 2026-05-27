import { API_CONFIG } from '@/shared/api/config';
import type { TransportAdapter, TransportPacket, TransportPeer } from './TransportAdapter';

const DEFAULT_NODE_ENDPOINT = '/api/v1/sync';

export class LanNodeTransport implements TransportAdapter {
  readonly kind = 'lan' as const;

  constructor(private readonly endpoint = DEFAULT_NODE_ENDPOINT) {}

  async discover(): Promise<TransportPeer[]> {
    const base = this.resolveEndpoint();
    try {
      const res = await fetch(`${base}/health`, { method: 'GET' });
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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        device_id: packet.deviceId,
        finca_id: packet.fincaId,
        operations: packet.operations,
      }),
    });
    const receipt = await res.json().catch(() => null);
    return { accepted: res.ok, receipt };
  }

  private resolveEndpoint() {
    if (this.endpoint.startsWith('http')) return this.endpoint;
    return `${API_CONFIG.baseURL.replace(/\/$/, '')}${this.endpoint.replace(/^\/api\/v1/, '')}`;
  }
}

