import { CheckCircle2, Clock, Filter, LifeBuoy, Plus, RefreshCw, Sparkles, Stethoscope } from 'lucide-react';
import type { AssistanceNetwork, TechnicalAssistanceRequest } from '@/entities/campesino';
import { Button } from '@/shared/ui/button';
import { AssistanceCard, AssistanceDetailDialog, AssistanceEmptyState, AssistanceGuidance, AssistanceLoadError, AssistanceSearchField, CATEGORIES, NewAssistanceDialog, VeterinarianNetworkBanner } from '@/widgets/assistance';
import { CampesinoViewShell } from '@/widgets/layout/CampesinoViewShell';

export type FilterTab = 'all' | 'waiting' | 'in_progress' | 'answered' | 'resolved';
type Counts = { all: number; waiting: number; inProgress: number; answered: number; resolved: number };

interface TechnicalAssistanceContentProps {
  network: AssistanceNetwork | null;
  networkLoading: boolean;
  networkError: string | null;
  loadNetwork: () => void;
  items: TechnicalAssistanceRequest[];
  counts: Counts;
  activeTab: FilterTab;
  setActiveTab: (tab: FilterTab) => void;
  search: string;
  setSearch: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  loading: boolean;
  loadError: string | null;
  visibleItems: TechnicalAssistanceRequest[];
  load: () => void | Promise<void>;
  showNewDialog: boolean;
  setShowNewDialog: (open: boolean) => void;
  handleCreate: (data: { title: string; category: string; description: string; priority: string; attachment?: File }) => Promise<void>;
  detailItem: TechnicalAssistanceRequest | null;
  showDetail: boolean;
  setShowDetail: (open: boolean) => void;
  setDetailItem: (item: TechnicalAssistanceRequest | null) => void;
  handleOpenDetail: (item: TechnicalAssistanceRequest) => void;
  handleCancel: (item: TechnicalAssistanceRequest) => void | Promise<void>;
}

export function TechnicalAssistanceContent({
  network, networkLoading, networkError, loadNetwork, items, counts, activeTab, setActiveTab, search,
  setSearch, selectedCategory, setSelectedCategory, loading, loadError, visibleItems, load, showNewDialog,
  setShowNewDialog, handleCreate, detailItem, showDetail, setShowDetail, setDetailItem, handleOpenDetail,
  handleCancel,
}: TechnicalAssistanceContentProps) {
  return (
    <CampesinoViewShell
      title="Asistencia técnica"
      description="Acompañamiento agronómico y veterinario directo para tu finca"
      icon={<LifeBuoy className="h-5 w-5 text-white" aria-hidden="true" />}
      actions={
        <Button
          onClick={() => setShowNewDialog(true)}
          className="min-h-11 w-full items-center gap-2 rounded-xl px-4 font-bold shadow-xs sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Pedir ayuda técnica</span>
        </Button>
      }
    >
      <div className="flex min-h-0 flex-col">
        <div className="space-y-4 pb-28">
          {/* Banner de red veterinaria y guía explicativa */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <VeterinarianNetworkBanner network={network} loading={networkLoading} error={networkError} onRetry={loadNetwork} />
            <AssistanceGuidance />
          </div>

          {/* Filtros rápidos por estado con contadores en tiempo real */}
          {items.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === 'all'
                      ? 'bg-foreground text-background shadow-xs'
                      : 'bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span>Todas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    activeTab === 'all' ? 'bg-background/20 text-background' : 'bg-muted text-foreground'
                  }`}>
                    {counts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('waiting')}
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === 'waiting'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-card border border-border/70 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>En espera</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    activeTab === 'waiting' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                  }`}>
                    {counts.waiting}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('in_progress')}
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === 'in_progress'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-card border border-border/70 text-sky-900 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>En atención</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    activeTab === 'in_progress' ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200'
                  }`}>
                    {counts.inProgress}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('answered')}
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === 'answered'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-card border border-border/70 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Con respuesta</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    activeTab === 'answered' ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200'
                  }`}>
                    {counts.answered}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('resolved')}
                  className={`min-h-10 px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === 'resolved'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-card border border-border/70 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resueltas</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                    activeTab === 'resolved' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {counts.resolved}
                  </span>
                </button>
              </div>

              {/* Barra de búsqueda y selector de categorías */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <AssistanceSearchField value={search} onChange={setSearch} />

                {/* Filtro por Categoría */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`min-h-9 px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Todas las categorías
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`min-h-9 px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCategory === cat.value
                          ? `${cat.bg} ${cat.color} border-2 ${cat.border}`
                          : 'bg-card border border-border/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manejo de errores */}
          {loadError && !loading && (
            <AssistanceLoadError message={loadError} onRetry={() => void load()} />
          )}

          {/* Skeletons de carga */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pt-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : items.length === 0 ? (
            /* Estado vacío global (sin ninguna solicitud) */
            <AssistanceEmptyState onCreate={() => setShowNewDialog(true)} />
          ) : visibleItems.length === 0 ? (
            /* Estado vacío de filtrado */
            <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-border bg-card/50">
              <Filter className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="font-bold text-sm text-foreground">No se encontraron solicitudes con los filtros aplicados</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">Prueba cambiando la pestaña de estado o limpiando el texto de búsqueda.</p>
              <button
                type="button"
                onClick={() => { setActiveTab('all'); setSelectedCategory('all'); setSearch(''); }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors shadow-xs"
              >
                Limpiar todos los filtros
              </button>
            </div>
          ) : (
            /* Cuadrícula de Tarjetas de Asistencia Técnica */
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Mostrando <strong>{visibleItems.length}</strong> de <strong>{items.length}</strong> solicitudes
                </span>
                {(search || activeTab !== 'all' || selectedCategory !== 'all') && (
                  <button
                    type="button"
                    onClick={() => { setActiveTab('all'); setSelectedCategory('all'); setSearch(''); }}
                    className="font-bold text-primary hover:underline"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>

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
            </div>
          )}

          {/* Botón de recarga manual al final de la lista */}
          {!loading && items.length > 0 && (
            <button
              onClick={() => load()}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar solicitudes de la finca
            </button>
          )}
        </div>
      </div>

      {/* Modales de Creación y Detalle */}
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

      {/* Botón flotante accesible Mobile First */}
      {items.length > 0 && (
        <button
          onClick={() => setShowNewDialog(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 h-14 px-6 bg-primary text-primary-foreground rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm sm:text-base border border-primary-foreground/20"
          style={{ fontSize: '16px' }}
          aria-label="Pedir ayuda técnica"
        >
          <LifeBuoy className="w-5 h-5 shrink-0" />
          <span className="hidden sm:inline">Pedir ayuda técnica</span>
          <span className="sm:hidden">Pedir ayuda</span>
        </button>
      )}
    </CampesinoViewShell>
  );
}
