import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../api/chat.service';

export function useUnreadMessages(pollInterval = 30000) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      // getUnreadCount devuelve la envoltura ApiResponse, no el número.
      const response: any = await chatService.getUnreadCount();
      const count = Number(
        response?.data?.unread_count ?? response?.unread_count ?? 0,
      );
      setUnreadCount(Number.isFinite(count) ? count : 0);
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
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchUnreadCount, pollInterval]);

  return { unreadCount, loading, error, refetch: fetchUnreadCount };
}
