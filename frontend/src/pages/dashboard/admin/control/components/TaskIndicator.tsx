import { AlertCircle, CheckCircle2, Milk, Stethoscope, Sparkles } from 'lucide-react';

interface TaskIndicatorProps {
  /** false cuando el usuario no puede registrar (sin permisos): no se sugiere la acción. */
  canRecord?: boolean;
  /** false cuando la fuente de ordeño falló: no se afirma "no registraste". */
  milkKnown?: boolean;
  /** false cuando la fuente de controles falló. */
  controlsKnown?: boolean;
  noMilkToday: boolean;
  hasSickAnimals: boolean;
  sickAnimals: number;
  onRegisterMilk: () => void;
  /** Lleva la vista al listado con nombre y estado de cada animal en alerta. */
  onShowSickAnimals: () => void;
}

export function TaskIndicator({
  canRecord = true,
  milkKnown = true,
  controlsKnown = true,
  noMilkToday: noMilkTodayRaw,
  hasSickAnimals: hasSickAnimalsRaw,
  sickAnimals,
  onRegisterMilk,
  onShowSickAnimals,
}: TaskIndicatorProps) {
  // Sin datos de la fuente no se afirma nada: se evita el falso "todo al día".
  const noMilkToday = milkKnown && noMilkTodayRaw;
  const hasSickAnimals = controlsKnown && hasSickAnimalsRaw;
  const unknown = !milkKnown || !controlsKnown;

  if (unknown) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/50 p-4 text-foreground backdrop-blur-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground shadow-sm">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold leading-relaxed">
            No pudimos confirmar todas las tareas. Puedes seguir registrando y volver a revisar cuando haya señal.
          </p>
        </div>
      </div>
    );
  }

  if (!noMilkToday && !hasSickAnimals) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-card p-4 text-emerald-950 shadow-sm backdrop-blur-sm dark:border-emerald-500/20 dark:text-emerald-100 sm:p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3 w-3" />
              <span>Jornada al día</span>
            </div>
            <p className="mt-0.5 text-sm font-bold sm:text-base">Las tareas registradas están al día.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-sm backdrop-blur-sm transition-all ${hasSickAnimals ? 'border-red-500/30 bg-gradient-to-br from-red-500/10 via-amber-500/5 to-card text-foreground dark:border-red-500/20' : 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card text-foreground dark:border-amber-500/20'}`}>
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Revisa estas tareas</h2>
      </div>

      <div className="space-y-2.5">
        {hasSickAnimals && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-500/20 bg-card/90 p-3.5 shadow-sm transition-all hover:border-red-500/40 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <Stethoscope className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium leading-snug text-foreground">
                <span className="font-black text-red-600 dark:text-red-400">{sickAnimals}</span> animal{sickAnimals !== 1 ? 'es' : ''} necesita{sickAnimals !== 1 ? 'n' : ''} atención.
              </p>
            </div>
            <button
              type="button"
              onClick={onShowSickAnimals}
              className="flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm shadow-red-600/30 transition-all hover:bg-red-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Ver cuáles
            </button>
          </div>
        )}

        {noMilkToday && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-card/90 p-3.5 shadow-sm transition-all hover:border-amber-500/40 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                <Milk className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium leading-snug text-foreground">Falta registrar el ordeño de hoy.</p>
            </div>
            {canRecord && (
              <button
                type="button"
                onClick={onRegisterMilk}
                className="flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-sm shadow-amber-600/30 transition-all hover:bg-amber-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                Registrar ordeño
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
