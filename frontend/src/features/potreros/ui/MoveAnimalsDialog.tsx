import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, MapPin, Search, Undo2 } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/ui/cn';
import type { BoardField } from '../model/usePotrerosBoard';

interface MoveAnimalsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Cantidad de animales que se van a mover. */
  count: number;
  fields: BoardField[];
  /** Animales por potrero, ya contados en el tablero. */
  countByField: Map<number, number>;
  /** Potrero de origen cuando todos vienen del mismo sitio. */
  originFieldId?: number | null;
  saving: boolean;
  onConfirm: (targetFieldId: number | null) => void;
}

const REST_LABEL = (field: BoardField) => {
  if (field.isGrazingReady) return 'Listo para pastorear';
  if (field.restDaysRemaining && field.restDaysRemaining > 0) {
    return `Descansando · faltan ${field.restDaysRemaining} ${field.restDaysRemaining === 1 ? 'día' : 'días'}`;
  }
  return null;
};

export function MoveAnimalsDialog({
  isOpen,
  onClose,
  count,
  fields,
  countByField,
  originFieldId,
  saving,
  onConfirm,
}: MoveAnimalsDialogProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | 'none' | null>(null);

  const options = useMemo(() => {
    const term = query.trim().toLowerCase();
    return fields
      .filter((field) => field.id !== originFieldId)
      .filter((field) => !term || field.name.toLowerCase().includes(term))
      .map((field) => {
        const current = countByField.get(field.id) || 0;
        const capacity = field.capacity;
        const free = capacity ? capacity - current : null;
        const overflow = free != null && free < count;
        return { field, current, capacity, free, overflow };
      });
  }, [count, countByField, fields, originFieldId, query]);

  const handleClose = () => {
    setSelected(null);
    setQuery('');
    onClose();
  };

  const confirm = () => {
    if (selected == null) return;
    onConfirm(selected === 'none' ? null : selected);
    setSelected(null);
    setQuery('');
  };

  const selectedOverflow = options.find((option) => option.field.id === selected)?.overflow;

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      title="¿A qué potrero los llevas?"
      subtitle={`${count} ${count === 1 ? 'animal seleccionado' : 'animales seleccionados'}`}
      description="Elige el potrero de destino para el ganado seleccionado"
      size="lg"
      footer={(
        <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="outline" size="lg" onClick={handleClose} className="min-h-12 sm:min-w-32">
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={confirm}
            loading={saving}
            disabled={selected == null || saving}
            className="min-h-12 sm:min-w-48"
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            Mover {count} {count === 1 ? 'animal' : 'animales'}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {fields.length > 6 && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar potrero por nombre"
              className="h-12 pl-11 text-base"
              aria-label="Buscar potrero de destino"
            />
          </div>
        )}

        <div className="space-y-2">
          {options.map(({ field, current, capacity, free, overflow }) => {
            const isSelected = selected === field.id;
            const rest = REST_LABEL(field);
            return (
              <button
                key={field.id}
                type="button"
                onClick={() => setSelected(field.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                  'min-h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/50',
                )}
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {isSelected ? <Check className="h-6 w-6" /> : <MapPin className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-foreground" style={{ overflowWrap: 'break-word' }}>
                    {field.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {capacity
                      ? `Tiene ${current} de ${capacity} · ${Math.max(0, free ?? 0)} ${free === 1 ? 'cupo libre' : 'cupos libres'}`
                      : `Tiene ${current} ${current === 1 ? 'animal' : 'animales'} · sin capacidad registrada`}
                  </span>
                  {rest && (
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold',
                        field.isGrazingReady
                          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
                      )}
                    >
                      {rest}
                    </span>
                  )}
                </span>
                {overflow && (
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" aria-label="Se pasa de la capacidad" />
                )}
              </button>
            );
          })}

          {options.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No hay otros potreros disponibles con ese nombre.
            </p>
          )}

          <button
            type="button"
            onClick={() => setSelected('none')}
            aria-pressed={selected === 'none'}
            className={cn(
              'flex min-h-16 w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              selected === 'none' ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/50',
            )}
          >
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                selected === 'none' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
              )}
            >
              {selected === 'none' ? <Check className="h-6 w-6" /> : <Undo2 className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold text-foreground">Sacarlos del potrero</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Quedan en la lista de “Sin potrero” hasta que los ubiques.
              </span>
            </span>
          </button>
        </div>

        {selectedOverflow && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Ese potrero queda con más animales de los que aguanta según su capacidad. Puedes seguir, pero
              revisa el aforo.
            </p>
          </div>
        )}
      </div>
    </GenericModal>
  );
}

export default MoveAnimalsDialog;
