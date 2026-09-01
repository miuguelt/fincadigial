import { useMemo, useState } from 'react';
import { Award, CalendarDays, Droplets, HeartPulse, Milk, Scale } from 'lucide-react';
import type { ControlRecord } from '../hooks/controlSummary.utils';
import {
  buildHealthBreakdown,
  buildWeighingReport,
  findAnimalsWithoutRecentCheck,
} from './controlReport';
import {
  formatDayShort,
  formatNumber,
  STALE_CHECK_DAYS,
  type ReportSnapshot,
} from './reportExport';
import { buildPeriodRange, type ReportPeriod } from './reportPeriod';
import { useMilkPeriodReport } from './useMilkPeriodReport';
import { HealthBreakdownBars } from './components/HealthBreakdownBars';
import { MilkTrendChart } from './components/MilkTrendChart';
import { PendingChecksList } from './components/PendingChecksList';
import { PeriodSelector } from './components/PeriodSelector';
import { ReportActions } from './components/ReportActions';
import { ReportStatTile } from './components/ReportStatTile';

interface ReportsTabProps {
  fincaId: number;
  today: string;
  controlRows: ControlRecord[];
  controlsUnavailable: boolean;
  controlsLoading: boolean;
  canRecord: boolean;
  labelOf: (animalId: number) => string;
  onReview: (animalId: number) => void;
  /** Cambia al guardar un registro para volver a pedir el ordeño del periodo. */
  reloadToken?: number;
}

/** Estadísticas del periodo y las tareas que se desprenden de ellas. */
export function ReportsTab({
  fincaId,
  today,
  controlRows,
  controlsUnavailable,
  controlsLoading,
  canRecord,
  labelOf,
  onReview,
  reloadToken = 0,
}: ReportsTabProps) {
  const [period, setPeriod] = useState<ReportPeriod>('semana');
  const range = useMemo(() => buildPeriodRange(period, today), [period, today]);
  const { report: milk, loading: milkLoading } = useMilkPeriodReport(fincaId, range, reloadToken);

  const health = useMemo(() => buildHealthBreakdown(controlRows), [controlRows]);
  const weighing = useMemo(() => buildWeighingReport(controlRows, range), [controlRows, range]);
  const stale = useMemo(
    () => findAnimalsWithoutRecentCheck(controlRows, today, STALE_CHECK_DAYS),
    [controlRows, today],
  );

  const snapshot: ReportSnapshot = { range, milk, health, weighing, staleCount: stale.length };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6">
        <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">Resumen del periodo</h2>
        <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
          Del {formatDayShort(range.start)} al {formatDayShort(range.end)}.
        </p>
        <div className="mt-4">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </section>

      <section
        aria-labelledby="reporte-leche-title"
        className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6"
      >
        <h2 id="reporte-leche-title" className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground sm:text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            <Milk className="h-5 w-5" aria-hidden="true" />
          </div>
          Ordeño del periodo
        </h2>

        {milkLoading ? (
          <div className="mt-5 h-40 animate-pulse rounded-2xl bg-muted/60" aria-hidden="true" />
        ) : milk.unavailable ? (
          <p className="mt-5 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm font-medium text-muted-foreground">
            No pudimos consultar la producción de leche. Vuelve a intentar cuando haya señal.
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <ReportStatTile
                label="Litros del periodo"
                value={formatNumber(milk.totalLiters)}
                unit="L"
                icon={Droplets}
              />
              <ReportStatTile
                label="Promedio por día"
                value={formatNumber(milk.dailyAverage)}
                unit="L"
                hint={`${milk.daysWithRecords} días con ordeño`}
                icon={CalendarDays}
              />
              <ReportStatTile
                label="Mejor día"
                value={milk.bestDay ? formatNumber(milk.bestDay.liters) : null}
                unit="L"
                hint={milk.bestDay ? formatDayShort(milk.bestDay.date) : undefined}
                icon={Award}
                tone="bien"
              />
              <ReportStatTile
                label="Promedio por animal"
                value={milk.litersPerAnimal === null ? null : formatNumber(milk.litersPerAnimal)}
                unit="L"
                icon={Milk}
              />
            </div>
            <div className="mt-5">
              <MilkTrendChart points={milk.points} bestDate={milk.bestDay?.date} />
            </div>
          </>
        )}
      </section>

      <section
        aria-labelledby="reporte-salud-title"
        className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6"
      >
        <h2 id="reporte-salud-title" className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground sm:text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <HeartPulse className="h-5 w-5" aria-hidden="true" />
          </div>
          Estado del ganado
        </h2>
        <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
          Según la última revisión registrada de cada animal.
        </p>

        {controlsLoading ? (
          <div className="mt-5 h-32 animate-pulse rounded-2xl bg-muted/60" aria-hidden="true" />
        ) : controlsUnavailable ? (
          <p className="mt-5 rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm font-medium text-muted-foreground">
            No pudimos consultar las revisiones. Vuelve a intentar cuando haya señal.
          </p>
        ) : (
          <div className="mt-5">
            <HealthBreakdownBars breakdown={health} />
          </div>
        )}
      </section>

      <section
        aria-labelledby="reporte-pendientes-title"
        className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6"
      >
        <h2 id="reporte-pendientes-title" className="text-lg font-black tracking-tight text-foreground sm:text-xl">
          Animales sin revisión reciente
        </h2>
        <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
          Llevan más de {STALE_CHECK_DAYS} días sin que se registre una revisión.
        </p>
        {!controlsLoading && !controlsUnavailable && (
          <div className="mt-4">
            <PendingChecksList
              animals={stale}
              labelOf={labelOf}
              canRecord={canRecord}
              onReview={onReview}
            />
          </div>
        )}
      </section>

      <section
        aria-labelledby="reporte-peso-title"
        className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6"
      >
        <h2 id="reporte-peso-title" className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground sm:text-xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </div>
          Pesajes del periodo
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <ReportStatTile label="Pesajes" value={String(weighing.count)} icon={Scale} />
          <ReportStatTile label="Animales pesados" value={String(weighing.animals)} icon={Scale} />
          <ReportStatTile
            label="Peso promedio"
            value={weighing.averageWeight === null ? null : formatNumber(weighing.averageWeight)}
            unit="kg"
            icon={Scale}
          />
        </div>
      </section>

      <ReportActions snapshot={snapshot} />
    </div>
  );
}
