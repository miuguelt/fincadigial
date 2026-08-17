import type { TransportAdapter, TransportPacket, TransportPeer } from './TransportAdapter';

export class QrFileTransport implements TransportAdapter {
  readonly kind = 'qr-file' as const;

  async discover(): Promise<TransportPeer[]> {
    return [{ id: 'manual-file', name: 'Archivo .villaluzpack', kind: this.kind }];
  }

  async send(_peer: TransportPeer, packet: TransportPacket): Promise<{ accepted: boolean; receipt?: unknown }> {
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/vnd.villaluz.sync+json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${packet.packetId}.villaluzpack`;
    anchor.click();
    URL.revokeObjectURL(url);
    return { accepted: true, receipt: { exported: true, packetId: packet.packetId } };
  }

  async receive(payload: unknown): Promise<TransportPacket> {
    if (typeof payload === 'string') {
      return JSON.parse(payload) as TransportPacket;
    }
    return payload as TransportPacket;
  }
}
