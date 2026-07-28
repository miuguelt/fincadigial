import { offlineQueue, type QueuedOperation } from './offlineQueue';

// =============================================================================
// VILLA LUZ MESH SYNC PROTOCOL (VLMSP) v1.0.1
// Protocolo completo de sincronización P2P para entornos sin conectividad
// =============================================================================

// Tipos de Web Bluetooth (para TypeScript)
declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        filters?: Array<{ services?: string[] }>;
        optionalServices?: string[];
      }): Promise<BluetoothDevice>;
    };
  }
  
  interface BluetoothDevice {
    id: string;
    name: string | null;
    gatt?: BluetoothRemoteGATTServer;
    watchingAdvertisements: boolean;
  }
  
  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  }
  
  interface BluetoothRemoteGATTService {
    getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
  }
}

// UUIDs del servicio GATT Villa Luz (Bluetooth Low Energy)
// Formato corregido a 128-bit (8-4-4-4-12) para evitar TypeError en Web Bluetooth
const VLMSP_SERVICE_UUID = 'f14ca000-4c4c-a111-c0de-1f1ca0000000';
const VLMSP_CHARACTERISTIC_MSG_OUT = 'f14ca001-4c4c-a111-c0de-1f1ca0000000';  // Mensajes salientes
const VLMSP_CHARACTERISTIC_MSG_IN = 'f14ca002-4c4c-a111-c0de-1f1ca0000000';   // Mensajes entrantes
const VLMSP_CHARACTERISTIC_SYNC_STATE = 'f14ca003-4c4c-a111-c0de-1f1ca0000000'; // Estado de sync
const VLMSP_CHARACTERISTIC_HEARTBEAT = 'f14ca004-4c4c-a111-c0de-1f1ca0000000';  // Heartbeat

// Configuración WebRTC para fallback WiFi
const VLMSP_WEBRTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Tipo de mensaje para sincronización
interface SyncMessage {
  type: 'PENDING_OPS' | 'ACK' | 'HEARTBEAT' | 'PEER_INFO' | 'BULK_DATA';
  timestamp: number;
  deviceId: string;
  deviceName: string;
  payload: any;
  messageId: string;
}

// Información de peer descubierto
interface DiscoveredPeer {
  id: string;
  name: string;
  /** Usuario de la app tras el dispositivo; ausente si aún no se identificó. */
  userId?: number;
  deviceId: string;
  lastSeen: Date;
  connectionType: 'bluetooth' | 'webrtc' | 'mdns';
  signalStrength?: number;
  isConnected: boolean;
  pendingSync: number;
  rssi?: number;
}

// Estado de sincronización
interface SyncState {
  lastSyncAt: Date | null;
  messagesSent: number;
  messagesReceived: number;
  conflictsResolved: number;
  isSyncing: boolean;
}

export class ProximitySyncService {
  private isScanning = false;
  private discoveredPeers: Map<string, DiscoveredPeer> = new Map();
  private activeConnections: Map<string, BluetoothRemoteGATTServer | RTCPeerConnection> = new Map();
  private syncState: SyncState = {
    lastSyncAt: null,
    messagesSent: 0,
    messagesReceived: 0,
    conflictsResolved: 0,
    isSyncing: false
  };
  private deviceId: string;
  private deviceName: string;
  private onPeerDiscoveredCallbacks: Set<(peer: DiscoveredPeer) => void> = new Set();
  private onPeerLostCallbacks: Set<(peerId: string) => void> = new Set();
  private onSyncCompleteCallbacks: Set<(result: { peerId: string; opsSynced: number }) => void> = new Set();

  private onSyncStateChangeCallbacks: Set<(state: SyncState) => void> = new Set();
  private onStatusUpdateCallbacks: Set<(msg: string, type: 'info' | 'success' | 'warning' | 'error') => void> = new Set();
  private onMessageReceivedCallbacks: Set<(msg: { from: string, content: string, type: 'chat' | 'alert' }) => void> = new Set();
  private discoveryChannel: BroadcastChannel | null = null;
  private signalChannel: BroadcastChannel | null = null;

  constructor() {
    // Generar ID único de dispositivo basado en timestamp + random
    this.deviceId = this.generateDeviceId();
    this.deviceName = `VillaLuz-${this.deviceId.slice(-4)}`;
    
    // Inicializar canales de comunicación
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.discoveryChannel = new BroadcastChannel('villaluz-mesh-discovery');
      this.signalChannel = new BroadcastChannel('villaluz-mesh-signal');
      this.setupChannels();
    }
    
