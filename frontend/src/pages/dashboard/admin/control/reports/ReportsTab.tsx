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
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
        <h2 className="text-lg font-bold leading-tight">Resumen del periodo</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Del {formatDayShort(range.start)} al {formatDayShort(range.end)}.
        </p>
        <div className="mt-3">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </section>

      <section
        aria-labelledby="reporte-leche-title"
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
      >
        <h2 id="reporte-leche-title" className="flex items-center gap-2 text-lg font-bold">
          <Milk className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          Ordeño del periodo
        </h2>

        {milkLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
        ) : milk.unavailable ? (
          <p className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm font-semibold">
            No pudimos consultar la producción de leche. Vuelve a intentar cuando haya señal.
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
            <div className="mt-4">
              <MilkTrendChart points={milk.points} bestDate={milk.bestDay?.date} />
            </div>
          </>
        )}
      </section>

      <section
        aria-labelledby="reporte-salud-title"
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
      >
        <h2 id="reporte-salud-title" className="flex items-center gap-2 text-lg font-bold">
          <HeartPulse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Estado del ganado
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Según la última revisión registrada de cada animal.
        </p>

        {controlsLoading ? (
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
        ) : controlsUnavailable ? (
          <p className="mt-4 rounded-lg border border-border bg-muted p-3 text-sm font-semibold">
            No pudimos consultar las revisiones. Vuelve a intentar cuando haya señal.
          </p>
        ) : (
          <div className="mt-4">
            <HealthBreakdownBars breakdown={health} />
          </div>
        )}
      </section>

      <section
        aria-labelledby="reporte-pendientes-title"
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
      >
        <h2 id="reporte-pendientes-title" className="text-lg font-bold leading-tight">
          Animales sin revisión reciente
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Llevan más de {STALE_CHECK_DAYS} días sin que se registre una revisión.
        </p>
        {!controlsLoading && !controlsUnavailable && (
          <div className="mt-3">
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
        className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
      >
        <h2 id="reporte-peso-title" className="flex items-center gap-2 text-lg font-bold">
          <Scale className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Pesajes del periodo
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
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
