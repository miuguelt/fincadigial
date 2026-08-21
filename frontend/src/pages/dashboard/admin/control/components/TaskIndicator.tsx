import { AlertCircle, CheckCircle, Milk, Stethoscope } from 'lucide-react';

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
      <div className="rounded-xl border border-border bg-muted p-4 text-foreground">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm font-semibold leading-relaxed">
            No pudimos confirmar todas las tareas. Puedes seguir registrando y volver a revisar cuando haya señal.
          </p>
        </div>
      </div>
    );
  }

  if (!noMilkToday && !hasSickAnimals) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-bold">Las tareas registradas están al día.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${hasSickAnimals ? 'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100' : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'}`}>
      <h2 className="px-1 text-sm font-black">Revisa estas tareas</h2>
      <div className="mt-2 space-y-2">
        {hasSickAnimals && (
          <div className="flex flex-col gap-2 rounded-lg bg-background/70 p-3 min-[420px]:flex-row min-[420px]:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <Stethoscope className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm font-semibold leading-relaxed">
                <span className="font-black">{sickAnimals}</span> animal{sickAnimals !== 1 ? 'es' : ''} necesita{sickAnimals !== 1 ? 'n' : ''} atención.
              </p>
            </div>
            <button onClick={onShowSickAnimals} className="min-h-11 shrink-0 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2">
              Ver cuáles
            </button>
          </div>
        )}

        {noMilkToday && (
          <div className="flex flex-col gap-2 rounded-lg bg-background/70 p-3 min-[420px]:flex-row min-[420px]:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <Milk className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" />
              <p className="text-sm font-semibold leading-relaxed">Falta registrar el ordeño de hoy.</p>
            </div>
            {canRecord && (
              <button onClick={onRegisterMilk} className="min-h-10 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700">
                Registrar ordeño
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
