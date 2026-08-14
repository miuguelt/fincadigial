import { useCallback, useEffect, useRef, useState } from 'react';
import { campesinoServices, type AssistanceInbox, type TechnicalAssistanceRequest } from '@/entities/campesino';
import { useToast } from '@/app/providers/ToastContext';
import { subscribeSSE } from '@/lib/events';

const EMPTY_INBOX: AssistanceInbox = {
  items: [],
  counts: { waiting: 0, mine: 0, active: 0 },
};

type SetItem = (item: TechnicalAssistanceRequest | null) => void;

function useInboxRealtime(
  load: (silent?: boolean) => Promise<void>,
  queueRequest: (requestId?: number) => void,
) {
  useEffect(() => {
    const unsubscribe = subscribeSSE((payload) => {
      if (payload?.data?.type === 'technical_assistance_request') {
        queueRequest(Number(payload.data?.request_id) || undefined);
      } else if (payload?.endpoint === 'technical-assistance') {
        queueRequest();
      }
    });
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) queueRequest();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [load, queueRequest]);
}

function useInboxActions(load: (silent?: boolean) => Promise<void>, setSelected: SetItem) {
  const { showToast } = useToast();
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const claimAndRespond = async (item: TechnicalAssistanceRequest) => {
    if (!item.id) return;
    setClaimingId(item.id);
    try {
      setSelected(await campesinoServices.technicalAssistance.claim(item.id));
      showToast('Caso asignado a ti. El solicitante ya fue notificado.', 'success');
      await load(true);
    } catch {
      showToast('El caso ya fue tomado o no está disponible.', 'warning');
      await load(true);
    } finally {
      setClaimingId(null);
    }
  };

  const submitResponse = async (item: TechnicalAssistanceRequest, notes: string, resolved: boolean) => {
    if (!item.id) return;
    try {
      await campesinoServices.technicalAssistance.respond(item.id, notes, resolved);
      showToast(resolved ? 'Respuesta enviada y caso resuelto.' : 'Respuesta enviada; el caso queda en seguimiento.', 'success');
      setSelected(null);
      await load(true);
    } catch {
      showToast('No fue posible enviar la respuesta. Revisa si otro veterinario tomó el caso.', 'error');
      await load(true);
    }
  };

  return { claimingId, claimAndRespond, submitResponse };
}

function useRealtimeRequestQueue(load: (silent?: boolean) => Promise<void>, showToast: ReturnType<typeof useToast>['showToast']) {
  const [newRequestCount, setNewRequestCount] = useState(0);
  const seenRequestIdsRef = useRef(new Set<number>());
  const burstRequestIdsRef = useRef(new Set<number>());
  const refreshTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const queueRequest = useCallback((requestId?: number) => {
    if (requestId) {
      if (seenRequestIdsRef.current.has(requestId)) return;
      seenRequestIdsRef.current.add(requestId);
      if (seenRequestIdsRef.current.size > 100) {
        const oldest = seenRequestIdsRef.current.values().next().value;
        if (oldest) seenRequestIdsRef.current.delete(oldest);
      }
      burstRequestIdsRef.current.add(requestId);
      setNewRequestCount((count) => count + 1);
    }
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = window.setTimeout(() => {
      void load(true);
      refreshTimerRef.current = null;
    }, 650);
    if (!requestId) return;
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      const count = burstRequestIdsRef.current.size;
      if (count > 0) showToast(count === 1 ? 'Hay una nueva solicitud en la bandeja.' : `Hay ${count} nuevas solicitudes en la bandeja.`, 'info', 5000);
      burstRequestIdsRef.current.clear();
      toastTimerRef.current = null;
    }, 1200);
  }, [load, showToast]);

  useEffect(() => () => {
    if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  return { newRequestCount, queueRequest, acknowledgeNewRequests: () => setNewRequestCount(0) };
}

export function useVeterinarianAssistanceInbox() {
  const { showToast } = useToast();
  const sectionRef = useRef<HTMLElement>(null);
  const [inbox, setInbox] = useState<AssistanceInbox>(EMPTY_INBOX);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TechnicalAssistanceRequest | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setInbox(await campesinoServices.technicalAssistance.getInbox(50));
    } catch {
      if (!silent) showToast('No fue posible cargar la bandeja de asistencia.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') === 'assistance') {
      window.setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, []);
  const realtime = useRealtimeRequestQueue(load, showToast);
  useInboxRealtime(load, realtime.queueRequest);

  const actions = useInboxActions(load, setSelected);

  return {
    sectionRef,
    inbox,
    loading,
    selected,
    setSelected,
    load,
    newRequestCount: realtime.newRequestCount,
    acknowledgeNewRequests: realtime.acknowledgeNewRequests,
    ...actions,
  };
}
