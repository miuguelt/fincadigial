import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Heart,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/shared/ui/dialog';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import type { HerdKpis, KpiStatus, RiskEntry, RiskListKey } from '@/entities/reproduction/model/herdKpis.types';
import { useToast } from '@/app/providers/ToastContext';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';
import AssistedCalvingForm from '@/widgets/reproduction/AssistedCalvingForm';
import KpiMetricCard from '@/widgets/reproduction/herd-kpis/KpiMetricCard';
import { getTotalInseminations } from '@/pages/dashboard/admin/analytics/components/analyticsAdapters';

const PERIODS = [3, 6, 12, 24];
const CHART_COLOR = '#e11d75';

interface FertilityData {
  period_months: number;
  conception_rate_pct: number;
  conception_by_technique: { natural: number; artificial: number };
  avg_interval_between_births_days: number;
  perinatal_mortality_rate_pct: number;
  events_by_month: Record<string, number>;
  top_females: FemaleRanking[];
  bottom_females: FemaleRanking[];
}

interface FemaleRanking {
  animal_id: number;
  record: string;
  inseminations: number;
  positive: number;
  rate: number;
}

interface FertilityDashboardProps {
  isEmbedded?: boolean;
  onRegisterEvent?: (animalId: number, record?: string) => void;
}

type AttentionDefinition = {
  key: RiskListKey;
  title: string;
  description: string;
  tone: 'danger' | 'warning' | 'info';
};

const ATTENTION_DEFINITIONS: AttentionDefinition[] = [
  { key: 'overdue_births', title: 'Partos vencidos', description: 'Revisar estado y preparar atención', tone: 'danger' },
  { key: 'due_for_dry_off', title: 'Secado pendiente', description: 'Planificar descanso antes del parto', tone: 'danger' },
  { key: 'unconfirmed_services', title: 'Servicios sin diagnóstico', description: 'Programar palpación o ecografía', tone: 'warning' },
  { key: 'repeat_breeders', title: 'Hembras repetidoras', description: 'Revisar condición, sanidad y técnica', tone: 'warning' },
  { key: 'open_over_limit', title: 'Días abiertos excedidos', description: 'Definir siguiente servicio o descarte', tone: 'warning' },
  { key: 'heifers_without_service', title: 'Novillas sin servicio', description: 'Verificar peso y entrada al programa', tone: 'info' },
];

const TONE_STYLES: Record<AttentionDefinition['tone'], { card: string; badge: string; icon: string }> = {
  danger: { card: 'border-rose-500/25 bg-rose-500/[0.04]', badge: 'bg-rose-600 text-white', icon: 'text-rose-600' },
  warning: { card: 'border-amber-500/25 bg-amber-500/[0.04]', badge: 'bg-amber-400 text-slate-950', icon: 'text-amber-600' },
  info: { card: 'border-sky-500/25 bg-sky-500/[0.04]', badge: 'bg-sky-600 text-white', icon: 'text-sky-600' },
};

const formatDate = (value?: string | null) => (value ? formatDateColombia(value) : 'sin fecha');

const formatAttentionDetail = (key: RiskListKey, entry: RiskEntry) => {
  switch (key) {
    case 'overdue_births': return `${entry.days_overdue ?? 0} días vencido · FPP ${formatDate(entry.expected_birth_date)}`;
    case 'due_for_dry_off': return `${entry.days_late ?? 0} días de atraso · secar ${formatDate(entry.dry_off_date)}`;
    case 'upcoming_births': return `Faltan ${entry.days_to_birth ?? 0} días · FPP ${formatDate(entry.expected_birth_date)}`;
    case 'unconfirmed_services': return `${entry.days_since_service ?? 0} días desde el servicio`;
    case 'repeat_breeders': return `${entry.failed_services ?? 0} servicios fallidos`;
    case 'open_over_limit': return `${entry.days_open ?? 0} días abiertos · ${entry.services_since_calving ?? 0} servicios`;
    case 'heifers_without_service': return `${entry.age_months ?? '—'} meses · lista para revisar`;
    default: return entry.reason || 'Requiere seguimiento';
  }
};

function LoadingState() {
  return (
    <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/50 bg-muted/40" />)}
    </div>
  );
}

