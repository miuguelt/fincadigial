import type { TransportAdapter, TransportPacket, TransportPeer } from './TransportAdapter';

class UnavailableNativeTransport implements TransportAdapter {
  constructor(readonly kind: 'native-nearby' | 'native-multipeer') {}

  async discover(): Promise<TransportPeer[]> {
    return [];
  }

  async send(_peer: TransportPeer, _packet: TransportPacket): Promise<{ accepted: boolean; receipt?: unknown }> {
    return { accepted: false, receipt: { reason: 'native_bridge_unavailable' } };
  }
}

export const NativeNearbyTransport = new UnavailableNativeTransport('native-nearby');
export const NativeMultipeerTransport = new UnavailableNativeTransport('native-multipeer');

