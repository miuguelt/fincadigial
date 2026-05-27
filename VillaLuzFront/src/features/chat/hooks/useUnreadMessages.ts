import { useState, useEffect, useCallback } from 'react';
import { chatService } from '../api/chat.service';

export function useUnreadMessages(pollInterval = 30000) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      const count = await chatService.getUnreadCount();
      setUnreadCount(count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al obtener mensajes no leídos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    // Polling para mantener actualizado el contador
    const interval = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  return { unreadCount, loading, error, refetch: fetchUnreadCount };
}
