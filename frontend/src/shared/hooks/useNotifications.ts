import { useState, useCallback, useEffect, useMemo } from 'react';
import api from '@/shared/api/client';
import { useToast } from '@/app/providers/ToastContext';

export interface NotificationItem {
  id: number;
  type: 'JOIN_REQUEST' | 'INVITATION_RECEIVED' | 'INVITATION_ACCEPTED' | 'INVITATION_REJECTED' | 'JOIN_APPROVED';
  finca_id: number;
  finca_name: string;
  sender_name?: string;
  sender_id?: number;
  requested_role?: string;
  created_at: string;
  status: 'pending' | 'read' | 'approved' | 'rejected';
  metadata?: any;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Intentamos consumir el endpoint propuesto por el usuario
      const response = await api.get('/users/me/notifications?status=pending');
      if (response.data && response.data.success) {
        setNotifications(response.data.data || []);
      } else {
        // Fallback en caso de que la API devuelva directamente el array
        setNotifications(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    
    // Polling opcional cada 1 minuto
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const totalPending = useMemo(() => {
    return notifications.filter(n => n.status === 'pending').length;
  }, [notifications]);

  const farmPending = useMemo(() => {
    return notifications.filter(n => 
      n.status === 'pending' && 
      (n.type === 'JOIN_REQUEST' || n.type === 'INVITATION_RECEIVED')
    ).length;
  }, [notifications]);

  const handleAction = async (id: number, action: 'approve' | 'reject' | 'read') => {
    try {
      await api.patch(`/notifications/${id}`, { action });
      
      // Actualización optimista
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      if (action === 'approve') {
        showToast('Solicitud aprobada correctamente', 'success');
      } else if (action === 'reject') {
        showToast('Solicitud rechazada', 'success');
      }
    } catch (error) {
      console.error(`Error performing action ${action} on notification ${id}:`, error);
      showToast('Error al procesar la solicitud', 'error');
      // Revertir en caso de error refrescando
      fetchNotifications();
    }
  };

  const approve = (id: number) => handleAction(id, 'approve');
  const reject = (id: number) => handleAction(id, 'reject');
  const markAsRead = (id: number) => handleAction(id, 'read');

  return {
    notifications,
    loading,
    totalPending,
    farmPending,
    approve,
    reject,
    markAsRead,
    refresh: fetchNotifications
  };
};
