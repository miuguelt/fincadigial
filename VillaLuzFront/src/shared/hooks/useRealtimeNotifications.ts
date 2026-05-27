import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeSSE } from '@/lib/events';
import { alertService, Alert } from '@/entities/alert/api/alert.service';

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

export interface EnrichedAlert extends Notification {
  alertType?: string;
  priority?: string;
  recommendation?: string;
  animalRecord?: string;
  fieldName?: string;
  source: 'sse' | 'backend';
}

interface UseRealtimeNotificationsOptions {
  autoConnect?: boolean;
  onNotification?: (notification: EnrichedAlert) => void;
  loadHistorical?: boolean;
}

const priorityToType: Record<string, Notification['type']> = {
  'Crítica': 'error',
  'Alta': 'warning',
  'Media': 'info',
  'Baja': 'info',
};

function mapAlertToNotification(alert: Alert): EnrichedAlert {
  return {
    id: String(alert.id || `alert-${Date.now()}-${Math.random()}`),
    type: priorityToType[alert.priority] || 'info',
    title: alert.alert_type || 'Alerta',
    message: alert.message,
    timestamp: alert.triggered_at || new Date().toISOString(),
    read: alert.is_read || false,
    data: alert,
    alertType: alert.alert_type,
    priority: alert.priority,
    recommendation: alert.recommendation,
    source: 'backend',
  };
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { onNotification, loadHistorical = true } = options;

  const [notifications, setNotifications] = useState<EnrichedAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const onNotificationRef = useRef(onNotification);
  const mountedRef = useRef(true);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const loadHistoricalAlerts = useCallback(async () => {
    if (!loadHistorical) return;
    setLoading(true);
    try {
      const alerts = await alertService.getAlerts({ is_read: false, limit: 50 });
      const mapped = alerts.map(mapAlertToNotification);
      setNotifications(prev => {
        const seenMessages = new Set<string>();
        const uniqueList: EnrichedAlert[] = [];
        
        // Add new alerts first, tracking seen messages
        mapped.forEach(a => {
          if (a.message) {
            const key = a.message.trim().toLowerCase();
            if (!seenMessages.has(key)) {
              seenMessages.add(key);
              uniqueList.push(a);
            }
          }
        });
        
        // Add previous alerts if they don't have a duplicate message
        prev.forEach(a => {
          if (a.message) {
            const key = a.message.trim().toLowerCase();
            if (!seenMessages.has(key)) {
              seenMessages.add(key);
              uniqueList.push(a);
            }
          } else {
            uniqueList.push(a);
          }
        });

        return uniqueList.slice(0, 100);
      });
    } catch (error) {
      console.error('[Notifications] Error loading historical alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [loadHistorical]);

  const handleSSEMessage = useCallback((payload: any) => {
    if (!mountedRef.current) return;

    if (payload?.endpoint === 'system') {
      if (payload.action === 'connected') setConnected(true);
      return;
    }

    const notification: EnrichedAlert = {
      id: payload.id || `${Date.now()}-${Math.random()}`,
      type: payload.type || 'info',
      title: payload.title || 'Notificación',
      message: payload.message || payload.data?.message || 'Nueva actualización',
      timestamp: payload.timestamp || new Date().toISOString(),
      read: false,
      data: payload.data,
      action: payload.action,
      alertType: payload.data?.alert_type,
      priority: payload.data?.priority,
      recommendation: payload.data?.recommendation,
      source: 'sse',
    };

    setNotifications(prev => {
      if (notification.message) {
        const key = notification.message.trim().toLowerCase();
        if (prev.some(n => !n.read && n.message && n.message.trim().toLowerCase() === key)) {
          return prev;
        }
      }
      return [notification, ...prev].slice(0, 100);
    });

    if (onNotificationRef.current) {
      onNotificationRef.current(notification);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      try {
        await alertService.markAsRead(numericId);
      } catch (error) {
        console.error('[Notifications] Error marking alert as read:', error);
      }
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    try {
      await alertService.markAllAsRead();
    } catch (error) {
      console.error('[Notifications] Error marking all as read:', error);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((notification: Omit<EnrichedAlert, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: EnrichedAlert = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      read: false,
      source: notification.source || 'sse',
    };

    setNotifications(prev => {
      if (newNotification.message) {
        const key = newNotification.message.trim().toLowerCase();
        if (prev.some(n => !n.read && n.message && n.message.trim().toLowerCase() === key)) {
          return prev;
        }
      }
      return [newNotification, ...prev].slice(0, 100);
    });

    if (onNotificationRef.current) {
      onNotificationRef.current(newNotification);
    }
  }, []);

  const refreshAlerts = useCallback(async () => {
    await loadHistoricalAlerts();
  }, [loadHistoricalAlerts]);

  useEffect(() => {
    mountedRef.current = true;

    if (loadHistorical) {
      loadHistoricalAlerts();
    }

    const unsubscribe = subscribeSSE(handleSSEMessage);

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  return {
    notifications,
    unreadCount,
    connected,
    loading,
    connect: () => {},
    disconnect: () => {},
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    addNotification,
    refreshAlerts,
  };
}

export default useRealtimeNotifications;
