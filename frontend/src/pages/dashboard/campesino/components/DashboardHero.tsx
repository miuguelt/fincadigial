import { AlertTriangle, CheckCircle2, Clock, Sun, Wifi, WifiOff } from 'lucide-react';
import { FincaHeroBanner } from '@/widgets/finca/hero';
import { getGreeting, getTodayStr } from '../utils/dashboard.utils';

interface DashboardHeroProps {
  fincaName: string;
  isOnline: boolean;
  pendingCount: number;
}

function ConnectionSummary({ isOnline, pendingCount }: Pick<DashboardHeroProps, 'isOnline' | 'pendingCount'>) {
  return (
    <div
      className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
        isOnline
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200'
      }`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" /> : <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{isOnline ? 'Con señal' : 'Sin señal'}</span>
      {pendingCount > 0 && (
        <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white/70 px-2 py-1 dark:bg-black/20">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {pendingCount} por subir
        </span>
      )}
      {isOnline && pendingCount === 0 && <CheckCircle2 className="ml-auto h-4 w-4" aria-hidden="true" />}
    </div>
  );
}

function OfflineNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
      <p className="text-sm leading-relaxed">
        <strong>Puede seguir trabajando sin señal.</strong> Los registros se guardan en este dispositivo y se envían cuando vuelva la conexión.
      </p>
    </div>
  );
}

export function DashboardHero({ fincaName, isOnline, pendingCount }: DashboardHeroProps) {
  return (
    <header className="space-y-3" aria-labelledby="campesino-dashboard-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <Sun className="h-4 w-4" aria-hidden="true" /> {getTodayStr()}
          </p>
          <h1 id="campesino-dashboard-title" className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {getGreeting()}, campesino
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ¿Qué necesita hacer hoy en <strong className="text-foreground">{fincaName}</strong>?
          </p>
        </div>
        <ConnectionSummary isOnline={isOnline} pendingCount={pendingCount} />
      </div>

      <FincaHeroBanner className="rounded-2xl" />
      {!isOnline && <OfflineNotice />}
    </header>
  );
}
