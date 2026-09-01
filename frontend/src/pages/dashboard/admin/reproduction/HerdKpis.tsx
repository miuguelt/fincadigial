import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Activity, CalendarClock, HeartPulse, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { useToast } from '@/app/providers/ToastContext';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import type { HerdKpis as HerdKpisData } from '@/entities/reproduction/model/herdKpis.types';
import KpiMetricCard from '@/widgets/reproduction/herd-kpis/KpiMetricCard';
import ReproductiveInventoryPanel from '@/widgets/reproduction/herd-kpis/ReproductiveInventoryPanel';
import AttentionLists from '@/widgets/reproduction/herd-kpis/AttentionLists';

/**
 * Panel de indicadores reproductivos del hato.
 *
 * Muestra la eficiencia del ciclo (intervalo entre partos, días abiertos,
 * servicios por concepción, detección de celo) contra las metas de la finca, y
 * baja al detalle accionable: qué animal necesita atención y qué viene.
 */

const PERIODS = [6, 12, 24, 36];

interface HerdKpisProps {
  isEmbedded?: boolean;
}

export default function HerdKpisPage({ isEmbedded = false }: HerdKpisProps) {
  const { goTo } = useRoleNavigation();
  const { showToast } = useToast();
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<HerdKpisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getHerdKpis(months);
      setData(response);
      setFailed(false);
    } catch (error) {
      console.error('Error cargando indicadores reproductivos:', error);
      setFailed(true);
      showToast('No se pudieron cargar los indicadores reproductivos', 'error');
    } finally {
      setLoading(false);
    }
  }, [months, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Activity className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-semibold">Calculando indicadores del hato...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 p-6">
        <h2 className="text-lg font-bold">
          {failed ? 'No se pudieron cargar los indicadores' : 'Todavía no hay indicadores'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {failed
            ? 'Revise la conexión con el servidor y vuelva a intentarlo.'
            : 'Registre celos, servicios, diagnósticos y partos para que el hato tenga historial que analizar.'}
        </p>
        <Button onClick={load}>Reintentar</Button>
      </div>
    );
  }

  const { efficiency: eff, inventory, projection } = data;

  return (
    <div className={isEmbedded ? "space-y-6" : "min-h-full space-y-6 overflow-x-hidden p-4 sm:p-6 lg:p-8"}>
      {!isEmbedded ? (
        <DataScreenHeader
          leading={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goTo('/admin/reproduction')}
              className="h-9 w-9 shrink-0 rounded-full border border-border/60"
              aria-label="Volver a gestión reproductiva"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          }
          icon={<Target className="h-5 w-5 text-white" />}
          iconClassName="from-purple-500 to-fuchsia-600 shadow-purple-500/20"
          title={<>Indicadores del <span className="text-purple-600">Hato</span></>}
          description={`Eficiencia reproductiva contra metas · corte ${data.as_of}`}
          actions={
            <Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value, 10))}>
              <SelectTrigger className="h-9 w-full rounded-lg font-semibold sm:w-[190px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((period) => (
                  <SelectItem key={period} value={period.toString()}>
                    Últimos {period} meses
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              Indicadores Clave de Eficiencia del Hato
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Corte actualizado al {data.as_of} · Evaluación biológica de intervalos y tasas
            </p>
          </div>
          <Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value, 10))}>
            <SelectTrigger className="h-9 w-full sm:w-[180px] rounded-lg font-semibold">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((period) => (
                <SelectItem key={period} value={period.toString()}>
                  Últimos {period} meses
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <ReproductiveInventoryPanel inventory={inventory} />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Eficiencia del ciclo
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
          <KpiMetricCard
            label="Intervalo entre partos"
            value={eff.calving_interval_days.avg}
            unit="días"
            target={eff.calving_interval_days.target}
            status={eff.calving_interval_days.status}
            sample={eff.calving_interval_days.n}
            hint="Tiempo entre un parto y el siguiente de la misma vaca."
            icon={<CalendarClock className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiMetricCard
            label="Días abiertos"
            value={eff.days_open.avg}
            unit="días"
            target={eff.days_open.target}
            status={eff.days_open.status}
            sample={eff.days_open.n}
            hint="Del parto hasta la concepción efectiva. Manda sobre el intervalo."
          />
          <KpiMetricCard
            label="Parto a primer servicio"
            value={eff.calving_to_first_service_days.avg}
            unit="días"
            target={eff.calving_to_first_service_days.target}
            status={eff.calving_to_first_service_days.status}
            sample={eff.calving_to_first_service_days.n}
            hint="Qué tan rápido vuelve la vaca al programa reproductivo."
          />
          <KpiMetricCard
            label="Servicios por concepción"
            value={eff.services_per_conception.avg}
            target={eff.services_per_conception.target}
            status={eff.services_per_conception.status}
            sample={eff.services_per_conception.n}
            hint="Pajillas o montas que costó cada preñez lograda."
          />
          <KpiMetricCard
            label="Edad al primer parto"
            value={eff.age_at_first_calving_months.avg}
            unit="meses"
            target={eff.age_at_first_calving_months.target}
            status={eff.age_at_first_calving_months.status}
            sample={eff.age_at_first_calving_months.n}
            hint="Solo cuenta la cohorte que estrenó maternidad en el período."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Fertilidad y resultado del parto
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
          <KpiMetricCard
            label="Tasa de concepción"
            value={eff.conception_rate_pct}
            unit="%"
            target={data.targets.conception_rate_pct?.target ?? null}
            status={data.status.conception_rate_pct}
            sample={eff.resolved_services}
            hint={`${eff.confirmed_pregnancies} preñeces sobre ${eff.resolved_services} servicios resueltos.`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiMetricCard
            label="Detección de celo"
            value={eff.heat_detection_rate_pct}
            unit="%"
            target={data.targets.heat_detection_rate_pct?.target ?? null}
            status={data.status.heat_detection_rate_pct}
            hint={`${eff.observed_heats} celos vistos sobre ${eff.heat_opportunities} oportunidades estimadas.`}
          />
          <KpiMetricCard
            label="Tasa de preñez"
            value={eff.pregnancy_rate_pct}
            unit="%"
            target={data.targets.pregnancy_rate_pct?.target ?? null}
            status={data.status.pregnancy_rate_pct}
            hint="Detección × concepción: el indicador que resume el programa."
            icon={<HeartPulse className="h-4 w-4 text-muted-foreground" />}
          />
          <KpiMetricCard
            label="Mortalidad perinatal"
            value={eff.perinatal_mortality_pct}
            unit="%"
            target={data.targets.perinatal_mortality_pct?.target ?? null}
            status={data.status.perinatal_mortality_pct}
            sample={eff.total_births}
            hint={`${eff.live_calves} crías vivas y ${eff.dead_calves} muertas en el período.`}
          />
          <KpiMetricCard
            label="Pérdida de preñez"
            value={eff.abortion_rate_pct}
            unit="%"
            target={data.targets.abortion_rate_pct?.target ?? null}
            status={data.status.abortion_rate_pct}
            hint="Preñeces confirmadas que no llegaron a parto."
          />
          <KpiMetricCard
            label="Partos con complicación"
            value={eff.calving_complication_rate_pct}
            unit="%"
            target={data.targets.calving_complication_rate_pct?.target ?? null}
            status={data.status.calving_complication_rate_pct}
            sample={eff.total_births}
            hint="Distocias y asistencias registradas al parto."
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Listas de atención
        </h2>
        <AttentionLists risk={data.risk} />
      </section>

      <ProjectionCard projection={projection} />
    </div>
  );
}

/** Carga de trabajo esperada: partos y secados mes a mes. */
function ProjectionCard({ projection }: { projection: HerdKpisData['projection'] }) {
  const months = Array.from(
    new Set([
      ...Object.keys(projection.births_by_month),
      ...Object.keys(projection.dry_offs_by_month),
    ])
  ).sort();

  if (months.length === 0) return null;

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Proyección de partos y secados</CardTitle>
        <CardDescription>Carga esperada de maternidad según las preñeces vigentes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-semibold">Mes</th>
                <th className="py-2 pr-4 text-right font-semibold">Partos</th>
                <th className="py-2 text-right font-semibold">Secados</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr key={month} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-4 font-medium">{month}</td>
                  <td className="py-2 pr-4 text-right font-bold text-emerald-600">
                    {projection.births_by_month[month] ?? 0}
                  </td>
                  <td className="py-2 text-right font-bold text-sky-600">
                    {projection.dry_offs_by_month[month] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
