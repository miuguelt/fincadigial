import type { TransportAdapter, TransportPacket, TransportPeer } from './TransportAdapter';

export class WebRtcManualTransport implements TransportAdapter {
  readonly kind = 'webrtc-manual' as const;

  async discover(): Promise<TransportPeer[]> {
    // WebRTC necesita senalizacion externa; se mantiene como fallback manual.
    return [];
  }

  async send(_peer: TransportPeer, _packet: TransportPacket): Promise<{ accepted: boolean; receipt?: unknown }> {
    return { accepted: false, receipt: { reason: 'manual_signaling_required' } };
  }
}

