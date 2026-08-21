import { CalendarClock } from 'lucide-react';
import type { StaleCheckAnimal } from '../controlReport';
import { STALE_CHECK_DAYS } from '../reportExport';

interface PendingChecksListProps {
  animals: StaleCheckAnimal[];
  labelOf: (animalId: number) => string;
  canRecord: boolean;
  onReview: (animalId: number) => void;
  /** Cuántos se listan; el resto se cuenta explícitamente, no se oculta. */
  visibleLimit?: number;
}

/** Animales olvidados: la lista de trabajo que el reporte convierte en tarea. */
export function PendingChecksList({
  animals,
  labelOf,
  canRecord,
  onReview,
  visibleLimit = 5,
}: PendingChecksListProps) {
  if (animals.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
        Todos los animales tienen revisión de los últimos {STALE_CHECK_DAYS} días.
      </p>
    );
  }

  const visible = animals.slice(0, visibleLimit);
  const hidden = animals.length - visible.length;

  return (
    <>
      <ul className="space-y-2">
        {visible.map((animal) => (
          <li
            key={animal.animalId}
            className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 min-[420px]:flex-row min-[420px]:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <CalendarClock
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-extrabold leading-tight">{labelOf(animal.animalId)}</p>
                <p className="text-xs font-medium text-muted-foreground">
                  {animal.daysSinceCheck} días sin revisión
                </p>
              </div>
            </div>
            {canRecord && (
              <button
                type="button"
                onClick={() => onReview(animal.animalId)}
                className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Revisar
              </button>
            )}
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="mt-2 text-xs font-semibold text-muted-foreground">
          Y {hidden} animal{hidden !== 1 ? 'es' : ''} más en la misma situación.
        </p>
      )}
    </>
  );
}
