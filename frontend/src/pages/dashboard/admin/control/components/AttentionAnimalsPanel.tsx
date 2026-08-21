import { forwardRef } from 'react';
import { CheckCircle2, CloudOff, Stethoscope } from 'lucide-react';
import { AttentionAnimalRow } from './AttentionAnimalRow';
import { describeAttentionCount, type AttentionAnimalView } from './attentionAnimals.model';

interface AttentionAnimalsPanelProps {
  animals: AttentionAnimalView[];
  /** true mientras se cargan los controles: no se afirma "ninguno". */
  loading?: boolean;
  /** true cuando la consulta falló: se distingue de "no hay animales". */
  unavailable?: boolean;
  /** false cuando el usuario no tiene permiso de registrar. */
  canRecord?: boolean;
  onReview: (animalId: number) => void;
}

/**
 * Lista los animales en alerta con nombre, estado y acción, en vez de dejar
 * al operario buscando el conteo dentro del historial completo.
 */
export const AttentionAnimalsPanel = forwardRef<HTMLElement, AttentionAnimalsPanelProps>(
  function AttentionAnimalsPanel(
    { animals, loading = false, unavailable = false, canRecord = true, onReview },
    ref,
  ) {
    return (
      <section
        ref={ref}
        tabIndex={-1}
        aria-labelledby="animales-atencion-title"
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
      >
        <div className="flex items-start gap-2.5">
          <Stethoscope
            className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h2 id="animales-atencion-title" className="text-lg font-bold leading-tight">
              Animales que necesitan atención
            </h2>
            {!loading && !unavailable && animals.length > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {describeAttentionCount(animals.length)}. Empieza por los de arriba.
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-4 space-y-2" aria-hidden="true">
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
        )}

        {!loading && unavailable && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted p-3">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-semibold leading-relaxed">
              No pudimos consultar el estado de los animales. Vuelve a intentar cuando haya señal.
            </p>
          </div>
        )}

        {!loading && !unavailable && animals.length === 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-sm font-bold leading-relaxed">
              Ningún animal necesita atención en este momento.
            </p>
          </div>
        )}

        {!loading && !unavailable && animals.length > 0 && (
          <ul className="mt-4 space-y-2.5">
            {animals.map((animal) => (
              <AttentionAnimalRow
                key={animal.animalId}
                animal={animal}
                canRecord={canRecord}
                onReview={onReview}
              />
            ))}
          </ul>
        )}
      </section>
    );
  },
);
