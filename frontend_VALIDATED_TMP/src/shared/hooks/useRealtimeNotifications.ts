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

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { autoConnect = true, onNotification } = options;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Calcular conteo de no leídas
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Conectar a SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    const baseURL = apiClient.defaults.baseURL || '';
    const eventSource = new EventSource(`${baseURL}/api/v1/sse/events`);
    
    eventSource.onopen = () => {
      setConnected(true);
      console.log('🔌 Conectado a notificaciones en tiempo real');
    };

    eventSource.onmessage = (event) => {
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
        
        if (onNotification) {
          onNotification(notification);
        }
      } catch (error) {
        console.error('Error procesando notificación SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Error SSE:', error);
      setConnected(false);
      
      // Reconectar automáticamente después de 5 segundos
      setTimeout(() => {
        if (autoConnect) {
          connect();
        }
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  }, [autoConnect, onNotification]);

  // Desconectar
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);

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
    
    if (onNotification) {
      onNotification(newNotification);
    }
  }, [onNotification]);

  // Conectar al montar
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

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
