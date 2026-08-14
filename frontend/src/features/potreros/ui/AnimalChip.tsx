import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/shared/ui/checkbox';
import { cn } from '@/shared/ui/cn';
import type { BoardAnimal } from '../model/usePotrerosBoard';

interface AnimalChipProps {
  animal: BoardAnimal;
  selected: boolean;
  selectable: boolean;
  draggable: boolean;
  dragging: boolean;
  onToggle: (animalId: number) => void;
  onOpen: (animal: BoardAnimal) => void;
  onPointerDown: (event: React.PointerEvent<HTMLElement>, animalId: number) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
}

const describeSex = (sex: string | null) => {
  if (sex === 'Hembra') return { symbol: '♀', text: 'Hembra' };
  if (sex === 'Macho') return { symbol: '♂', text: 'Macho' };
  return { symbol: '•', text: 'Sin sexo registrado' };
};

const describeAge = (months: number | null) => {
  if (months == null) return null;
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest === 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : `${years} a ${rest} m`;
};

/** Ficha compacta de un animal dentro de una columna de potrero. */
export function AnimalChip({
  animal,
  selected,
  selectable,
  draggable,
  dragging,
  onToggle,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: AnimalChipProps) {
  const sex = describeSex(animal.sex);
  const age = describeAge(animal.ageMonths);

  return (
    <div
      onPointerDown={(event) => onPointerDown(event, animal.id)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 bg-card p-2.5 transition-colors',
        selected ? 'border-primary bg-primary/10' : 'border-border',
        dragging && 'opacity-50',
        draggable && 'cursor-grab',
      )}
    >
      {selectable && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center" data-no-drag>
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(animal.id)}
            className="h-7 w-7 rounded-md"
            aria-label={`Elegir ${animal.record}`}
          />
        </span>
      )}

      <button
        type="button"
        onClick={() => onOpen(animal)}
        className="min-w-0 flex-1 rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="block text-base font-bold text-foreground" style={{ overflowWrap: 'break-word' }}>
          {animal.record}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span aria-hidden="true">{sex.symbol}</span> {sex.text}
          </span>
          {age && <span>{age}</span>}
          {animal.weight != null && <span>{animal.weight} kg</span>}
        </span>
      </button>

      {animal.alerts > 0 && (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-bold text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
          title={`${animal.alerts} alerta(s) de sanidad pendientes`}
        >
          <AlertTriangle className="h-4 w-4" />
          {animal.alerts}
        </span>
      )}
    </div>
  );
}

export default AnimalChip;
