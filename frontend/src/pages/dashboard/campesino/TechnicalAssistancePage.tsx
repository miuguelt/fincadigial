import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { campesinoServices, TechnicalAssistanceRequest, type AssistanceNetwork } from '@/entities/campesino';
import {
  AssistanceCard,
  NewAssistanceDialog,
  AssistanceDetailDialog,
  VeterinarianNetworkBanner,
} from '@/widgets/assistance';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { LifeBuoy, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { subscribeSSE } from '@/lib/events';

const TechnicalAssistancePage: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<TechnicalAssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<AssistanceNetwork | null>(null);
  const [networkLoading, setNetworkLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<TechnicalAssistanceRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await campesinoServices.technicalAssistance.getMine(100);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
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
    campesinoServices.technicalAssistance.getNetwork()
      .then((result) => { if (active) setNetwork(result); })
      .catch(() => { if (active) setNetwork(null); })
      .finally(() => { if (active) setNetworkLoading(false); });
    return () => { active = false; };
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

  const handleCreate = useCallback(async (data: { title: string; category: string; description: string; priority: string }) => {
    try {
      const result = await campesinoServices.technicalAssistance.createRequest(data);
      const recipients = result.notification.recipients;
      showToast(
        recipients > 0
          ? `Solicitud enviada. ${recipients} veterinario${recipients === 1 ? '' : 's'} recibieron el aviso.`
          : 'Solicitud guardada. Aún no hay veterinarios vinculados a la finca.',
        recipients > 0 ? 'success' : 'warning',
      );
      setSearch('');
      load();
    } catch {
      showToast('Error al enviar la solicitud. Intentá de nuevo.', 'error');
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
            <VeterinarianNetworkBanner network={network} loading={networkLoading} />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por título o categoría..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-border/50 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-background transition-all"
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-64 rounded-xl bg-muted/50 animate-pulse border border-border/30" />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20">
              <div className="w-full max-w-md mx-auto bg-card rounded-xl shadow-lg border border-border/30 p-8 sm:p-10">
                <div className="mb-6 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LifeBuoy className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">¿Tienes un problema en tu finca?</h3>
                <p className="text-sm text-muted-foreground max-w-prose mx-auto mb-6">
                  Puedes pedir ayuda a la red veterinaria de tu finca. Recibirás la respuesta dentro de Villa Luz.
                </p>
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <LifeBuoy className="w-4 h-4" />
                  Pedir ayuda técnica
                </button>
              </div>
            </div>
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

      <button
        onClick={() => setShowNewDialog(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 h-14 px-6 bg-primary text-primary-foreground rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all font-semibold text-sm sm:text-base"
        style={{ fontSize: '16px' }}
        aria-label="Pedir ayuda técnica"
      >
        <LifeBuoy className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline">Pedir ayuda técnica</span>
        <span className="sm:hidden">Ayuda</span>
      </button>
    </AppLayout>
  );
};

export default TechnicalAssistancePage;
