import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { campesinoServices, TechnicalAssistanceRequest, type AssistanceNetwork } from '@/entities/campesino';
import {
  AssistanceCard,
  NewAssistanceDialog,
  AssistanceDetailDialog,
  AssistanceEmptyState,
  AssistanceGuidance,
  AssistanceLoadError,
  AssistanceSearchField,
  VeterinarianNetworkBanner,
} from '@/widgets/assistance';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { LifeBuoy, RefreshCw } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { subscribeSSE } from '@/lib/events';
import { useSearchParams } from 'react-router-dom';
import { uploadAssistanceAttachment } from '@/entities/campesino/api/assistanceAttachment.service';

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
  const [total, setTotal] = useState(0);
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
      setTotal(res.total || 0);
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

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-CO');
    if (!term) return items;
    return items.filter((item) =>
      [item.title, item.category, item.description, item.assignee?.fullname]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es-CO').includes(term))
    );
  }, [items, search]);

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
    <AppLayout
      header={
        <PageHeader
          title="Asistencia Técnica"
          description="Solicitudes de ayuda para tu finca"
          dense
          className="mb-0 p-0"
          titleClassName="text-base sm:text-lg lg:text-xl"
        />
      }
      className="px-2 sm:px-3 pt-0 pb-0 max-w-full"
      contentClassName="space-y-0"
    >
      <div className="flex flex-col flex-1 min-h-0 mt-1">
        <div className="overflow-y-auto flex-1 p-2 sm:p-3 lg:p-4 pb-28">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4">
            <VeterinarianNetworkBanner network={network} loading={networkLoading} error={networkError} onRetry={loadNetwork} />
            <AssistanceGuidance />
            <AssistanceSearchField value={search} onChange={setSearch} />
          </div>

          {loadError && !loading ? (
            <AssistanceLoadError message={loadError} onRetry={() => void load()} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse border border-border/30" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <AssistanceEmptyState onCreate={() => setShowNewDialog(true)} />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                {search ? `${visibleItems.length} de ${total}` : total} solicitud{total !== 1 ? 'es' : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {visibleItems.map((item) => (
                  <AssistanceCard
                    key={item.id}
                    item={item}
                    onDetail={handleOpenDetail}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && items.length > 0 && (
            <button onClick={() => load()} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          )}
        </div>
      </div>

      <NewAssistanceDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onSave={handleCreate}
        recipientCount={network?.total || 0}
      />
      <AssistanceDetailDialog
        item={detailItem}
        open={showDetail}
        onOpenChange={(o) => { setShowDetail(o); if (!o) setDetailItem(null); }}
      />

      {items.length > 0 && <button
        onClick={() => setShowNewDialog(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 h-14 px-6 bg-primary text-primary-foreground rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all font-semibold text-sm sm:text-base"
        style={{ fontSize: '16px' }}
        aria-label="Pedir ayuda técnica"
      >
        <LifeBuoy className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline">Pedir ayuda técnica</span>
        <span className="sm:hidden">Ayuda</span>
      </button>}
    </AppLayout>
  );
};

export default TechnicalAssistancePage;
