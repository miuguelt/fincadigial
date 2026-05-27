import React, { useState, useEffect, useCallback, useRef } from 'react';
import { campesinoServices, TechnicalAssistanceRequest } from '@/entities/campesino';
import { AssistanceCard, NewAssistanceDialog, AssistanceDetailDialog } from '@/widgets/assistance';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { LifeBuoy, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';

const PAGE_SIZE = 50;

const TechnicalAssistancePage: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<TechnicalAssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<TechnicalAssistanceRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async (q = '', p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p, limit: PAGE_SIZE, sort_by: 'requested_at', sort_order: 'desc' };
      if (q) params.search = q;
      const res = await campesinoServices.technicalAssistance.getPaginated(params);
      setItems(res.data || []);
      setTotal((res as any).total || (res as any).total_items || 0);
      setPage(res.page || 1);
    } catch {
      showToast('Error cargando solicitudes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(q, 1), 300);
  }, [load]);

  useEffect(() => () => searchTimer.current && clearTimeout(searchTimer.current), []);

  const handleCreate = useCallback(async (data: { title: string; category: string; description: string; priority: string }) => {
    try {
      await campesinoServices.technicalAssistance.createOne({
        ...data,
        status: 'open',
        requested_at: new Date().toISOString(),
      });
      showToast('Solicitud enviada con éxito. Un técnico se comunicará contigo pronto.', 'success');
      setSearch('');
      load('', 1);
    } catch {
      showToast('Error al enviar la solicitud. Intentá de nuevo.', 'error');
      throw new Error('Failed to create');
    }
  }, [showToast, load]);

  const handleOpenDetail = useCallback((item: TechnicalAssistanceRequest) => {
    setDetailItem(item);
    setShowDetail(true);
  }, []);

  const handleResolve = useCallback(async (item: TechnicalAssistanceRequest) => {
    if (!item.id) return;
    try {
      await campesinoServices.technicalAssistance.patchOne(item.id, {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      });
      showToast('Solicitud marcada como resuelta.', 'success');
      setShowDetail(false);
      setDetailItem(null);
      load(search, page);
    } catch {
      showToast('Error al actualizar la solicitud.', 'error');
    }
  }, [showToast, load, search, page]);

  const handleCancel = useCallback(async (item: TechnicalAssistanceRequest) => {
    if (!item.id) return;
    try {
      await campesinoServices.technicalAssistance.patchOne(item.id, { status: 'closed' });
      showToast('Solicitud cancelada.', 'success');
      load(search, page);
    } catch {
      showToast('Error al cancelar la solicitud.', 'error');
    }
  }, [showToast, load, search, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por título o categoría..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
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
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16 sm:py-20">
              <div className="w-full max-w-md mx-auto bg-card rounded-xl shadow-lg border border-border/30 p-8 sm:p-10">
                <div className="mb-6 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                    <LifeBuoy className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">¿Tienes un problema en tu finca?</h3>
                <p className="text-sm text-muted-foreground max-w-prose mx-auto mb-6">
                  Podés pedir ayuda a un técnico agrícola. Te contactarán en menos de 48 horas.
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
              <p className="text-xs text-muted-foreground mb-3">{total} solicitud{total !== 1 ? 'es' : ''}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {items.map((item) => (
                  <AssistanceCard
                    key={item.id}
                    item={item}
                    onDetail={handleOpenDetail}
                    onCancel={handleCancel}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => load(search, p)}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        p === page ? 'bg-primary text-primary-foreground' : 'bg-card border border-border/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && items.length > 0 && (
            <button onClick={() => load(search, page)} className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          )}
        </div>
      </div>

      <NewAssistanceDialog open={showNewDialog} onOpenChange={setShowNewDialog} onSave={handleCreate} />
      <AssistanceDetailDialog
        item={detailItem}
        open={showDetail}
        onOpenChange={(o) => { setShowDetail(o); if (!o) setDetailItem(null); }}
        onResolve={handleResolve}
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
