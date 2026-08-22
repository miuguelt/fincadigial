import React from 'react';
import { useRealtimeNotifications, Notification } from '@/shared/hooks/useRealtimeNotifications';
import { useToast } from '@/app/providers/ToastContext';
import { isFloatingChatOpenWith } from '@/features/chat/model/floatingChat';

/**
 * Componente invisible que escucha eventos SSE globales y dispara
 * notificaciones UI (Toasts) basadas en el contexto actual del usuario.
 *
 * IMPORTANTE: Este componente NO instancia una conexión SSE propia.
 * Usa autoConnect=false para evitar duplicar la conexión que ya abre
 * NotificationCenter. Solo escucha via el callback onNotification.
 *
 * FIX: La prop correcta es onNotification (no onEvent que no existe).
 */
export const GlobalRealtimeListener: React.FC = () => {
  const { showToast } = useToast();

  useRealtimeNotifications({
    // No abrir una segunda conexión SSE — el NotificationCenter ya la gestiona
    autoConnect: false,
    onNotification: (notification: Notification) => {
      // Solo mostrar Toast para tipos relevantes, no duplicar todas las notifs
      if (notification.type === 'error') {
        showToast(`⚠️ ${notification.title}: ${notification.message}`, 'error');
        return;
      }

      // Mensajes de chat: no avisar de lo que ya se está leyendo en la ventana flotante.
      if (notification.data?.type === 'chat_message') {
        if (!isFloatingChatOpenWith(Number(notification.data?.sender_id))) {
          const senderName = notification.data?.sender_name || 'un usuario';
          showToast(`💬 Mensaje de ${senderName}: ${notification.message.substring(0, 60)}`, 'info');
        }
        return;
      }

      // Alertas de sistema críticas
      if (notification.data?.type === 'system_alert' && notification.type === 'warning') {
        showToast(`🔔 ${notification.title}: ${notification.message}`, 'info');
      }
    },
  });

  // Este componente no renderiza nada visible
  return null;
};

export default GlobalRealtimeListener;
