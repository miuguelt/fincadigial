import { AlertCircle, CheckCircle } from 'lucide-react';

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
  onScrollToHealth: () => void;
}

export function TaskIndicator({
  canRecord = true,
  milkKnown = true,
  controlsKnown = true,
  noMilkToday: noMilkTodayRaw,
  hasSickAnimals: hasSickAnimalsRaw,
  sickAnimals,
  onRegisterMilk,
  onScrollToHealth,
}: TaskIndicatorProps) {
  // Sin datos de la fuente no se afirma nada: se evita el falso "todo al día".
  const noMilkToday = milkKnown && noMilkTodayRaw;
  const hasSickAnimals = controlsKnown && hasSickAnimalsRaw;
  const unknown = !milkKnown || !controlsKnown;

  const bgClass = unknown
    ? 'bg-muted border-border text-foreground'
    : noMilkToday
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : hasSickAnimals
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800';

  return (
    <div className={`rounded-xl p-4 border ${bgClass}`}>
      <div className="flex items-center gap-3">
        {unknown ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
        ) : noMilkToday ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
        ) : hasSickAnimals ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        ) : (
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
        )}
        <div className="flex-1 min-w-0">
          {unknown ? (
            <p className="text-sm font-semibold">
              Sin datos suficientes para evaluar las tareas de hoy.
            </p>
          ) : noMilkToday ? (
            <p className="text-sm font-semibold">
              No has registrado el ordeño de hoy.{' '}
              {canRecord && (
                <button onClick={onRegisterMilk} className="underline font-bold hover:text-amber-900">
                  Registrar ahora
                </button>
              )}
            </p>
          ) : hasSickAnimals ? (
            <p className="text-sm font-semibold">
              Hay <span className="font-bold">{sickAnimals}</span> animal{sickAnimals !== 1 ? 'es' : ''} que necesita{sickAnimals !== 1 ? 'n' : ''} atención.{' '}
              <button onClick={onScrollToHealth} className="underline font-bold hover:text-red-900">
                Ver animales
              </button>
            </p>
          ) : (
            <p className="text-sm font-semibold">✅ Todo al día por hoy.</p>
          )}
        </div>
      </div>
    </div>
  );
}
