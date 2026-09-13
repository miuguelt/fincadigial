import type { MouseEvent, ReactNode } from 'react';
import { Edit, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/ui/cn';
import type { CRUDColumn, CRUDConfig } from '@/shared/types/crud';
import { getCrudItemTitle, mapCrudValue, type ForeignKeyLabelMap } from './crudTable.helpers';
import type { RecentChangeAction } from '@/shared/utils/recentChanges';

interface CRUDTableCardViewProps<T extends { id: number }> {
  items: T[];
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  labels: ForeignKeyLabelMap;
  selectedIds?: number[];
  onToggleSelect?: (id: number) => void;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  recentFlags?: Record<string, RecentChangeAction>;
}

export function CRUDTableCardView<T extends { id: number }>(props: CRUDTableCardViewProps<T>) {
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {props.items.map((item) => <CRUDTableCard key={item.id} item={item} {...props} />)}
    </div>
  );
}

function CRUDTableCard<T extends { id: number }>({ item, columns, config, labels, selectedIds, onToggleSelect, onOpenDetail, onOpenEdit, onOpenDelete, recentFlags }: CRUDTableCardViewProps<T> & { item: T }) {
  const recent = recentFlags?.[String(item.id)];
  return (
    <div
      id={`crud-item-${item.id}`}
      data-crud-id={item.id}
      className={cn(
        "bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        recent && (recent === 'created'
          ? 'crud-highlight-created ring-4 ring-emerald-500/50 border-emerald-500 shadow-xl shadow-emerald-500/20'
          : 'crud-highlight-updated ring-2 ring-blue-500/40 border-blue-500'),
      )}
      onClick={() => onOpenDetail?.(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail?.(item);
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
        } else if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          onOpenEdit?.(item);
        } else if (e.key === 'Delete') {
          e.preventDefault();
          onOpenDelete?.(item.id);
        }
      }}
    >
      {config.enableSelection && onToggleSelect && <CardSelection config={config} item={item} selected={selectedIds?.includes(item.id) || false} onToggle={onToggleSelect} />}
      {recent === 'created' && (
        <div className="mb-2 flex items-center gap-1.5 w-fit rounded-full bg-emerald-600 dark:bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
          ✨ Nuevo
        </div>
      )}
      <h3 className="font-medium text-sm mb-2 fit-clamp">{getCrudItemTitle(item, config, labels)}</h3>
      <CardFields item={item} columns={columns} labels={labels} />
      <CardActions item={item} config={config} onOpenDetail={onOpenDetail} onOpenEdit={onOpenEdit} onOpenDelete={onOpenDelete} />
    </div>
  );
}

function CardSelection<T extends { id: number }>({ config, item, selected, onToggle }: { config: CRUDConfig<T, any>; item: T; selected: boolean; onToggle: (id: number) => void }) {
  return <div className="absolute top-2 right-2 z-10" onClick={(event) => event.stopPropagation()}><Checkbox checked={selected} onCheckedChange={() => onToggle(item.id)} aria-label={`Seleccionar ${config.entityName} ${item.id}`} /></div>;
}

function CardFields<T extends { id: number }>({ item, columns, labels }: { item: T; columns: CRUDColumn<T>[]; labels: ForeignKeyLabelMap }) {
  return <div className="text-xs text-muted-foreground space-y-1">{columns.slice(1, 3).map((column) => <div key={String(column.key)}><span className="font-medium">{column.label}:</span>{' '}<span>{mapCrudValue((item as any)[column.key], String(column.key), item, labels)}</span></div>)}</div>;
}

interface CardActionsProps<T extends { id: number }> {
  item: T;
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
}

function CardActions<T extends { id: number }>({ item, config, onOpenDetail, onOpenEdit, onOpenDelete }: CardActionsProps<T>) {
  return <div className="flex justify-end gap-2 mt-3">
    {onOpenDetail && <CardAction label={`Ver ${config.entityName}`} onClick={(event) => { event.stopPropagation(); onOpenDetail(item); }}><Eye className="h-3.5 w-3.5" /></CardAction>}
    {onOpenEdit && <CardAction label={`Editar ${config.entityName}`} onClick={(event) => { event.stopPropagation(); onOpenEdit(item); }}><Edit className="h-3.5 w-3.5" /></CardAction>}
    {onOpenDelete && <CardAction label={`Eliminar ${config.entityName}`} onClick={(event) => { event.stopPropagation(); onOpenDelete(item.id); }}><Trash2 className="h-3.5 w-3.5" /></CardAction>}
  </div>;
}

function CardAction({ label, onClick, children }: { label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void; children: ReactNode }) {
  return <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex items-center justify-center border border-border/40 hover:bg-muted rounded-xl" onClick={onClick} aria-label={label}>{children}</Button>;
}
