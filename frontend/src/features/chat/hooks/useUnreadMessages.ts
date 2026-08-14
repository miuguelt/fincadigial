import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../api/chat.service';

export function useUnreadMessages(pollInterval = 30000) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      const count = Number(await chatService.getUnreadCount());
      const normalized = Number.isFinite(count) ? count : 0;
      setUnreadCount(normalized);
      window.dispatchEvent(new CustomEvent('chat-unread-count-updated', {
        detail: { unreadCount: normalized },
      }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al obtener mensajes no leídos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void fetchUnreadCount();
      }
    };
    refreshWhenVisible();

    const interval = setInterval(refreshWhenVisible, pollInterval);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('chat-unread-refresh', fetchUnreadCount);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('chat-unread-refresh', fetchUnreadCount);
    };
  }, [fetchUnreadCount, pollInterval]);

  return { unreadCount, loading, error, refetch: fetchUnreadCount };
}
