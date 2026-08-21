import { useEffect, useRef } from 'react';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { parseChatRealtimeEvent } from '@/features/chat/model/chatEvents';
import { refetchAllResources } from '@/shared/hooks/useResource';
import { queryClient } from '@/app/bootstrap/queryClient';
import { OfflineChatService } from '@/shared/api/offline/OfflineChatService';
import sse, { closeSSE, connectSSE } from '@/lib/events';
import { claimLeadership, publishEvent, subscribeBridge } from '@/lib/eventsBridge';

type ParsedServerEvent = {
  endpoint?: string;
  action?: unknown;
  id?: unknown;
};

function firstDefined(value: Record<string, unknown>, keys: string[]): unknown {
  return keys.map((key) => value[key]).find((candidate) => candidate !== undefined && candidate !== null);
}

function parseServerEvent(raw: unknown): ParsedServerEvent {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const value = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
    const endpoint = firstDefined(value, ['endpoint', 'path', 'resource', 'collection', 'model', 'entity', 'table']);
    const action = firstDefined(value, ['action', 'event', 'type']);
    const id = firstDefined(value, ['id', 'pk', 'item_id', 'itemId']);
    const endpointName = endpoint ? String(endpoint).split('/').filter(Boolean).pop() : undefined;
    return { endpoint: endpointName, action, id };
  } catch {
    return {};
  }
}

function dispatchServerChange(eventName: string, detail: ParsedServerEvent): void {
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch {
    // Custom events are best-effort and must not break the SSE subscription.
  }
}

function eventRecipientId(raw: unknown): number | null {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return null;
    const value = Number((parsed as Record<string, unknown>).recipient_id);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function useNetworkToasts(showToast: ReturnType<typeof useToast>['showToast']): void {
  useEffect(() => {
    const onOnline = async () => {
      try {
        showToast('Conexión restablecida. Sincronizando operaciones y refrescando datos…', 'info');
        await refetchAllResources({ force: true });
        showToast('Datos actualizados tras recuperar la red.', 'success');
      } catch (error) {
        console.warn('[Network] Error al refrescar datos tras reconexión', error);
        showToast('Reconectado, pero ocurrió un error al refrescar datos.', 'warning');
      }
    };
    const onOffline = () => showToast('Sin conexión. Navegación sin conexión habilitada con datos guardados.', 'warning');
    const onQueueFlushed = (event: Event) => {
      const remaining = (event as CustomEvent<{ remaining?: number }>).detail?.remaining ?? 0;
      const message = remaining === 0
        ? 'Sincronización sin conexión completada. Todo al día.'
        : `Sincronización completada con ${remaining} pendientes.`;
      showToast(message, 'success');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offline-queue-flushed', onQueueFlushed);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offline-queue-flushed', onQueueFlushed);
    };
  }, [showToast]);
}

/**
 * Mantiene sincronizadas las dos capas de datos de la aplicación:
 * useResource (CRUD genérico/cache propio) y React Query (consultas/estadísticas).
 * Se agrupan eventos cercanos porque una operación puede tocar varias entidades.
 */
function useDataConsistencyEvents(): void {
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void Promise.allSettled([
          queryClient.invalidateQueries({ refetchType: 'active' }),
          refetchAllResources({ force: true }),
        ]);
      }, 75);
    };

    const onResourceChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ endpoint?: unknown; local?: unknown }>).detail || {};
      // Los eventos SSE de chat no traen endpoint; no deben invalidar toda la app.
      if (!detail.endpoint && detail.local !== true) return;
      scheduleRefresh();
    };

    window.addEventListener('server-resource-changed', onResourceChanged);
    return () => {
      window.removeEventListener('server-resource-changed', onResourceChanged);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);
}

function useRateLimitToast(showToast: ReturnType<typeof useToast>['showToast']): void {
  const lastRateLimitAtRef = useRef(0);
  useEffect(() => {
    const onRateLimitExceeded = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      const endpoint = typeof detail.endpoint === 'string' ? detail.endpoint : 'API';
      const endpointLabel = endpoint.includes('animals') ? 'Animales' : endpoint;
      const now = Date.now();
      if (now - lastRateLimitAtRef.current < 15_000) return;
      lastRateLimitAtRef.current = now;
      const wait = typeof detail.waitSeconds === 'number' && detail.waitSeconds > 0
        ? ` Inténtalo nuevamente en ${detail.waitSeconds} segundos.`
        : '';
      showToast(
        `Se alcanzó el límite de solicitudes en ${endpointLabel}. El servidor indicó RATE_LIMIT_EXCEEDED.${wait}`,
        'warning',
        6000,
      );
    };

    window.addEventListener('rate-limit-exceeded', onRateLimitExceeded);
    return () => window.removeEventListener('rate-limit-exceeded', onRateLimitExceeded);
  }, [showToast]);
}

