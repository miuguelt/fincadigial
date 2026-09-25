import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/ui/cn';
import { isDialogClosingRecently } from '@/shared/utils/modalGuard';
import type { RecentChangeAction } from '@/shared/utils/recentChanges';

const DEFAULT_GRID = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

interface CRUDCardGridProps<T extends { id: number }> {
  items: T[];
  config: any;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onOpenDetail: (item: T) => void;
  recentFlags?: Record<string, RecentChangeAction>;
}

/** Campos del registro cuando la pantalla no aporta su propia tarjeta. */
const DefaultCardBody = <T extends { id: number }>({ item, columns }: { item: T; columns: any[] }) => (
  <div className="grid grid-cols-2 gap-3 text-xs">
    {columns.map((col: any) => {
      const raw = (item as any)[col.key];
      const rendered = col.render ? col.render(raw, item) : (raw != null && raw !== '' ? String(raw) : '-');
      return (
        <div key={String(col.key)} className="min-w-0 space-y-1">
          <div className="text-muted-foreground font-medium text-[11px] uppercase tracking-wide">{col.label}</div>
          <div className="fit-clamp font-medium text-foreground">
            {rendered ?? '-'}
          </div>
        </div>
      );
    })}
  </div>
);

/**
 * Rejilla de tarjetas para `viewMode: 'cards'`.
 *
 * La tarjeta entera es el disparador del detalle salvo que la pantalla aporte
 * `renderCard`, que gestiona sus propias acciones.
 */
export function CRUDCardGrid<T extends { id: number }>({
  items,
  config,
  selectedIds,
  onToggleSelect,
  onOpenDetail,
  recentFlags,
}: CRUDCardGridProps<T>) {
  const openDetail = (item: T) => {
    if (isDialogClosingRecently()) return;
    // El gate del modal interno vive en AdminCRUDPage.openDetail: esta rejilla
    // solo reenvía, para que tarjetas y tabla se comporten igual cuando la
    // pantalla aporta su propio manejador externo de detalle.
    onOpenDetail(item);
  };

  return (
    <div className={`grid ${config.cardGridClassName || DEFAULT_GRID} gap-3 sm:gap-4 lg:gap-5 auto-rows-fr`}>
      {items.map((item) => {
        const firstCol = config.columns[0];
        const rawTitle = (item as any)[firstCol?.key];
        const titleText = String(rawTitle ?? `${config.entityName} #${item.id}`);
        const isSelected = selectedIds.includes(item.id);
        const recent = recentFlags?.[String(item.id)];
        const selectionControlId = `crud-card-select-${item.id}`;

        return (
          <Card
            key={item.id}
            id={`crud-item-${item.id}`}
            data-crud-id={item.id}
            className={cn(
              'group/crud-card relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-200/90 dark:border-slate-800/90 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:-translate-y-1',
              isSelected && 'ring-2 ring-primary shadow-lg shadow-primary/20 border-primary',
              recent && (recent === 'created'
                ? 'crud-highlight-created ring-4 ring-emerald-500/50 border-emerald-500 shadow-2xl shadow-emerald-500/25'
                : 'crud-highlight-updated ring-2 ring-blue-500/40 border-blue-500')
            )}
            onClick={config.renderCard ? undefined : () => openDetail(item)}
            role={config.renderCard ? undefined : 'button'}
            tabIndex={config.renderCard ? undefined : 0}
            onKeyDown={config.renderCard ? undefined : (e) => {
              const target = e.target as HTMLElement | null;
              if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail(item);
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const current = e.currentTarget as HTMLElement;
                const next = current.nextElementSibling as HTMLElement | null;
                if (next && (next.getAttribute('role') === 'button' || next.tabIndex >= 0)) {
                  next.focus();
                }
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const current = e.currentTarget as HTMLElement;
                const prev = current.previousElementSibling as HTMLElement | null;
                if (prev && (prev.getAttribute('role') === 'button' || prev.tabIndex >= 0)) {
                  prev.focus();
                }
              } else if ((e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (config.enableSelection && onToggleSelect) {
                  onToggleSelect(item.id);
                }
              }
            }}
          >
            {recent === 'created' && (
              <div
                className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-lg shadow-emerald-600/30 animate-pulse select-none pointer-events-none"
                aria-label="Registro recién creado"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                ✨ Nuevo
              </div>
            )}
            {recent === 'updated' && (
              <div
                className="absolute left-3 top-3 z-30 flex items-center gap-1.5 rounded-full bg-blue-600 dark:bg-blue-500 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-lg shadow-blue-600/30 select-none pointer-events-none"
                aria-label="Registro actualizado"
              >
                Actualizado
              </div>
            )}

            {config.enableSelection && (
              <label
                htmlFor={selectionControlId}
                className="absolute right-3 top-3 z-30 flex h-11 w-11 min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl border border-border/80 bg-card shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id={selectionControlId}
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(item.id)}
                  aria-label={`Seleccionar ${config.entityName} ${item.id}`}
                  title="Seleccionar para acciones de traslado"
                />
              </label>
            )}

            {!config.renderCard && (
              <CardHeader className="py-3 flex-shrink-0 border-b border-border/30">
                <CardTitle className="text-sm font-semibold fit-clamp" title={titleText}>
                  {titleText}
                </CardTitle>
              </CardHeader>
            )}

            <CardContent
              className={config.renderCard
                ? '!p-0 w-full min-w-0 flex-1 flex flex-col min-h-0 overflow-hidden'
                : 'py-2.5 px-3 flex-1 flex flex-col min-h-0 overflow-hidden'}
            >
              {config.renderCard
                ? config.renderCard(item, (target: T) => openDetail(target))
                : <DefaultCardBody item={item} columns={config.columns} />}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
