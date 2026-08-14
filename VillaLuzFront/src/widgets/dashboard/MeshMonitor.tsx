import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  Bluetooth,
  RefreshCw,
  Users,
  Radio,
  Activity,
  Zap,
  CheckCircle,
  RotateCw,
} from "lucide-react";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import {
  proximitySync,
  type DiscoveredPeer,
  type SyncState,
} from "@/shared/api/offline/ProximitySyncService";

// Web Bluetooth solo disponible en Chrome/Edge con HTTPS
const BLUETOOTH_AVAILABLE =
  typeof navigator !== "undefined" && "bluetooth" in navigator;

export const MeshMonitor: React.FC = () => {
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

  // Manejar descubrimiento de peer con sincronización automática invisible
  const handlePeerDiscovered = useCallback((peer: DiscoveredPeer) => {
    setNearbyNodes((prev) => {
      const filtered = prev.filter((p) => p.id !== peer.id);
      return [...filtered, peer];
    });

    // Sincronización Invisible: Sincronizar automáticamente en segundo plano si no está conectado
    if (!peer.isConnected) {
      console.log(`[MeshMonitor] Iniciando sincronización invisible con ${peer.name}...`);
      proximitySync.syncWithPeer(peer.id).catch((err) => {
        console.error(`[MeshMonitor] Error en sincronización invisible con ${peer.name}:`, err);
      });
    }
  }, []);

  // Manejar pérdida de peer
  const handlePeerLost = useCallback((peerId: string) => {
    setNearbyNodes((prev) => prev.filter((p) => p.id !== peerId));
  }, []);

  // Manejar sincronización completada
  const handleSyncComplete = useCallback(
    (result: { peerId: string; opsSynced: number }) => {
      const peer = nearbyNodes.find((p) => p.id === result.peerId);
      setLastSyncMessage(
        `Datos pasados con ${peer?.name || "dispositivo"}: ${result.opsSynced} registros transferidos con éxito.`,
      );
      updateSyncState();
      setTimeout(() => setLastSyncMessage(null), 4000);
    },
    [nearbyNodes, updateSyncState],
  );

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);

    const updateQueue = async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    };

    const interval = setInterval(updateQueue, 3000);
    updateQueue();
    updateSyncState();

    // Sincronización Invisible: Iniciar escaneo pasivo automático al montar
    proximitySync.startPassiveScanning().catch((err) => 
      console.error("[MeshMonitor] Error en escaneado invisible inicial:", err)
    );

    // Suscribirse a eventos de sincronización
    const unsubDiscovered =
      proximitySync.onPeerDiscovered(handlePeerDiscovered);
    const unsubLost = proximitySync.onPeerLost(handlePeerLost);
    const unsubSync = proximitySync.onSyncComplete(handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
      clearInterval(interval);
      proximitySync.stopPassiveScanning();
      unsubDiscovered();
      unsubLost();
      unsubSync();
    };
  }, [
    handlePeerDiscovered,
    handlePeerLost,
    handleSyncComplete,
    updateSyncState,
  ]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const peer = await proximitySync.discoverPeers();
      if (peer) {
        handlePeerDiscovered(peer);
      }
    } catch (error) {
      console.error("[MeshMonitor] Error escaneando:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSyncWithPeer = async (peerId: string) => {
    const success = await proximitySync.syncWithPeer(peerId);
    if (!success) {
      console.error("[MeshMonitor] Error sincronizando con peer:", peerId);
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
    <div className="bg-card text-card-foreground rounded-lg p-6 border border-border shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Estado de Red Local (Mesh)
          </h3>
          <p className="text-sm text-muted-foreground">Villa Luz Smart Field — Conectividad Rural</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge: Estado de Internet */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
              isOnline
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-warning/10 text-warning dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Conectado a Internet" : "Red Local (Sin Internet)"}
          </div>
          {/* Badge: Estado de Bluetooth */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
              BLUETOOTH_AVAILABLE
                ? "bg-info/10 text-info dark:bg-blue-950 dark:text-blue-300"
                : "bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-400"
            }`}
            title={
              BLUETOOTH_AVAILABLE
                ? "El Bluetooth de tu celular está activo para buscar compañeros."
                : "El Bluetooth no está disponible en este navegador o requiere HTTPS."
            }
          >
            <Bluetooth size={14} />
            {BLUETOOTH_AVAILABLE ? "Bluetooth Listo" : "Bluetooth No Disp."}
          </div>
        </div>
      </div>

      {/* Mensaje de última sincronización */}
      <AnimatePresence>
        {lastSyncMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 rounded-lg flex items-center gap-2"
          >
            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm text-emerald-800 dark:text-emerald-300">{lastSyncMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles principales con semántica rural */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all font-semibold shadow-sm"
        >
          <RefreshCw size={18} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "Buscando..." : "Buscar Compañeros"}
        </button>
        <button
          onClick={handleToggleAdvertising}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all font-semibold shadow-sm ${
            isAdvertising
              ? "bg-destructive text-destructive-foreground hover:opacity-90"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <Radio size={18} className={isAdvertising ? "animate-pulse" : ""} />
          {isAdvertising ? "Ocultarse" : "Hacerse Visible"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: Cola Offline (Datos por Guardar) */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <RotateCw
              className={`text-primary ${pendingCount > 0 ? "animate-spin" : ""}`}
              size={18}
            />
            <span className="text-sm font-semibold text-foreground">Datos por Guardar</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Registros en este celular en espera de enviarse
          </p>
        </div>

        {/* Card: Compañeros en Alcance */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Users className="text-indigo-500" size={18} />
            <span className="text-sm font-semibold text-foreground">Compañeros en Rango</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {nearbyNodes.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {nearbyNodes.filter((n) => n.isConnected).length} conectados ahora
          </p>
        </div>

        {/* Card: Estadísticas de Sync */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="text-warning" size={18} />
            <span className="text-sm font-semibold text-foreground">Sincronizaciones</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {syncState?.messagesReceived || 0}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {syncState?.lastSyncAt
              ? `Último paso: ${new Date(syncState.lastSyncAt).toLocaleTimeString('es-CO')}`
              : "Sin pasar datos aún"}
          </p>
        </div>
      </div>

      {/* Lista de Nodos */}
      <div className="mt-6">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Vecinos Conectados ({nearbyNodes.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {nearbyNodes.length === 0 ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4 italic bg-muted/20 rounded-xl px-4 border border-border/50">
              <Activity size={16} strokeWidth={1} />
              No hay compañeros cerca en este momento. El sistema busca automáticamente en segundo plano.
            </div>
          ) : (
            nearbyNodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  {node.connectionType === "bluetooth" ? (
                    <Bluetooth size={16} className="text-info" />
                  ) : (
                    <Wifi size={16} className="text-emerald-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{node.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {node.connectionType === "bluetooth"
                        ? "Bluetooth Directo"
                        : "Red WiFi del Campo"}
                      {" • "}
                      Visto hace{" "}
                      {Math.max(0, Math.floor(
                        (new Date().getTime() - node.lastSeen.getTime()) /
                          60000,
                      ))}{" "}
                      min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {node.isConnected ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Conectado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSyncWithPeer(node.id)}
                      disabled={node.isConnected || syncState?.isSyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground transition-all font-semibold shadow-sm"
                    >
                      <RefreshCw size={12} />
                      Pasar Datos
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
          className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3"
        >
          <RefreshCw size={18} className="text-primary animate-spin" />
          <span className="text-sm text-primary font-medium">Pasando datos entre celulares...</span>
        </motion.div>
      )}
    </div>
  );
};
