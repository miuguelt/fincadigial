import React from 'react';
import { AlertTriangle, Undo2, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { PendingUndo } from '../model/usePotrerosBoard';

interface BoardTotals {
  fields: number;
  assigned: number;
  unassigned: number;
  capacity: number;
  available: number;
}

/** Cifras del tablero: una sola fuente de números para toda la pantalla. */
export const BoardTotalsGrid: React.FC<{ totals: BoardTotals }> = ({ totals }) => {
  const cards = [
    { label: 'Potreros', value: String(totals.fields) },
    { label: 'Animales ubicados', value: String(totals.assigned) },
    { label: 'Sin potrero', value: String(totals.unassigned) },
    {
      label: 'Cupos libres',
      value: totals.capacity > 0 ? String(totals.available) : '—',
      hint: totals.capacity > 0 ? `Capacidad total: ${totals.capacity}` : 'Falta registrar capacidad',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border-2 border-border bg-card p-3">
          <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
          <p className="mt-1 text-3xl font-black text-foreground">{card.value}</p>
          {card.hint && <p className="mt-0.5 text-xs text-muted-foreground">{card.hint}</p>}
        </div>
      ))}
    </div>
  );
};

export const BoardNotice: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    role="status"
    className="flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
  >
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
    <p className="text-sm font-medium">{children}</p>
  </div>
);

interface UndoBarProps {
  undo: PendingUndo;
  busy: boolean;
  onUndo: () => void;
  onDismiss: () => void;
}

/** Aviso de traslado reciente con opción de revertirlo. */
export const UndoBar: React.FC<UndoBarProps> = ({ undo, busy, onUndo, onDismiss }) => (
  <div className="flex flex-col gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm font-medium text-foreground">
      Moviste {undo.animalIds.length} {undo.animalIds.length === 1 ? 'animal' : 'animales'} a{' '}
      <strong>{undo.destinationLabel}</strong>.
    </p>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="h-11" onClick={onUndo} disabled={busy}>
        <Undo2 className="mr-2 h-4 w-4" />
        Deshacer
      </Button>
      <Button variant="ghost" size="sm" className="h-11" onClick={onDismiss} aria-label="Cerrar aviso">
        <X className="h-4 w-4" />
      </Button>
    </div>
  </div>
);