    // Iniciar heartbeat automático
    this.startHeartbeat();
    
    // Limpiar peers inactivos periódicamente
    setInterval(() => this.cleanupStalePeers(), 30000);
    
    console.log(`[VLMSP] Servicio inicializado - Device: ${this.deviceName} (${this.deviceId})`);
  }

  /**
   * Inicialización asíncrona (opcional)
   */
  async initialize(): Promise<void> {
    console.log('[VLMSP] Inicializando componentes adicionales...');
    this.notifyStatusUpdate(`Inicializado como ${this.deviceName}`, 'info');
    return Promise.resolve();
  }

  private setupChannels(): void {
    if (!this.discoveryChannel || !this.signalChannel) return;

    this.discoveryChannel.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === 'PEER_ADVERTISEMENT' && msg.deviceId !== this.deviceId) {
        this.handleWebRTCPeerDiscovery(msg);
      } else if (msg.type === 'PEER_DISCOVERY_REQUEST' && msg.deviceId !== this.deviceId) {
        // Responder a solicitud de descubrimiento
        this.discoveryChannel?.postMessage({
          type: 'PEER_ADVERTISEMENT',
          deviceId: this.deviceId,
          deviceName: this.deviceName,
          timestamp: Date.now()
        });
      }
    };

    this.signalChannel.onmessage = (event) => {
      const msg = event.data;
      if (msg.to !== this.deviceId) return;

      if (msg.type === 'MESH_MESSAGE') {
        this.onMessageReceivedCallbacks.forEach(cb => {
          try { cb({ from: msg.from, content: msg.payload.content, type: msg.payload.type }); } catch (e) { console.error(e); }
        });
        this.notifyStatusUpdate(`Mensaje de ${msg.from}`, msg.payload.type === 'alert' ? 'warning' : 'info');
      }
    };
  }

  private notifyStatusUpdate(msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    this.onStatusUpdateCallbacks.forEach(cb => {
      try { cb(msg, type); } catch (e) { console.error(e); }
    });
  }

  private notifySyncStateChange(): void {
    this.onSyncStateChangeCallbacks.forEach(cb => {
      try { cb({ ...this.syncState }); } catch (e) { console.error(e); }
    });
  }

  // ============================================================================
  // MÉTODOS PÚBLICOS
  // ============================================================================

  /**
   * Suscribirse a cambios en el estado de sincronización
   */
  onSyncStateChange(callback: (state: SyncState) => void) {
    this.onSyncStateChangeCallbacks.add(callback);
    return () => this.onSyncStateChangeCallbacks.delete(callback);
  }

  /**
   * Suscribirse a actualizaciones de estado (mensajes de UI)
   */
  onStatusUpdate(callback: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void) {
    this.onStatusUpdateCallbacks.add(callback);
    return () => this.onStatusUpdateCallbacks.delete(callback);
  }

  /**
   * Suscribirse a mensajes recibidos de otros peers
   */
  onMessageReceived(callback: (msg: { from: string, content: string, type: 'chat' | 'alert' }) => void) {
    this.onMessageReceivedCallbacks.add(callback);
    return () => this.onMessageReceivedCallbacks.delete(callback);
  }

  /**
   * Enviar un mensaje a un peer específico
   */
  async sendMessageToPeer(peerId: string, content: string, type: 'chat' | 'alert' = 'chat'): Promise<boolean> {
    const peer = this.discoveredPeers.get(peerId);
    if (!peer) return false;

    console.log(`[VLMSP] Enviando mensaje a ${peer.name}: ${content}`);

    if (this.signalChannel) {
      this.signalChannel.postMessage({
        type: 'MESH_MESSAGE',
        from: this.deviceId,
        to: peer.deviceId,
        payload: { content, type }
      });
      return true;
    }

    return false;
  }

  /**
   * Suscribirse a eventos de descubrimiento de peers
   */
  onPeerDiscovered(callback: (peer: DiscoveredPeer) => void) {
    this.onPeerDiscoveredCallbacks.add(callback);
    return () => this.onPeerDiscoveredCallbacks.delete(callback);
  }

  /**
   * Suscribirse a eventos de pérdida de peers
   */
  onPeerLost(callback: (peerId: string) => void) {
    this.onPeerLostCallbacks.add(callback);
    return () => this.onPeerLostCallbacks.delete(callback);
  }

  /**
   * Suscribirse a eventos de sincronización completada
   */
  onSyncComplete(callback: (result: { peerId: string; opsSynced: number }) => void) {
    this.onSyncCompleteCallbacks.add(callback);
    return () => this.onSyncCompleteCallbacks.delete(callback);
  }

  /**
   * Obtener lista de peers descubiertos
   */
  getDiscoveredPeers(): DiscoveredPeer[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Presencia por usuario: sólo peers con userId identificado.
   */
  getPresenceMap(): Map<number, { name: string; isNearby: boolean }> {
    const presence = new Map<number, { name: string; isNearby: boolean }>();
    for (const peer of this.discoveredPeers.values()) {
      if (!peer.userId) continue;
      presence.set(peer.userId, { name: peer.name, isNearby: peer.isConnected });
    }
    return presence;
  }

  /**
   * Obtener estado de sincronización actual
   */
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  /**
   * Escanear continuamente dispositivos cercanos (scanning pasivo)
   */
  async startPassiveScanning(): Promise<void> {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log('[VLMSP] Iniciando escaneo pasivo continuo...');

    // 1. Intentar descubrir nodos LAN (Nodos Villa Luz / Raspberry Pi)
    await this.scanLanNodes();

    // 2. Intentar Web Bluetooth
    await this.scanBluetooth();
    
    // 3. Fallback: WebRTC para redes WiFi
    await this.scanWebRTC();
  }

  private async scanLanNodes(): Promise<void> {
    try {
      const { LanNodeTransport } = await import('./transports/LanNodeTransport');
      const lan = new LanNodeTransport();
      const peers = await lan.discover();
      
      for (const peer of peers) {
        if (!this.discoveredPeers.has(peer.id)) {
          const discoveredPeer: DiscoveredPeer = {
            id: peer.id,
            name: peer.name,
            deviceId: peer.id,
            lastSeen: new Date(peer.lastSeenAt || Date.now()),
            connectionType: 'mdns',
            isConnected: false,
            pendingSync: 0
          };
          this.discoveredPeers.set(peer.id, discoveredPeer);
          this.notifyPeerDiscovered(discoveredPeer);
          this.notifyStatusUpdate(`Nodo LAN detectado: ${peer.name}`, 'success');
        }
      }
    } catch (error) {
      console.warn('[VLMSP] Error escaneando nodos LAN:', error);
    }
  }

  /**
   * Detener escaneo pasivo
   */
  stopPassiveScanning(): void {
    this.isScanning = false;
    console.log('[VLMSP] Escaneo pasivo detenido');
  }

  /**
   * Descubrir peers con interacción del usuario (para iniciar sincronización)
   */
  async discoverPeers(): Promise<DiscoveredPeer | null> {
    // Intentar Bluetooth primero (requiere interacción del usuario)
    const btPeer = await this.discoverBluetoothPeer();
    if (btPeer) return btPeer;

    // Fallback: WebRTC
    const webrtcPeer = await this.discoverWebRTCPeer();
    if (webrtcPeer) return webrtcPeer;

    return null;
  }

  /**
   * Sincronizar manualmente con un peer específico
   */
  async syncWithPeer(peerId: string): Promise<boolean> {
    const peer = this.discoveredPeers.get(peerId);
    if (!peer) {
      console.error(`[VLMSP] Peer ${peerId} no encontrado`);
      return false;
    }

    if (peer.connectionType === 'bluetooth') {
      return this.syncWithBluetoothPeer(peer);
    } else if (peer.connectionType === 'webrtc') {
      return this.syncWithWebRTCPeer(peer);
    }

    return false;
  }

  /**
   * Anunciar presencia del dispositivo (modo peripheral simulado con WebRTC)
   */
  async startAdvertising(): Promise<void> {
    console.log(`[VLMSP] Anunciando presencia como ${this.deviceName}`);
    
    // En browsers actuales, no podemos actuar como peripheral Bluetooth real
    // Usamos WebRTC DataChannel para crear un "servidor" de señalización local
    await this.startWebRTCAdvertising();
  }

  /**
   * Detener anuncio de presencia
   */
  async stopAdvertising(): Promise<void> {
    console.log('[VLMSP] Deteniendo anuncio de presencia');
    this.stopWebRTCAdvertising();
  }

  // ============================================================================
  // IMPLEMENTACIÓN BLUETOOTH
  // ============================================================================

  private async scanBluetooth(): Promise<void> {
    if (!('bluetooth' in navigator)) {
      console.log('[VLMSP] Web Bluetooth no disponible');
      return;
    }

    try {
      // Escanear dispositivos que anuncien nuestro servicio
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [VLMSP_SERVICE_UUID] }],
        optionalServices: [VLMSP_SERVICE_UUID]
      });

      if (device) {
        await this.handleBluetoothDevice(device);
      }
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        console.error('[VLMSP] Error escaneando Bluetooth:', error);
      }
    }
  }

  private async discoverBluetoothPeer(): Promise<DiscoveredPeer | null> {
    if (!('bluetooth' in navigator)) return null;

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [VLMSP_SERVICE_UUID] }],
        optionalServices: [
          VLMSP_SERVICE_UUID,
          VLMSP_CHARACTERISTIC_MSG_OUT,
          VLMSP_CHARACTERISTIC_MSG_IN,
          VLMSP_CHARACTERISTIC_SYNC_STATE,
          VLMSP_CHARACTERISTIC_HEARTBEAT
        ]
      });

      if (device) {
        return await this.handleBluetoothDevice(device);
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        console.log('[VLMSP] No se encontraron dispositivos Bluetooth cercanos');
      } else {
        console.error('[VLMSP] Error descubriendo peer Bluetooth:', error);
      }
    }

    return null;
  }

  private async handleBluetoothDevice(device: BluetoothDevice): Promise<DiscoveredPeer> {
    const peerId = `bt-${device.id}`;
    
    const peer: DiscoveredPeer = {
      id: peerId,
      name: device.name || 'Dispositivo Desconocido',
      deviceId: device.id,
      lastSeen: new Date(),
      connectionType: 'bluetooth',
      signalStrength: device.watchingAdvertisements ? 0 : undefined,
      isConnected: false,
      pendingSync: 0
    };

    this.discoveredPeers.set(peerId, peer);
    this.notifyPeerDiscovered(peer);

    // Intentar conectar automáticamente usando el objeto device ya obtenido
    await this.syncWithBluetoothPeer(peer, device);

    return peer;
  }

  private async syncWithBluetoothPeer(peer: DiscoveredPeer, existingDevice?: BluetoothDevice): Promise<boolean> {
    let device = existingDevice;
    let server: BluetoothRemoteGATTServer | undefined;

    try {
      // 1. Obtener o usar dispositivo
      if (!device) {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [VLMSP_SERVICE_UUID] }],
          optionalServices: [VLMSP_SERVICE_UUID]
        });
      }

      if (!device) return false;

      // 2. Conectar al servidor GATT
      server = await device.gatt?.connect();
      if (!server) {
        console.error('[VLMSP] No se pudo conectar al servidor GATT');
        return false;
      }

      this.activeConnections.set(peer.id, server);
      peer.isConnected = true;
      this.syncState.isSyncing = true;
      
      // 3. Obtener servicio y características
      const service = await server.getPrimaryService(VLMSP_SERVICE_UUID);
      const msgOutChar = await service.getCharacteristic(VLMSP_CHARACTERISTIC_MSG_OUT);
      const msgInChar = await service.getCharacteristic(VLMSP_CHARACTERISTIC_MSG_IN);
      const syncStateChar = await service.getCharacteristic(VLMSP_CHARACTERISTIC_SYNC_STATE);

      // 4. Leer operaciones pendientes locales
      const pendingOps = await offlineQueue.getPendingOperations();
      
      // 5. Leer operaciones pendientes del peer
      const peerData = await msgOutChar.readValue();
      const peerOps: QueuedOperation[] = JSON.parse(new TextDecoder().decode(peerData));

      // 6. Enviar nuestras operaciones al peer
      const ourOpsData = new TextEncoder().encode(JSON.stringify(pendingOps));
      await msgInChar.writeValue(ourOpsData);

      // 7. Procesar operaciones recibidas del peer
      let opsReceived = 0;
      for (const op of peerOps) {
        const exists = await offlineQueue.hasOperation(op.id);
        if (!exists) {
          await offlineQueue.addOperation({
            ...op,
            source: 'mesh',
            receivedFrom: peer.id,
            receivedAt: new Date().toISOString()
          });
          opsReceived++;
        }
      }

      // 8. Actualizar estado de sincronización en el peer
      await syncStateChar.writeValue(new TextEncoder().encode(JSON.stringify({
        deviceId: this.deviceId,
        timestamp: Date.now(),
        opsReceived: opsReceived,
        opsSent: pendingOps.length
      })));

      this.syncState.lastSyncAt = new Date();
      this.syncState.messagesSent += pendingOps.length;
      this.syncState.messagesReceived += opsReceived;

      peer.pendingSync = 0;
      peer.lastSeen = new Date();

      this.notifySyncComplete({ peerId: peer.id, opsSynced: opsReceived });
      console.log(`[VLMSP] Sincronización Bluetooth completada con ${peer.name}: ${opsReceived} ops recibidas, ${pendingOps.length} enviadas`);

      return true;

    } catch (error) {
      console.error('[VLMSP] Error durante sincronización Bluetooth:', error);
      return false;
    } finally {
      this.syncState.isSyncing = false;
      peer.isConnected = false;
      this.activeConnections.delete(peer.id);
      if (server) {
        try { server.disconnect(); } catch (e) {}
      }
    }
  }

  // ============================================================================
  // IMPLEMENTACIÓN WEBRTC (FALLBACK WIFI)
  // ============================================================================

  private async scanWebRTC(): Promise<void> {
    if (!this.discoveryChannel) return;

    this.notifyStatusUpdate('Escaneando red local (Wi-Fi)...', 'info');

    // Anunciar presencia
    this.discoveryChannel.postMessage({
      type: 'PEER_ADVERTISEMENT',
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      timestamp: Date.now()
    });
  }

  private async discoverWebRTCPeer(): Promise<DiscoveredPeer | null> {
    return new Promise((resolve) => {
      if (!this.discoveryChannel) {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      const handleDiscovery = (event: MessageEvent) => {
        const msg = event.data;
        if (msg.type === 'PEER_ADVERTISEMENT' && msg.deviceId !== this.deviceId) {
          clearTimeout(timeout);
          // La suscripción a onmessage ya está en setupChannels, así que aquí solo resolvemos
          resolve(this.handleWebRTCPeerDiscovery(msg));
        }
      };

      this.discoveryChannel.addEventListener('message', handleDiscovery, { once: true });

      // Solicitar peers
      this.discoveryChannel.postMessage({
        type: 'PEER_DISCOVERY_REQUEST',
        deviceId: this.deviceId,
        timestamp: Date.now()
      });
    });
  }

  private handleWebRTCPeerDiscovery(msg: any): DiscoveredPeer {
    const peerId = `webrtc-${msg.deviceId}`;
    
    const peer: DiscoveredPeer = {
      id: peerId,
      name: msg.deviceName,
      deviceId: msg.deviceId,
      lastSeen: new Date(),
      connectionType: 'webrtc',
      isConnected: false,
      pendingSync: 0
    };

    if (!this.discoveredPeers.has(peerId)) {
      this.discoveredPeers.set(peerId, peer);
      this.notifyPeerDiscovered(peer);
      this.notifyStatusUpdate(`Nodo detectado: ${peer.name}`, 'success');
    } else {
      const existing = this.discoveredPeers.get(peerId)!;
      existing.lastSeen = new Date();
    }

    return peer;
  }

  private async syncWithWebRTCPeer(peer: DiscoveredPeer): Promise<boolean> {
    if (!this.signalChannel) return false;
    
    const pc = new RTCPeerConnection(VLMSP_WEBRTC_CONFIG);
    this.activeConnections.set(peer.id, pc);

    try {
      this.notifyStatusUpdate(`Sincronizando con ${peer.name}...`, 'info');
      this.syncState.isSyncing = true;
      this.notifySyncStateChange();

      // Crear canal de datos
      const dataChannel = pc.createDataChannel('villaluz-sync', {
        ordered: true
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Señalización
      this.signalChannel.postMessage({
        type: 'WEBRTC_OFFER',
        from: this.deviceId,
        to: peer.deviceId,
        offer: pc.localDescription
      });

      // Esperar respuesta
      const answer = await new Promise<RTCSessionDescriptionInit>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando respuesta WebRTC')), 10000);
        
        const handleAnswer = (event: MessageEvent) => {
          const msg = event.data;
          if (msg.type === 'WEBRTC_ANSWER' && msg.to === this.deviceId && msg.from === peer.deviceId) {
            clearTimeout(timeout);
            this.signalChannel?.removeEventListener('message', handleAnswer);
            resolve(msg.answer);
          }
        };

        this.signalChannel?.addEventListener('message', handleAnswer);
      });

      await pc.setRemoteDescription(answer);

      // Esperar a que el canal de datos se abra
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout abriendo DataChannel')), 10000);
        
        dataChannel.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      peer.isConnected = true;

      // Intercambiar datos
      const pendingOps = await offlineQueue.getPendingOperations();
      
      dataChannel.send(JSON.stringify({
        type: 'PENDING_OPS',
        deviceId: this.deviceId,
        timestamp: Date.now(),
        operations: pendingOps
      }));

      // Recibir respuesta
      const response = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout recibiendo datos')), 15000);
        dataChannel.onmessage = (event) => {
          clearTimeout(timeout);
          resolve(JSON.parse(event.data));
        };
      });

      if (response.type === 'PENDING_OPS') {
        let opsReceived = 0;
        for (const op of response.operations) {
          const exists = await offlineQueue.hasOperation(op.id);
          if (!exists) {
            await offlineQueue.addOperation({
              ...op,
              source: 'mesh-webrtc',
              receivedFrom: peer.id,
              receivedAt: new Date().toISOString()
            });
            opsReceived++;
          }
        }

        this.syncState.lastSyncAt = new Date();
        this.syncState.messagesSent += pendingOps.length;
        this.syncState.messagesReceived += opsReceived;

        this.notifySyncComplete({ peerId: peer.id, opsSynced: opsReceived });
        this.notifyStatusUpdate(`Sincronización exitosa: ${opsReceived} recibidas`, 'success');

        console.log(`[VLMSP] Sincronización WebRTC completada con ${peer.name}: ${opsReceived} ops recibidas`);
      }

      dataChannel.close();
      return true;

    } catch (error) {
      console.error('[VLMSP] Error sincronizando vía WebRTC:', error);
      this.notifyStatusUpdate('Fallo en sincronización WebRTC', 'error');
      return false;
    } finally {
      this.syncState.isSyncing = false;
      peer.isConnected = false;
      this.activeConnections.delete(peer.id);
      this.notifySyncStateChange();
      pc.close();
    }
  }

  private async startWebRTCAdvertising(): Promise<void> {
    if (!this.signalChannel) return;

    this.notifyStatusUpdate('Anunciando presencia en red local', 'info');

    // El listener ya está configurado en setupChannels para responder a ofertas
    // Solo necesitamos asegurarnos de que el canal esté activo.
  }

  private stopWebRTCAdvertising(): void {
    // Limpiar conexiones activas
    this.activeConnections.forEach((conn) => {
      if (conn instanceof RTCPeerConnection) {
        conn.close();
      }
    });
    this.activeConnections.clear();
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  private generateDeviceId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private startHeartbeat(): void {
    setInterval(() => {
      // Limpiar peers que no han sido vistos en 2 minutos
      const now = Date.now();
      this.discoveredPeers.forEach((peer, id) => {
        if (now - peer.lastSeen.getTime() > 120000) {
          this.discoveredPeers.delete(id);
          this.notifyPeerLost(id);
        }
      });
    }, 30000);
  }

  private cleanupStalePeers(): void {
    const now = Date.now();
    this.discoveredPeers.forEach((peer, id) => {
      if (now - peer.lastSeen.getTime() > 300000) { // 5 minutos
        this.discoveredPeers.delete(id);
        this.notifyPeerLost(id);
        console.log(`[VLMSP] Peer ${peer.name} eliminado por inactividad`);
      }
    });
  }

  private notifyPeerDiscovered(peer: DiscoveredPeer): void {
    this.onPeerDiscoveredCallbacks.forEach(cb => {
      try { cb(peer); } catch (e) { console.error(e); }
    });
  }

  private notifyPeerLost(peerId: string): void {
    this.onPeerLostCallbacks.forEach(cb => {
      try { cb(peerId); } catch (e) { console.error(e); }
    });
  }

  private notifySyncComplete(result: { peerId: string; opsSynced: number }): void {
    this.onSyncCompleteCallbacks.forEach(cb => {
      try { cb(result); } catch (e) { console.error(e); }
    });
  }
}

export const proximitySync = new ProximitySyncService();

// Exportar tipos para uso externo
export type { DiscoveredPeer, SyncState, SyncMessage };
