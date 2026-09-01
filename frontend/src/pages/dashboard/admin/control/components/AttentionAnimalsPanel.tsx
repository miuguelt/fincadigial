import { forwardRef } from 'react';
import { CheckCircle2, CloudOff, HeartPulse, Sparkles } from 'lucide-react';
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
        className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="animales-atencion-title" className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              Animales que necesitan atención
            </h2>
            {!loading && !unavailable && animals.length > 0 && (
              <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
                {describeAttentionCount(animals.length)}. Empieza por los de arriba.
              </p>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-5 space-y-3" aria-hidden="true">
            <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-28 animate-pulse rounded-2xl bg-muted/60" />
          </div>
        )}

        {!loading && unavailable && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              No pudimos consultar el estado de los animales. Vuelve a intentar cuando haya señal.
            </p>
          </div>
        )}

        {!loading && !unavailable && animals.length === 0 && (
          <div className="mt-5 flex items-center gap-3.5 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-card p-4 text-emerald-950 dark:border-emerald-500/20 dark:text-emerald-100 sm:p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <Sparkles className="h-3 w-3" />
                <span>Salud del Hato Óptima</span>
              </div>
              <p className="mt-0.5 text-sm font-bold sm:text-base">
                Ningún animal necesita atención en este momento.
              </p>
            </div>
          </div>
        )}

        {!loading && !unavailable && animals.length > 0 && (
          <ul className="mt-5 space-y-3">
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
