/**
 * WebRTC DataChannel Manager para comunicación P2P en Finca Villa Luz.
 * Permite enviar paquetes de datos (mensajes, fotos, registros) directamente entre dispositivos.
 */
export class P2PConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]; // STUN público (o local si se configura)

  constructor() {
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
  }

  /**
   * Crea una oferta de conexión para otro dispositivo
   */
  async createOffer() {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('VillaLuzSync');
    this.setupDataChannel();

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // En un entorno offline, este 'offer' debe enviarse al otro dispositivo
    // mediante Bluetooth, QR o mDNS local.
    return offer;
  }

  /**
   * Responde a una oferta recibida
   */
  async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return answer;
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('[P2P] Canal de datos abierto. Sincronizando...');
      this.startSync();
    };

    this.dataChannel.onmessage = (event) => {
      this.handleIncomingData(JSON.parse(event.data));
    };

    this.dataChannel.onclose = () => console.log('[P2P] Canal cerrado.');
  }

  private async startSync() {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;

    // Obtener datos pendientes de IndexedDB
    // Enviar en trozos para no saturar el canal local
    const data = { type: 'chat_sync', payload: [] }; // Placeholder para datos reales
    this.dataChannel.send(JSON.stringify(data));
  }

  private handleIncomingData(data: any) {
    console.log('[P2P] Datos recibidos:', data);
    // Integrar con el sistema offline local para actualizar la base de datos
  }
}

export const p2pManager = new P2PConnectionManager();
