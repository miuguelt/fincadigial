import React from 'react';
import { ChevronDown, ChevronUp, CircleAlert, MapPin } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import type { BoardAnimal, BoardField } from '../model/usePotrerosBoard';
import type { ColumnKey } from '../model/useBoardDragDrop';
import { occupancyTone } from '../model/occupancy';

interface PotreroColumnProps {
  columnKey: ColumnKey;
  label: string;
  /** Animales que pasan el filtro de búsqueda. */
  animals: BoardAnimal[];
  /** Total real del potrero, aunque la búsqueda oculte parte. */
  total: number;
  field?: BoardField;
  isUnassigned?: boolean;
  collapsed: boolean;
  isDropTarget: boolean;
  searching: boolean;
  canSelect: boolean;
  allSelected: boolean;
  onToggleCollapse: (key: ColumnKey) => void;
  onToggleSelection: (animals: BoardAnimal[]) => void;
  children: React.ReactNode;
}

const RestBadge: React.FC<{ field: BoardField }> = ({ field }) => {
  if (field.isGrazingReady === true) {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
        Listo para pastorear
      </span>
    );
  }
  if (field.isGrazingReady === false && field.restDaysRemaining && field.restDaysRemaining > 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
        Descansando · faltan {field.restDaysRemaining} {field.restDaysRemaining === 1 ? 'día' : 'días'}
      </span>
    );
  }
  return null;
};

const columnSubtitle = (isUnassigned: boolean, total: number, capacity: number | null, toneLabel: string) => {
  if (isUnassigned) return `${total} ${total === 1 ? 'animal sin ubicar' : 'animales sin ubicar'}`;
  if (capacity) return `${total} de ${capacity} animales · ${toneLabel}`;
  return `${total} ${total === 1 ? 'animal' : 'animales'} · ${toneLabel}`;
};

/** Columna del tablero: un potrero o el grupo de animales sin ubicar. */
export function PotreroColumn({
  columnKey,
  label,
  animals,
  total,
  field,
  isUnassigned = false,
  collapsed,
  isDropTarget,
  searching,
  canSelect,
  allSelected,
  onToggleCollapse,
  onToggleSelection,
  children,
}: PotreroColumnProps) {
  const capacity = field?.capacity ?? null;
  const tone = occupancyTone(total, capacity);
  const percent = capacity ? Math.min(100, Math.round((total / capacity) * 100)) : null;

  return (
    <section
      data-drop-column={String(columnKey)}
      className={cn(
        'flex flex-col rounded-2xl border-2 bg-card shadow-sm transition-colors',
        isDropTarget ? 'border-primary bg-primary/5' : 'border-border',
      )}
    >
      <header
        className={cn(
          'flex flex-col gap-2 rounded-t-2xl border-b border-border p-3',
          isUnassigned ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/40',
        )}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
              isUnassigned ? 'bg-amber-500 text-slate-950' : 'bg-primary text-primary-foreground',
            )}
          >
            {isUnassigned ? <CircleAlert className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground" style={{ overflowWrap: 'break-word' }}>
              {label}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {columnSubtitle(isUnassigned, total, capacity, tone.label)}
            </p>
          </div>
          <span className={cn('shrink-0 rounded-full px-3 py-1 text-base font-black', tone.badge)}>{total}</span>
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-11 shrink-0 p-0"
            onClick={() => onToggleCollapse(columnKey)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Mostrar animales de ${label}` : `Ocultar animales de ${label}`}
          >
            {collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </Button>
        </div>

        {percent != null && (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className={cn('h-full rounded-full transition-all', tone.bar)} style={{ width: `${percent}%` }} />
          </div>
        )}

        {field && (
          <div className="flex flex-wrap gap-2 text-sm">
            <RestBadge field={field} />
            {field.area && (
              <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                Área: {field.area}
              </span>
            )}
          </div>
        )}

        {canSelect && animals.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-11 w-full justify-center text-sm font-bold"
            onClick={() => onToggleSelection(animals)}
          >
            {allSelected ? 'Quitar la selección' : `Elegir los ${animals.length} de aquí`}
          </Button>
        )}
      </header>

      {!collapsed && (
        <div className="max-h-[26rem] space-y-2 overflow-y-auto overscroll-contain p-2 lg:max-h-[32rem]">
          {animals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              {searching
                ? 'Ningún animal de este potrero coincide con la búsqueda.'
                : isUnassigned
                  ? 'Todo el ganado está ubicado.'
                  : 'Potrero vacío.'}
            </p>
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}

export default PotreroColumn;
