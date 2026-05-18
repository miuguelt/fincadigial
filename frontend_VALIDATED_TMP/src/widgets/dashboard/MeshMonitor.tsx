import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  Bluetooth, 
  RefreshCw, 
  Users, 
  Radio,
  Activity,
  Zap,
  Smartphone,
  CheckCircle,
  AlertCircle,
  RotateCw
} from 'lucide-react';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { proximitySync, type DiscoveredPeer, type SyncState } from '@/shared/api/offline/ProximitySyncService';

// Web Bluetooth solo disponible en Chrome/Edge con HTTPS
const BLUETOOTH_AVAILABLE = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export const MeshMonitor: React.FC = () => {
  // Ocultar completamente en browsers sin Web Bluetooth (Firefox, Safari)
  if (!BLUETOOTH_AVAILABLE) return null;

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [nearbyNodes, setNearbyNodes] = useState<DiscoveredPeer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  // Actualizar estado de sincronización
  const updateSyncState = useCallback(() => {
    setSyncState(proximitySync.getSyncState());
  }, []);

  // Manejar descubrimiento de peer
  const handlePeerDiscovered = useCallback((peer: DiscoveredPeer) => {
    setNearbyNodes(prev => {
      const filtered = prev.filter(p => p.id !== peer.id);
      return [...filtered, peer];
    });
  }, []);

  // Manejar pérdida de peer
  const handlePeerLost = useCallback((peerId: string) => {
    setNearbyNodes(prev => prev.filter(p => p.id !== peerId));
  }, []);

  // Manejar sincronización completada
  const handleSyncComplete = useCallback((result: { peerId: string; opsSynced: number }) => {
    const peer = nearbyNodes.find(p => p.id === result.peerId);
    setLastSyncMessage(`Sincronizado con ${peer?.name || 'dispositivo'}: ${result.opsSynced} operaciones`);
    updateSyncState();
    setTimeout(() => setLastSyncMessage(null), 3000);
  }, [nearbyNodes, updateSyncState]);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const updateQueue = async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    };

    const interval = setInterval(updateQueue, 3000);
    updateQueue();
    updateSyncState();

    // Suscribirse a eventos de sincronización
    const unsubDiscovered = proximitySync.onPeerDiscovered(handlePeerDiscovered);
    const unsubLost = proximitySync.onPeerLost(handlePeerLost);
    const unsubSync = proximitySync.onSyncComplete(handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      clearInterval(interval);
      unsubDiscovered();
      unsubLost();
      unsubSync();
    };
  }, [handlePeerDiscovered, handlePeerLost, handleSyncComplete, updateSyncState]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const peer = await proximitySync.discoverPeers();
      if (peer) {
        handlePeerDiscovered(peer);
      }
    } catch (error) {
      console.error('[MeshMonitor] Error escaneando:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncWithPeer = async (peerId: string) => {
    const success = await proximitySync.syncWithPeer(peerId);
    if (!success) {
      console.error('[MeshMonitor] Error sincronizando con peer:', peerId);
    }
  };

  const handleToggleAdvertising = async () => {
    if (isAdvertising) {
      await proximitySync.stopAdvertising();
      setIsAdvertising(false);
    } else {
      await proximitySync.startAdvertising();
      setIsAdvertising(true);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Estado de Red Mesh</h3>
          <p className="text-sm text-gray-500">Villa Luz Smart Field</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
          isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'CONECTADO A NUBE' : 'MODO LOCAL MESH'}
        </div>
      </div>

      {/* Mensaje de última sincronización */}
      <AnimatePresence>
        {lastSyncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
          >
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm text-green-700">{lastSyncMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles principales */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw size={18} className={isScanning ? 'animate-spin' : ''} />
          {isScanning ? 'Buscando...' : 'Buscar Dispositivos'}
        </button>
        <button
          onClick={handleToggleAdvertising}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            isAdvertising 
              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          <Radio size={18} className={isAdvertising ? 'animate-pulse' : ''} />
          {isAdvertising ? 'Dejar de Anunciar' : 'Anunciar Presencia'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Cola Offline */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <RotateCw className={`text-blue-500 ${pendingCount > 0 ? 'animate-spin' : ''}`} size={18} />
            <span className="text-sm font-semibold">Pendiente de Sincro</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          <p className="text-[10px] text-gray-400 mt-1">Mensajes y registros en espera</p>
        </div>

        {/* Card: Nodos Cercanos */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-purple-500" size={18} />
            <span className="text-sm font-semibold">Nodos en Alcance</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{nearbyNodes.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">
            {nearbyNodes.filter(n => n.isConnected).length} conectados
          </p>
        </div>

        {/* Card: Estadísticas de Sync */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="text-amber-500" size={18} />
            <span className="text-sm font-semibold">Sincronización</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {syncState?.messagesReceived || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {syncState?.lastSyncAt 
              ? `Última: ${new Date(syncState.lastSyncAt).toLocaleTimeString()}`
              : 'Sin sincronizar aún'
            }
          </p>
        </div>
      </div>

      {/* Lista de Nodos */}
      <div className="mt-6">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Dispositivos Encontrados ({nearbyNodes.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {nearbyNodes.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-gray-500 py-4 italic bg-gray-50 rounded-lg px-4">
              <Activity size={16} strokeWidth={1} />
              No hay dispositivos cercanos. Presiona "Buscar Dispositivos" para escanear.
            </div>
          ) : (
            nearbyNodes.map(node => (
              <motion.div 
                key={node.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {node.connectionType === 'bluetooth' ? (
                    <Bluetooth size={16} className="text-blue-500" />
                  ) : (
                    <Wifi size={16} className="text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{node.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {node.connectionType === 'bluetooth' ? 'Bluetooth' : 'WiFi (WebRTC)'}
                      {' • '}
                      Hace {Math.floor((new Date().getTime() - node.lastSeen.getTime()) / 60000)} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {node.isConnected ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Conectado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSyncWithPeer(node.id)}
                      disabled={node.isConnected || syncState?.isSyncing}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                    >
                      <RefreshCw size={12} />
                      Sincronizar
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Indicador de estado de sincronización */}
      {syncState?.isSyncing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3"
        >
          <RefreshCw size={18} className="text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Sincronizando datos...</span>
        </motion.div>
      )}
    </div>
  );
};