function FemaleRankingList({ title, description, items, tone, onAnimalClick, onRegisterEvent }: {
  title: string;
  description: string;
  items: FemaleRanking[];
  tone: 'success' | 'danger';
  onAnimalClick: (animalId: number) => void;
  onRegisterEvent?: (animalId: number, record?: string) => void;
}) {
  return (
    <Card className="min-w-0 rounded-2xl">
      <CardHeader className="border-b border-border/50 p-4 sm:p-5">
        <CardTitle className="flex items-center gap-2 text-base">
          {tone === 'success' ? <Award className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:p-4">
        {items.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No hay datos suficientes en este período.</p> : items.map((female, index) => (
          <div
            key={female.animal_id}
            onClick={() => onAnimalClick(female.animal_id)}
            className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onAnimalClick(female.animal_id); }}
            aria-label={`Abrir ficha de ${female.record}`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Badge className={`${getStatusBadgeClass(tone)} shrink-0 rounded-lg`}>#{index + 1}</Badge>
              <div className="min-w-0">
                <span className="fit-clamp block text-sm font-bold text-foreground">{female.record}</span>
                <span className="block text-[11px] font-medium text-muted-foreground">{female.inseminations} servicios · {female.positive} positivas</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`${tone === 'success' ? 'text-emerald-600' : 'text-rose-600'} text-sm font-black`}>{female.rate}%</span>
              {tone === 'danger' && onRegisterEvent && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegisterEvent(female.animal_id, female.record);
                  }}
                  className="h-8 px-2 text-xs font-bold gap-1 rounded-lg border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 shrink-0"
                  title="Registrar novedad o celo para este animal"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Novedad</span>
                </Button>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AttentionCard({ definition, entries, onAnimalClick, onRegisterEvent }: {
  definition: AttentionDefinition;
  entries: RiskEntry[];
  onAnimalClick: (animalId: number) => void;
  onRegisterEvent?: (animalId: number, record?: string) => void;
}) {
  const style = TONE_STYLES[definition.tone];
  const Icon = definition.tone === 'danger' ? AlertTriangle : definition.tone === 'warning' ? ClipboardCheck : Calendar;

  return (
    <Card className={`min-w-0 rounded-2xl border ${style.card}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-sm"><Icon className={`h-4 w-4 shrink-0 ${style.icon}`} /><span className="fit-clamp">{definition.title}</span></CardTitle>
            <CardDescription className="mt-1 text-[11px]">{definition.description}</CardDescription>
          </div>
          <Badge className={`${style.badge} shrink-0 font-black`}>{entries.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-1">
        {entries.slice(0, 4).map((entry) => (
          <div
            key={`${definition.key}-${entry.animal_id}`}
            onClick={() => onAnimalClick(entry.animal_id)}
            className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl bg-background/70 px-3 py-2 text-left transition-colors hover:bg-background cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onAnimalClick(entry.animal_id); }}
            aria-label={`Abrir ficha de ${entry.record}`}
          >
            <div className="min-w-0 flex-1">
              <span className="fit-clamp block text-sm font-bold text-primary">{entry.record}</span>
              <span className="fit-clamp block text-[11px] text-muted-foreground">{formatAttentionDetail(definition.key, entry)}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onRegisterEvent && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegisterEvent(entry.animal_id, entry.record);
                  }}
                  className="h-7 px-1.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg shrink-0"
                  title="Registrar novedad"
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  <span className="hidden sm:inline">Novedad</span>
                </Button>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
        {entries.length > 4 && <p className="px-1 text-[11px] text-muted-foreground">y {entries.length - 4} más en Indicadores.</p>}
      </CardContent>
    </Card>
  );
}

function TechniqueBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-foreground">{label}</span><span className="font-black text-foreground">{value}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, backgroundColor: color }} /></div>
    </div>
  );
}

function CountMetricCard({ label, value, hint, icon }: { label: string; value: number | null; hint: string; icon: ReactNode }) {
  return (
    <Card className="min-w-0 rounded-2xl border-l-4 border-l-pink-500 bg-pink-500/[0.03]">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2"><span className="fit-clamp text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span><span className="shrink-0">{icon}</span></div>
        <p className="text-2xl font-black text-foreground">{value === null ? '—' : value.toLocaleString('es-CO')}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function FertilityDashboard({
  isEmbedded = false,
  onRegisterEvent,
}: FertilityDashboardProps) {
  const { goTo } = useRoleNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<FertilityData | null>(null);
  const [kpiData, setKpiData] = useState<HerdKpis | null>(null);
  const [isCalvingModalOpen, setIsCalvingModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [fertilityResult, kpiResult] = await Promise.allSettled([
      reproductionService.getFertilityDashboard(months),
      reproductionService.getHerdKpis(months),
    ]);
    if (fertilityResult.status === 'fulfilled') setData(fertilityResult.value as FertilityData);
    if (kpiResult.status === 'fulfilled') setKpiData(kpiResult.value);
    if (fertilityResult.status === 'rejected' && kpiResult.status === 'rejected') {
      console.error('Error cargando fertilidad:', fertilityResult.reason, kpiResult.reason);
      setFailed(true);
      showToast('No se pudo cargar la fertilidad del ganado', 'error');
    }
    setLoading(false);
  }, [months, showToast]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const monthlyData = useMemo(() => Object.entries(data?.events_by_month ?? {}).map(([month, count]) => ({ month: month.slice(5), count })), [data]);
  const attentionLists = useMemo(() => ATTENTION_DEFINITIONS.map((definition) => ({ definition, entries: kpiData?.risk?.[definition.key] ?? [] })).filter(({ entries }) => entries.length > 0), [kpiData]);
  const attentionCount = attentionLists.reduce((total, item) => total + item.entries.length, 0);
  const efficiency = kpiData?.efficiency;
  const conceptionStatus: KpiStatus | null = kpiData?.status?.conception_rate_pct ?? null;
  const pregnancyRate = efficiency?.pregnancy_rate_pct ?? data?.conception_rate_pct ?? null;
  const pregnancyLabel = efficiency ? 'Tasa de preñez' : 'Tasa de concepción';
  const inseminations = efficiency?.total_services ?? (data ? getTotalInseminations(data) : null);
  const mortality = efficiency?.perinatal_mortality_pct ?? data?.perinatal_mortality_rate_pct ?? null;
  const interval = efficiency?.calving_interval_days.avg ?? data?.avg_interval_between_births_days ?? null;
  const openAnimal = (animalId: number) => setSelectedAnimalId(animalId);

  if (loading && !data && !kpiData) return <LoadingState />;
  if (!data && !kpiData) {
    return (
      <Card className="rounded-2xl"><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <Activity className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-base font-bold">{failed ? 'No se pudo cargar la fertilidad' : 'Todavía no hay datos de fertilidad'}</h2>
        <p className="max-w-md text-sm text-muted-foreground">Registra celos, servicios, diagnósticos y partos para que el sistema pueda orientar las decisiones de la finca.</p>
        <Button onClick={() => void loadDashboard()} className="gap-2"><RefreshCw className="h-4 w-4" /> Reintentar</Button>
      </CardContent></Card>
    );
  }

  return (
    <div className={isEmbedded ? 'space-y-4' : 'min-h-full space-y-5 overflow-x-hidden p-4 sm:p-6 lg:p-8'}>
      {!isEmbedded ? (
        <DataScreenHeader
          leading={<Button variant="ghost" size="icon" onClick={() => goTo('/admin/reproduction')} className="h-9 w-9 shrink-0 rounded-full border border-border/60" aria-label="Volver a gestión reproductiva"><ArrowLeft className="h-4 w-4" /></Button>}
          icon={<Heart className="h-5 w-5 text-white" />}
          iconClassName="from-pink-500 to-rose-600 shadow-pink-500/20"
          title={<>Fertilidad del <span className="text-pink-600">ganado</span></>}
          description="Qué animal requiere atención y cómo está respondiendo el programa"
          actions={<div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"><Button variant="outline" size="sm" onClick={() => void loadDashboard()} className="h-10 gap-2 rounded-lg font-semibold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar</Button><Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value, 10))}><SelectTrigger className="h-10 w-full rounded-lg font-semibold sm:w-[180px]"><SelectValue placeholder="Período" /></SelectTrigger><SelectContent>{PERIODS.map((period) => <SelectItem key={period} value={period.toString()}>Últimos {period} meses</SelectItem>)}</SelectContent></Select></div>}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-bold">
              <Heart className="h-4 w-4 text-pink-600" /> Balance de Fertilidad y Decisiones del Ganado
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Efectividad de servicios, comparación de técnicas (monta vs pajilla) y hembras que requieren atención.
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto"><Button variant="outline" size="sm" onClick={() => void loadDashboard()} className="h-10 flex-1 gap-2 rounded-lg sm:flex-none" aria-label="Actualizar fertilidad"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /><span className="sm:hidden">Actualizar</span></Button><Select value={months.toString()} onValueChange={(value) => setMonths(parseInt(value, 10))}><SelectTrigger className="h-10 min-w-0 flex-1 rounded-lg font-semibold sm:w-[180px] sm:flex-none"><SelectValue placeholder="Período" /></SelectTrigger><SelectContent>{PERIODS.map((period) => <SelectItem key={period} value={period.toString()}>Últimos {period} meses</SelectItem>)}</SelectContent></Select></div>
        </div>
      )}

      {loading && (data || kpiData) ? <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-pulse rounded-full bg-pink-500" /></div> : null}

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.10] via-card to-card"><CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Lectura rápida</p><h2 className="mt-1 text-lg font-black">{attentionCount > 0 ? `${attentionCount} seguimientos para priorizar` : 'El ganado no tiene alertas prioritarias'}</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">{attentionCount > 0 ? 'Abre la ficha de cada animal para revisar reproducción, sanidad, condición y próximos pasos.' : 'Continúa registrando cada celo, servicio y diagnóstico para sostener la trazabilidad.'}</p></div><div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 sm:flex"><ClipboardCheck className="h-5 w-5" /></div></div>
          <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => goTo('/admin/reproduction?tab=eventos')} className="h-9 gap-2 rounded-lg bg-emerald-600 font-bold text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Registrar evento</Button><Button variant="outline" size="sm" onClick={() => goTo('/admin/reproduction?tab=indicadores')} className="h-9 gap-2 rounded-lg font-semibold">Ver listas completas <ChevronRight className="h-4 w-4" /></Button></div>
        </CardContent></Card>

        <Card className="rounded-2xl bg-card"><CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2"><CardTitle className="text-base">Estado del ganado</CardTitle><CardDescription className="text-xs">Hembras vivas y en qué punto del ciclo están</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-2 p-4 pt-2 sm:grid-cols-4 sm:p-5 sm:pt-2">{[
          ['Preñadas', kpiData?.inventory.pregnant ?? 0, 'text-emerald-600'], ['Servidas', kpiData?.inventory.served_pending ?? 0, 'text-sky-600'], ['Vacías', kpiData?.inventory.open ?? 0, 'text-amber-600'], ['Novillas', kpiData?.inventory.heifers ?? 0, 'text-violet-600'],
        ].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-border/60 bg-muted/20 p-2.5"><p className="fit-clamp text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-black ${color}`}>{value}</p></div>)}</CardContent></Card>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMetricCard
          label={pregnancyLabel}
          value={pregnancyRate}
          unit="%"
          target={kpiData?.targets.pregnancy_rate_pct?.target ?? null}
          status={kpiData ? kpiData.status.pregnancy_rate_pct : conceptionStatus}
          sample={efficiency?.resolved_services}
          hint={pregnancyRate !== null ? `${Math.round(pregnancyRate / 10)} de cada 10 vacas servidas quedan preñadas.` : 'Detección de celo × concepción.'}
          icon={pregnancyRate !== null && pregnancyRate >= 50 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-amber-600" />}
        />
        <KpiMetricCard label="Intervalo entre partos" value={interval} unit="días" target={kpiData?.efficiency.calving_interval_days.target ?? null} status={kpiData?.efficiency.calving_interval_days.status ?? null} sample={kpiData?.efficiency.calving_interval_days.n} hint="Tiempo entre partos de la misma hembra." icon={<Calendar className="h-4 w-4 text-blue-600" />} />
        <KpiMetricCard label="Mortalidad perinatal" value={mortality} unit="%" target={kpiData?.targets.perinatal_mortality_pct?.target ?? 5} status={kpiData?.status.perinatal_mortality_pct ?? null} sample={efficiency?.total_births} hint="Crías muertas sobre el total nacido." icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} />
        <CountMetricCard label="Servicios registrados" value={inseminations} hint={`Período de ${months} meses.`} icon={<Sparkles className="h-4 w-4 text-pink-600" />} />
      </section>

      {attentionLists.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-black sm:text-lg">Qué revisar hoy</h2>
              <p className="text-xs text-muted-foreground">Toca un animal para abrir su ficha completa o registra una novedad inmediata.</p>
            </div>
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">{attentionCount} pendientes</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attentionLists.map(({ definition, entries }) => (
              <AttentionCard
                key={definition.key}
                definition={definition}
                entries={entries}
                onAnimalClick={openAnimal}
                onRegisterEvent={onRegisterEvent}
              />
            ))}
          </div>
        </section>
      ) : (
        <Card className="rounded-2xl border-emerald-500/25 bg-emerald-500/[0.04]">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Sin seguimientos reproductivos prioritarios</p>
              <p className="mt-1 text-xs text-muted-foreground">El sistema no encontró partos vencidos, servicios atrasados ni hembras repetidoras en este corte.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="min-w-0 rounded-2xl"><CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2"><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-pink-600" /> Servicios por mes</CardTitle><CardDescription className="text-xs">Montas e inseminaciones registradas en el período</CardDescription></CardHeader><CardContent className="p-3 sm:p-5">{monthlyData.length > 0 ? <div className="h-52 w-full sm:h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100,116,139,0.15)" /><XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><ChartTooltip cursor={{ fill: 'rgba(225,29,117,0.06)' }} /><Bar dataKey="count" fill={CHART_COLOR} radius={[5, 5, 0, 0]} name="Servicios" /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-muted-foreground">No hay servicios registrados en este período.</p>}</CardContent></Card>
        <Card className="rounded-2xl">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-blue-600" /> Resultado por técnica
            </CardTitle>
            <CardDescription className="text-xs">
              Ayuda a decidir entre monta natural e inseminación artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <TechniqueBar label="Monta natural" value={data?.conception_by_technique.natural ?? 0} color="#3b82f6" />
            <TechniqueBar label="Inseminación artificial" value={data?.conception_by_technique.artificial ?? 0} color="#10b981" />
            {data && data.conception_by_technique && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 text-xs text-foreground flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {data.conception_by_technique.natural >= data.conception_by_technique.artificial
                      ? 'La monta natural presenta mayor efectividad en este corte.'
                      : 'La inseminación artificial presenta mayor efectividad en este corte.'}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Utilice esta información para decidir cuándo asignar toro en potrero de repaso o programar inseminador.
                  </p>
                </div>
              </div>
            )}
            <p className="rounded-xl bg-muted/35 p-3 text-[11px] leading-relaxed text-muted-foreground">
              La tasa se interpreta sobre servicios con desenlace. Un servicio pendiente no se cuenta como fracaso hasta que vence su ventana biológica.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FemaleRankingList
          title="Hembras con mejor respuesta"
          description="Útiles para identificar animales y manejos que están funcionando"
          items={data?.top_females ?? []}
          tone="success"
          onAnimalClick={openAnimal}
        />
        <FemaleRankingList
          title="Hembras para revisar"
          description="No es descarte automático: abre la ficha o registra celo/novedad de inmediato"
          items={data?.bottom_females ?? []}
          tone="danger"
          onAnimalClick={openAnimal}
          onRegisterEvent={onRegisterEvent}
        />
      </section>

      {!isEmbedded && <Dialog open={isCalvingModalOpen} onOpenChange={setIsCalvingModalOpen}><DialogTrigger asChild><Button className="fixed bottom-5 right-5 z-20 h-12 gap-2 rounded-full bg-emerald-600 px-4 font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 sm:static sm:h-10 sm:rounded-lg sm:px-3"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Registrar parto asistido</span><span className="sm:hidden">Parto</span></Button></DialogTrigger><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl p-0 border border-border shadow-2xl"><DialogHeader className="border-b bg-gradient-to-r from-emerald-600 to-teal-600 p-5 pr-12 text-white"><DialogTitle className="flex items-center gap-2 text-lg"><Heart className="h-5 w-5" /> Registrar parto asistido & cría</DialogTitle><DialogDescription className="text-xs text-emerald-100/90 font-medium mt-0.5">Protocolo veterinario post-parto, atención del neonato y alta en inventario</DialogDescription></DialogHeader><div className="p-4 sm:p-6"><AssistedCalvingForm onComplete={() => { setIsCalvingModalOpen(false); void loadDashboard(); }} onCancel={() => setIsCalvingModalOpen(false)} /></div></DialogContent></Dialog>}
      {selectedAnimalId ? <AnimalDetailModal isOpen={Boolean(selectedAnimalId)} onOpenChange={(open) => { if (!open) setSelectedAnimalId(null); }} animalId={selectedAnimalId} /> : null}
    </div>
  );
}