type ShowToast = ReturnType<typeof useToast>['showToast'];

function showSystemChatNotification(sender: string, message: string, senderId: number): void {
  if (document.visibilityState !== 'hidden') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(`Mensaje de ${sender}`, {
      body: message,
      tag: `chat-${senderId}`,
    });
  } catch {
    // La notificación interna ya fue publicada; la del sistema es opcional.
  }
}

function processChatPayload(payload: unknown, currentUserId: number, showToast: ShowToast): void {
  const targetUserId = eventRecipientId(payload);
  if (targetUserId !== null && targetUserId !== currentUserId) return;
  const chatEvent = parseChatRealtimeEvent(payload);
  if (!chatEvent) return;

  if (chatEvent.kind === 'read') OfflineChatService.markMessagesRead(chatEvent.messageIds);
  else OfflineChatService.receiveFromServer(chatEvent.message);
  window.dispatchEvent(new CustomEvent('chat-realtime-updated', { detail: chatEvent }));
  window.dispatchEvent(new CustomEvent('chat-unread-refresh'));

  if (chatEvent.kind !== 'received') return;
  const sender = chatEvent.message.sender_name || 'Un compañero';
  if (window.location.pathname !== '/chat') {
    showToast(`${sender}: ${chatEvent.message.message}`, 'info', 6000);
  }
  showSystemChatNotification(sender, chatEvent.message.message, chatEvent.message.sender_id);
}

function processServerPayload(payload: unknown, currentUserId: number, showToast: ShowToast): void {
  const parsed = parseServerEvent(payload);
  dispatchServerChange('server-global-change', parsed);
  dispatchServerChange('server-resource-changed', parsed);
  processChatPayload(payload, currentUserId, showToast);
}

function startServerEvents(handlePayload: (payload: unknown) => void): () => void {
  let leadership = claimLeadership();
  let unsubscribeSSE: (() => void) | null = null;
  let unsubscribeBridge: (() => void) | null = null;
  let leaderCheckTimer: ReturnType<typeof setInterval> | null = null;
  let isCleanedUp = false;

  const promoteToLeader = () => {
    if (isCleanedUp) return;
    if (unsubscribeBridge) {
      unsubscribeBridge();
      unsubscribeBridge = null;
    }
    connectSSE();
    unsubscribeSSE = sse.subscribe((payload) => {
      publishEvent(payload);
      handlePayload(payload);
    });
  };

  const setupFollower = () => {
    if (isCleanedUp) return;
    unsubscribeBridge = subscribeBridge(handlePayload);

    // Watch for leader health: if leader beat becomes stale, attempt promotion
    leaderCheckTimer = setInterval(() => {
      if (isCleanedUp) return;
      const attempt = claimLeadership();
      if (attempt.isLeader) {
        if (leaderCheckTimer) clearInterval(leaderCheckTimer);
        leadership = attempt;
        promoteToLeader();
      }
    }, 3000);
  };

  const onLeaderChanged = () => {
    if (isCleanedUp || leadership.isLeader) return;
    const attempt = claimLeadership();
    if (attempt.isLeader) {
      if (leaderCheckTimer) clearInterval(leaderCheckTimer);
      leadership = attempt;
      promoteToLeader();
    }
  };

  window.addEventListener('sse-leader-changed', onLeaderChanged);

  if (leadership.isLeader) {
    promoteToLeader();
  } else {
    setupFollower();
  }

  return () => {
    isCleanedUp = true;
    window.removeEventListener('sse-leader-changed', onLeaderChanged);
    if (leaderCheckTimer) clearInterval(leaderCheckTimer);
    if (leadership.isLeader) {
      closeSSE();
    }
    unsubscribeSSE?.();
    unsubscribeBridge?.();
    leadership.release();
  };
}

function useServerEvents(isAuthenticated: boolean, currentUserId: number | null, showToast: ShowToast): void {
  useEffect(() => {
    if (!isAuthenticated || currentUserId === null) {
      OfflineChatService.setCurrentUser(null);
      return undefined;
    }
    OfflineChatService.setCurrentUser(currentUserId);
    const handle = (payload: unknown) => processServerPayload(payload, currentUserId, showToast);
    const stop = startServerEvents(handle);
    return stop;
  }, [currentUserId, isAuthenticated, showToast]);
}

export function GlobalNetworkHandlers(): null {
  const { showToast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const userId = Number(user?.id);
  useNetworkToasts(showToast);
  useDataConsistencyEvents();
  useRateLimitToast(showToast);
  useServerEvents(
    isAuthenticated,
    Number.isFinite(userId) ? userId : null,
    showToast,
  );

  return null;
}
