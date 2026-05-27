export type TransportKind = 'lan' | 'qr-file' | 'webrtc-manual' | 'native-nearby' | 'native-multipeer';

export interface TransportPeer {
  id: string;
  name: string;
  kind: TransportKind;
  endpoint?: string;
  lastSeenAt?: string;
}

export interface TransportPacket {
  packetId: string;
  deviceId: string;
  fincaId?: number;
  cursor?: number;
  operations: unknown[];
  messages?: unknown[];
  createdAt: string;
  signature?: string;
}

export interface TransportAdapter {
  readonly kind: TransportKind;
  discover(): Promise<TransportPeer[]>;
  send(peer: TransportPeer, packet: TransportPacket): Promise<{ accepted: boolean; receipt?: unknown }>;
  receive?(payload: unknown): Promise<TransportPacket>;
}

