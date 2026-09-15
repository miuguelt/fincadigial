import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { campesinoServices, TechnicalAssistanceRequest, type AssistanceNetwork } from '@/entities/campesino';
import { useToast } from '@/app/providers/ToastContext';
import { subscribeSSE } from '@/lib/events';
import { useSearchParams } from 'react-router-dom';
import { uploadAssistanceAttachment } from '@/entities/campesino/api/assistanceAttachment.service';
import { TechnicalAssistanceContent, type FilterTab } from './TechnicalAssistanceContent';

const TechnicalAssistancePage: React.FC = () => {
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<TechnicalAssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<AssistanceNetwork | null>(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<TechnicalAssistanceRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (searchParams.get('sos') === '1') {
      setShowNewDialog(true);
    }
  }, [searchParams]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await campesinoServices.technicalAssistance.getMine(100);
      setItems(res.items || []);
      setLoadError(null);
    } catch {
      setLoadError('Conserve su información y vuelva a intentarlo. Si el problema continúa, revise la conexión de la finca.');
      if (!silent) showToast('Error cargando solicitudes', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeSSE((payload) => {
      const type = String(payload?.data?.type || '');
      if (!type.startsWith('technical_assistance_')) return;
      showToast(payload.data?.message || 'Tu solicitud de asistencia tiene una actualización.', 'info');
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        void load(true);
        refreshTimerRef.current = null;
      }, 500);
    });
    return () => {
      unsubscribe();
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
    };
  }, [load, showToast]);

  useEffect(() => {
    let active = true;
    setNetworkError(null);
    campesinoServices.technicalAssistance.getNetwork()
      .then((result) => { if (active) setNetwork(result); })
      .catch(() => {
        if (active) {
          setNetwork(null);
          setNetworkError('Puede reintentar ahora; sus solicitudes existentes siguen protegidas y no se borran.');
        }
      })
      .finally(() => { if (active) setNetworkLoading(false); });
    return () => { active = false; };
  }, []);

  const loadNetwork = useCallback(() => {
    setNetworkLoading(true);
    setNetworkError(null);
    campesinoServices.technicalAssistance.getNetwork()
      .then(setNetwork)
      .catch(() => setNetworkError('Puede reintentar ahora; sus solicitudes existentes siguen protegidas y no se borran.'))
      .finally(() => setNetworkLoading(false));
  }, []);

  // Métricas y contadores de estado para navegación rápida
  const counts = useMemo(() => {
    let waiting = 0;
    let inProgress = 0;
    let answered = 0;
    let resolved = 0;

    for (const item of items) {
      const hasAnswer = Boolean(item.resolution_notes && item.resolution_notes.trim().length > 0);
      if (hasAnswer) {
        answered++;
      }
      if (item.status === 'resolved') {
        resolved++;
      } else if (item.status === 'in_progress' && item.assigned_user_id && !hasAnswer) {
        inProgress++;
      } else if (item.status === 'open' || (!item.assigned_user_id && item.status === 'in_progress')) {
        waiting++;
      }
    }

    return { all: items.length, waiting, inProgress, answered, resolved };
  }, [items]);

  // Filtrado compuesto: Tab + Categoría + Búsqueda de texto
  const visibleItems = useMemo(() => {
    let result = items;

    // 1. Filtro por pestaña de estado
    if (activeTab === 'waiting') {
      result = result.filter(
        (item) =>
          (item.status === 'open' || (!item.assigned_user_id && item.status === 'in_progress')) &&
          (!item.resolution_notes || !item.resolution_notes.trim())
      );
    } else if (activeTab === 'in_progress') {
      result = result.filter(
        (item) =>
          item.status === 'in_progress' &&
          Boolean(item.assigned_user_id) &&
          (!item.resolution_notes || !item.resolution_notes.trim())
      );
    } else if (activeTab === 'answered') {
      result = result.filter((item) => Boolean(item.resolution_notes && item.resolution_notes.trim().length > 0));
    } else if (activeTab === 'resolved') {
      result = result.filter((item) => item.status === 'resolved');
    }

    // 2. Filtro por categoría seleccionada
    if (selectedCategory !== 'all') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // 3. Filtro por término de búsqueda
    const term = search.trim().toLocaleLowerCase('es-CO');
    if (term) {
      result = result.filter((item) =>
        [item.title, item.category, item.description, item.assignee?.fullname, item.resolution_notes]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('es-CO').includes(term))
      );
    }

    return result;
  }, [items, activeTab, selectedCategory, search]);

  const handleCreate = useCallback(async (data: { title: string; category: string; description: string; priority: string; attachment?: File }) => {
    try {
      if (data.attachment && typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Conéctese a internet para enviar una foto o un audio.');
      }
      const uploadedAttachment = data.attachment
        ? await uploadAssistanceAttachment(data.attachment)
        : null;
      const result = await campesinoServices.technicalAssistance.createRequest({
        title: data.title,
        category: data.category,
        description: data.description,
        priority: data.priority,
        attachment_blob_id: uploadedAttachment?.id,
      });
      const recipients = result.notification.recipients;
      showToast(
        recipients > 0
          ? `Solicitud enviada. ${recipients} veterinario${recipients === 1 ? '' : 's'} recibieron el aviso.`
          : 'Solicitud guardada. Aún no hay veterinarios vinculados a la finca.',
        recipients > 0 ? 'success' : 'warning',
      );
      setSearch('');
      setActiveTab('all');
      setSelectedCategory('all');
      load();
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Error al enviar la solicitud. Intente de nuevo.';
      showToast(message, 'error');
      throw new Error('Failed to create');
    }
  }, [showToast, load]);

  const handleOpenDetail = useCallback((item: TechnicalAssistanceRequest) => {
    setDetailItem(item);
    setShowDetail(true);
  }, []);

  const handleCancel = useCallback(async (item: TechnicalAssistanceRequest) => {
    if (!item.id) return;
    try {
      await campesinoServices.technicalAssistance.cancelRequest(item.id);
      showToast('Solicitud cancelada.', 'success');
      load();
    } catch {
      showToast('Error al cancelar la solicitud.', 'error');
    }
  }, [showToast, load]);

  return (
    <TechnicalAssistanceContent
      network={network}
      networkLoading={networkLoading}
      networkError={networkError}
      loadNetwork={loadNetwork}
      items={items}
      counts={counts}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      search={search}
      setSearch={setSearch}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      loading={loading}
      loadError={loadError}
      visibleItems={visibleItems}
      load={load}
      showNewDialog={showNewDialog}
      setShowNewDialog={setShowNewDialog}
      handleCreate={handleCreate}
      detailItem={detailItem}
      showDetail={showDetail}
      setShowDetail={setShowDetail}
      setDetailItem={setDetailItem}
      handleOpenDetail={handleOpenDetail}
      handleCancel={handleCancel}
    />
  );
};

export default TechnicalAssistancePage;
