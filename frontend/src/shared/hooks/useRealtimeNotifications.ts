import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/shared/api/client';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
  action?: {
    label: string;
    url: string;
  };
}

interface UseRealtimeNotificationsOptions {
  autoConnect?: boolean;
  onNotification?: (notification: Notification) => void;
}

/**
 * Configuración de backoff exponencial para reconexiones SSE.
 * Previene loops infinitos de reconexión cuando el servidor no está disponible.
 */
const SSE_BACKOFF = {
  INITIAL_DELAY_MS: 2000,
  MAX_DELAY_MS: 60000,
  MULTIPLIER: 2,
} as const;

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { autoConnect = true, onNotification } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Refs estables (evitan dependencias inestables en callbacks) ──
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffDelayRef = useRef(SSE_BACKOFF.INITIAL_DELAY_MS);
  const isConnectingRef = useRef(false);
  const onNotificationRef = useRef(onNotification);
  const mountedRef = useRef(true);

  // Mantener ref de callback actualizada sin causar re-renders
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  // Calcular conteo de no leídas
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // ── Cancelar reconexión pendiente ──
  const cancelPendingReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // ── Desconectar ──
  const disconnect = useCallback(() => {
    cancelPendingReconnect();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    isConnectingRef.current = false;
    if (mountedRef.current) {
      setConnected(false);
    }
  }, [cancelPendingReconnect]);

  // ── Conectar a SSE (singleton estricto) ──
  const connect = useCallback(() => {
    // Guard: prevenir instancias simultáneas
    if (isConnectingRef.current) return;
    if (eventSourceRef.current?.readyState === EventSource.OPEN) return;
    if (eventSourceRef.current?.readyState === EventSource.CONNECTING) return;

    // Limpiar cualquier EventSource anterior antes de crear uno nuevo
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isConnectingRef.current = true;

    try {
      // Limpiar baseURL para evitar duplicación /api/v1/api/v1
      const rawBaseURL = apiClient.defaults.baseURL || '';
      const cleanBaseURL = rawBaseURL.endsWith('/api/v1')
        ? rawBaseURL.slice(0, -7)
        : rawBaseURL;

      const sseEndpoint = `${cleanBaseURL}/api/v1/sse/events`;
      console.log(`[SSE] Iniciando conexión EventSource hacia: ${sseEndpoint}`);

      const eventSource = new EventSource(sseEndpoint);

      eventSource.onopen = () => {
        if (!mountedRef.current) { eventSource.close(); return; }
        isConnectingRef.current = false;
        backoffDelayRef.current = SSE_BACKOFF.INITIAL_DELAY_MS; // Reset backoff on success
        setConnected(true);
        console.log('🔌 Conectado a notificaciones en tiempo real (SSE)');
      };

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);

          // Ignorar mensajes de sistema
          if (data.endpoint === 'system' && data.action === 'connected') {
            return;
          }

          // Crear notificación
          const notification: Notification = {
            id: data.id || `${Date.now()}-${Math.random()}`,
            type: data.type || 'info',
            title: data.title || 'Notificación',
            message: data.message || data.data?.message || 'Nueva actualización',
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
            data: data.data,
            action: data.action,
          };

          setNotifications(prev => [notification, ...prev].slice(0, 50)); // Mantener últimas 50

          if (onNotificationRef.current) {
            onNotificationRef.current(notification);
          }
        } catch (error) {
          console.error('[SSE] Error procesando payload de notificación SSE:', error);
        }
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) { eventSource.close(); return; }
        setConnected(false);
        isConnectingRef.current = false;

        // Cerrar la instancia con error
        eventSource.close();
        eventSourceRef.current = null;

        console.warn(
          `[SSE] Error de conexión. Reintentando en ${backoffDelayRef.current / 1000}s...`
        );

        // Reconexión con backoff exponencial
        cancelPendingReconnect();
        reconnectTimerRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          // Incrementar delay con backoff exponencial
          backoffDelayRef.current = Math.min(
            backoffDelayRef.current * SSE_BACKOFF.MULTIPLIER,
            SSE_BACKOFF.MAX_DELAY_MS
          );
          connect();
        }, backoffDelayRef.current);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[SSE] Excepción inesperada al inicializar EventSource:', error);
      isConnectingRef.current = false;
    }
  }, [cancelPendingReconnect]);

  // Marcar como leída
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  // Eliminar notificación
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Limpiar todas
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Agregar notificación manualmente
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));

    if (onNotificationRef.current) {
      onNotificationRef.current(newNotification);
    }
  }, []);

  // ── Efecto de lifecycle: conexión al montar, limpieza al desmontar ──
  useEffect(() => {
    mountedRef.current = true;

    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // Solo conectar/desconectar al montar/desmontar.
    // autoConnect y connect/disconnect son estables (no cambian entre renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications,
    unreadCount,
    connected,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    addNotification,
  };
}

export default useRealtimeNotifications;
