import { AlertCircle, CheckCircle } from 'lucide-react';

interface TaskIndicatorProps {
  noMilkToday: boolean;
  hasSickAnimals: boolean;
  sickAnimals: number;
  onRegisterMilk: () => void;
  onScrollToHealth: () => void;
}

export function TaskIndicator({
  noMilkToday,
  hasSickAnimals,
  sickAnimals,
  onRegisterMilk,
  onScrollToHealth,
}: TaskIndicatorProps) {
  const bgClass = noMilkToday
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : hasSickAnimals
      ? 'bg-red-50 border-red-200 text-red-800'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800';

  return (
    <div className={`rounded-xl p-4 border ${bgClass}`}>
      <div className="flex items-center gap-3">
        {noMilkToday ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
        ) : hasSickAnimals ? (
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
        ) : (
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
        )}
        <div className="flex-1 min-w-0">
          {noMilkToday ? (
            <p className="text-sm font-semibold">
              No has registrado el ordeño de hoy.{' '}
              <button onClick={onRegisterMilk} className="underline font-bold hover:text-amber-900">
                Registrar ahora
              </button>
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
