import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/ui/cn';
import { isDialogClosingRecently } from '@/shared/utils/modalGuard';

const DEFAULT_GRID = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

interface CRUDCardGridProps<T extends { id: number }> {
  items: T[];
  config: any;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onOpenDetail: (item: T) => void;
}

/** Campos del registro cuando la pantalla no aporta su propia tarjeta. */
const DefaultCardBody = <T extends { id: number }>({ item, columns }: { item: T; columns: any[] }) => (
  <div className="grid grid-cols-2 gap-3 text-xs">
    {columns.map((col: any) => {
      const raw = (item as any)[col.key];
      return (
        <div key={String(col.key)} className="min-w-0 space-y-1">
          <div className="text-muted-foreground font-medium text-[11px] uppercase tracking-wide">{col.label}</div>
          <div className="fit-clamp font-medium text-foreground" title={String(raw ?? '-')}>
            {String(raw ?? '-')}
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
}: CRUDCardGridProps<T>) {
  const detailEnabled = config.enableDetailModal !== false;
  const openDetail = (item: T) => {
    if (isDialogClosingRecently()) return;
    if (detailEnabled) onOpenDetail(item);
  };

  return (
    <div className={`grid ${config.cardGridClassName || DEFAULT_GRID} gap-3 sm:gap-4 lg:gap-5 auto-rows-fr`}>
      {items.map((item) => {
        const firstCol = config.columns[0];
        const rawTitle = (item as any)[firstCol?.key];
        const titleText = String(rawTitle ?? `${config.entityName} #${item.id}`);
        const isSelected = selectedIds.includes(item.id);

        return (
          <Card
            key={item.id}
            className={cn(
              'group/crud-card relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-200/90 dark:border-slate-800/90 bg-card shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-emerald-500/60 dark:hover:border-emerald-400/60 hover:-translate-y-1',
              isSelected && 'ring-2 ring-primary shadow-lg shadow-primary/20 border-primary'
            )}
            onClick={config.renderCard ? undefined : () => openDetail(item)}
            role={config.renderCard ? undefined : 'button'}
            tabIndex={config.renderCard ? undefined : 0}
            onKeyDown={config.renderCard ? undefined : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetail(item);
              }
            }}
          >
            {config.enableSelection && (
              <div
                className="absolute right-3 top-3 z-30 rounded-xl border border-border/80 bg-card p-2 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(item.id)}
                  aria-label={`Seleccionar ${config.entityName} ${item.id}`}
                  title="Seleccionar para acciones de traslado"
                />
              </div>
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
