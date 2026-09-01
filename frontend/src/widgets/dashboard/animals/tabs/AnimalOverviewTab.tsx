import React from 'react';
import {
  Scale,
  Calendar,
  Activity,
  ClipboardList,
  MapPin,
  Heart,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Syringe,
  Pill,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { LivestockTagWidget } from '../LivestockTagWidget';
import { AlertsSection } from '../AlertsSection';
import { AnimalBentoStats } from '../components/AnimalBentoStats';

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: any;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1 p-3 rounded-xl bg-background/70 dark:bg-card/40 border border-border/50 transition-all hover:border-border/90">
      <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
        {label}
      </div>
      {children || (
        <div className="text-sm font-bold text-foreground fit-clamp">
          {value ?? '-'}
        </div>
      )}
    </div>
  );
}

function HeroKpiCard({
  label,
  value,
  sub,
  icon,
  accent = 'emerald',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  accent?: 'emerald' | 'blue' | 'amber' | 'purple';
}) {
  const accentStyles: Record<string, { bg: string; ring: string }> = {
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      ring: 'hover:border-emerald-500/40',
    },
    blue: {
      bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      ring: 'hover:border-blue-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      ring: 'hover:border-amber-500/40',
    },
    purple: {
      bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      ring: 'hover:border-purple-500/40',
    },
  };
  const cfg = accentStyles[accent] || accentStyles.emerald;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 dark:border-white/10 bg-card/80 dark:bg-card/40 p-3.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        cfg.ring
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
          {icon}
        </div>
      </div>
      <div className="mt-1 text-lg font-black text-foreground tabular-nums tracking-tight fit-clamp" title={String(value ?? '')}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-muted-foreground font-medium mt-0.5 fit-clamp">
          {sub}
        </div>
      )}
    </div>
  );
}

function HealthScoreIndicator({
  diseases,
  controls,
  animal,
}: {
  diseases: any[];
  controls: any[];
  animal: any;
}) {
  const score = React.useMemo(() => {
    let pts = 0;
    const activeDiseases = diseases.filter((d: any) => d.status === 'Activo').length;
    if (activeDiseases === 0) pts += 40;
    else if (activeDiseases === 1) pts += 20;

    if (animal.weight && animal.weight > 0) pts += 20;

    if (controls.length > 0) {
      const sorted = [...controls]
        .filter((c) => c.checkup_date)
        .sort((a: any, b: any) => new Date(b.checkup_date).getTime() - new Date(a.checkup_date).getTime());
      if (sorted.length > 0) {
        const lastDate = new Date(sorted[0].checkup_date);
        const diff = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 30) pts += 20;
        else if (diff <= 60) pts += 10;
      }
    }

    const pendingAlerts = animal.pending_alerts_count ?? 0;
    if (pendingAlerts === 0) pts += 20;
    else if (pendingAlerts <= 2) pts += 10;
    return pts;
  }, [diseases, controls, animal]);

  const cfg =
    score >= 70
      ? {
          border: 'border-emerald-500/30 dark:border-emerald-500/20',
          bg: 'bg-emerald-500/5 dark:bg-emerald-950/15',
          bar: 'bg-gradient-to-r from-emerald-600 to-teal-400',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          label: 'Óptimo',
        }
      : score >= 40
      ? {
          border: 'border-amber-500/30 dark:border-amber-500/20',
          bg: 'bg-amber-500/5 dark:bg-amber-950/15',
          bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
          text: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          label: 'Atención',
        }
      : {
          border: 'border-rose-500/30 dark:border-rose-500/20',
          bg: 'bg-rose-500/5 dark:bg-rose-950/15',
          bar: 'bg-gradient-to-r from-rose-600 to-red-400',
          text: 'text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
          label: 'Crítico',
        };

  return (
    <div className={cn('rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-sm space-y-3', cfg.border, cfg.bg)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm', cfg.badge)}>
            <Shield className={cn('h-4 w-4', cfg.text)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Score de Salud y Bienestar
              </h3>
              <Badge variant="outline" className={cn('text-[11px] font-bold uppercase px-2 py-0.5', cfg.badge)}>
                {cfg.label}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Evaluación preventiva automatizada sobre 100 puntos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className={cn('text-2xl font-black tabular-nums tracking-tight', cfg.text)}>
            {score}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
        </div>
      </div>

      <div className="relative h-2.5 rounded-full bg-muted/60 dark:bg-muted/30 overflow-hidden ring-1 ring-border/40 p-0.5">
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out shadow-sm', cfg.bar)}
          style={{ width: `${Math.max(score, 5)}%` }}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {[
          { label: 'Sin Enfermedades', ok: diseases.filter((d: any) => d.status === 'Activo').length === 0 },
          { label: 'Peso Registrado', ok: !!(animal.weight && animal.weight > 0) },
          {
            label: 'Control al Día',
            ok:
              controls.length > 0 &&
              (() => {
                const s = [...controls]
                  .filter((c) => c.checkup_date)
                  .sort((a: any, b: any) => new Date(b.checkup_date).getTime() - new Date(a.checkup_date).getTime());
                return (
                  s.length > 0 &&
                  (Date.now() - new Date(s[0].checkup_date).getTime()) / (1000 * 60 * 60 * 24) <= 30
                );
              })(),
          },
          { label: 'Sin Alertas Críticas', ok: (animal.pending_alerts_count ?? 0) === 0 },
        ].map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all bg-card/60',
              item.ok
                ? 'border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                : 'border-amber-500/20 text-amber-800 dark:text-amber-300'
            )}
          >
            {item.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            )}
            <span className="fit-clamp text-[11px] font-semibold">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickStatsGrid({
  vaccinations,
  treatments,
  controls,
  diseases,
}: {
  vaccinations: any[];
  treatments: any[];
  controls: any[];
  diseases: any[];
}) {
  const activeDiseases = diseases.filter((d: any) => d.status === 'Activo').length;

  const adg = React.useMemo(() => {
    if (controls.length < 2) return null;
    const sorted = [...controls]
      .filter((c) => c.weight && c.checkup_date)
      .sort((a, b) => new Date(a.checkup_date).getTime() - new Date(b.checkup_date).getTime());
    if (sorted.length < 2) return null;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const diffDays = (new Date(last.checkup_date).getTime() - new Date(first.checkup_date).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0) return null;
    return ((last.weight - first.weight) / diffDays).toFixed(2);
  }, [controls]);

  const daysSinceLastControl = React.useMemo(() => {
    if (controls.length === 0) return null;
    const sorted = [...controls]
      .filter((c) => c.checkup_date)
      .sort((a, b) => new Date(b.checkup_date).getTime() - new Date(a.checkup_date).getTime());
    if (sorted.length === 0) return null;
    const last = new Date(sorted[0].checkup_date);
    return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  }, [controls]);

  const stats = [
    {
      label: 'Vacunas',
      value: vaccinations.length,
      unit: 'dosis',
      icon: <Syringe className="h-4 w-4" />,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Tratamientos',
      value: treatments.length,
      unit: 'aplicados',
      icon: <Pill className="h-4 w-4" />,
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Controles',
      value: controls.length,
      unit: 'pesajes',
      icon: <ClipboardList className="h-4 w-4" />,
      iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
    },
    {
      label: 'Enf. Activas',
      value: activeDiseases,
      unit: activeDiseases === 0 ? 'sano' : 'atención',
      icon: <AlertTriangle className="h-4 w-4" />,
      iconBg: activeDiseases > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'GDP Promedio',
      value: adg !== null ? `${adg}` : '-',
      unit: 'kg/día',
      icon: <TrendingUp className="h-4 w-4" />,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Días s/ Control',
      value: daysSinceLastControl !== null ? daysSinceLastControl : '-',
      unit: 'días',
      icon: <Calendar className="h-4 w-4" />,
      iconBg: daysSinceLastControl !== null && daysSinceLastControl > 30 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className="group relative overflow-hidden rounded-xl border border-border/60 dark:border-white/10 bg-card/70 dark:bg-card/40 p-3 transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between gap-1 mb-2">
            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105', s.iconBg)}>
              {s.icon}
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground/80">
              {s.unit}
            </span>
          </div>
          <div className="text-xl font-black text-foreground tabular-nums tracking-tight fit-clamp">
            {s.value}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mt-0.5 fit-clamp">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface AnimalOverviewTabProps {
  animal: any;
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  currentPotreroName: string;
  bentoDaysInField: number | null;
  controls: any[];
  vaccinations: any[];
  treatments: any[];
  diseases: any[];
  fields: any[];
  healthAlerts: any[];
  bentoGdpStats: any;
  activeDiseasesCount: number;
  curedDiseasesCount: number;
  onFatherClick?: (id: number) => void;
  onMotherClick?: (id: number) => void;
  formatDate: (dateStr: string) => string;
}

export const AnimalOverviewTab: React.FC<AnimalOverviewTabProps> = ({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  currentPotreroName,
  bentoDaysInField,
  controls,
  vaccinations,
  treatments,
  diseases,
  fields,
  healthAlerts,
  bentoGdpStats,
  activeDiseasesCount,
  curedDiseasesCount,
  onFatherClick,
  onMotherClick,
  formatDate,
}) => {
  const gender = animal.sex || animal.gender;
  const status = animal.status || 'Vivo';
  const displayWeight = animal.weight ? `${animal.weight} kg` : '-';
  const ageMonths = animal.age_in_months ?? '-';
  const ageDays = animal.age_in_days ?? '-';
  const birthDate = animal.birth_date ? formatDate(animal.birth_date) : '-';
  const isAdult = animal.is_adult === true ? 'Sí' : animal.is_adult === false ? 'No' : '-';

  const latestControlDate = React.useMemo(() => {
    if (controls.length === 0) return '-';
    const sorted = [...controls]
      .filter((c) => c.checkup_date)
      .sort((a, b) => new Date(b.checkup_date).getTime() - new Date(a.checkup_date).getTime());
    return sorted.length > 0 ? formatDate(sorted[0].checkup_date) : '-';
  }, [controls, formatDate]);

  return (
    <div className="space-y-4">
      {/* 4 KPIs Bento Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeroKpiCard
          label="Peso Actual"
          value={displayWeight}
          sub={latestControlDate !== '-' ? `Reg. ${latestControlDate}` : 'Sin pesaje'}
          icon={<Scale className="h-4 w-4" />}
          accent="emerald"
        />
        <HeroKpiCard
          label="Edad"
          value={ageMonths !== '-' ? `${ageMonths} meses` : '-'}
          sub={birthDate !== '-' ? `Nac. ${birthDate}` : undefined}
          icon={<Calendar className="h-4 w-4" />}
          accent="blue"
        />
        <HeroKpiCard
          label="Etapa / Condición"
          value={isAdult === 'Sí' ? 'Adulto' : isAdult === 'No' ? 'Cría / Joven' : '-'}
          sub={`Estado: ${status}`}
          icon={<Activity className="h-4 w-4" />}
          accent="amber"
        />
        <HeroKpiCard
          label="Último Control"
          value={latestControlDate}
          sub={controls.length > 0 ? `${controls.length} controles totales` : 'Sin registros'}
          icon={<ClipboardList className="h-4 w-4" />}
          accent="purple"
        />
      </div>

      {/* Ubicación y Genealogía Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 flex flex-col justify-between transition-all hover:border-emerald-500/40">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <MapPin className="h-3.5 w-3.5" />
            Ubicación en Potrero
          </div>
          <div className="mt-2">
            <p className="text-sm font-black text-foreground fit-clamp">
              {currentPotreroName}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {bentoDaysInField !== null ? `${bentoDaysInField} días de permanencia` : 'Sin rotación reciente'}
            </p>
          </div>
        </div>

        <div
          onClick={onFatherClick && (animal.idFather || animal.father_id) ? () => onFatherClick(animal.idFather || animal.father_id) : undefined}
          className={cn(
            'rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 flex flex-col justify-between transition-all',
            animal.idFather || animal.father_id ? 'cursor-pointer hover:border-blue-500/40 hover:shadow-sm' : ''
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Padre</span>
            {(animal.idFather || animal.father_id) && <span className="text-[11px] font-semibold underline">Ver Ficha</span>}
          </div>
          <div className="mt-2">
            <p className="text-sm font-black text-foreground fit-clamp">
              {fatherLabel === '-' ? 'N/A' : fatherLabel}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Línea Paterna</p>
          </div>
        </div>

        <div
          onClick={onMotherClick && (animal.idMother || animal.mother_id) ? () => onMotherClick(animal.idMother || animal.mother_id) : undefined}
          className={cn(
            'rounded-xl border border-pink-500/20 bg-pink-500/5 dark:bg-pink-950/20 p-3.5 flex flex-col justify-between transition-all',
            animal.idMother || animal.mother_id ? 'cursor-pointer hover:border-pink-500/40 hover:shadow-sm' : ''
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
            <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" /> Madre</span>
            {(animal.idMother || animal.mother_id) && <span className="text-[11px] font-semibold underline">Ver Ficha</span>}
          </div>
          <div className="mt-2">
            <p className="text-sm font-black text-foreground fit-clamp">
              {motherLabel === '-' ? 'N/A' : motherLabel}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Línea Materna</p>
          </div>
        </div>
      </div>

      {/* Bento de Estadísticas Rápidas */}
      <QuickStatsGrid
        vaccinations={vaccinations}
        treatments={treatments}
        controls={controls}
        diseases={diseases}
      />

      {/* Score de Salud y Bienestar */}
      <HealthScoreIndicator
        diseases={diseases}
        controls={controls}
        animal={animal}
      />

      {/* Alertas Veterinarias */}
      <AlertsSection animalId={animal.id} healthAlerts={healthAlerts} />

      {/* Rendimiento y Métricas 360° */}
      <AnimalBentoStats
        gdpStats={bentoGdpStats}
        daysInCurrentField={bentoDaysInField}
        totalRotations={fields.length}
        totalVaccinations={vaccinations.length}
        totalTreatments={treatments.length}
        activeDiseasesCount={activeDiseasesCount}
        curedDiseasesCount={curedDiseasesCount}
      />

      {/* Información Básica y Trazabilidad ICA en Acordeones Bento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CollapsibleCard
          title="Ficha y Datos Generales"
          defaultCollapsed={false}
          accent="blue"
        >
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="ID Base de Datos" value={`#${animal.id}`} />
            <DetailField label="Número de Chapa / Registro" value={animal.record || '-'} />
            <DetailField label="Raza Ganadera" value={breedLabel} />
            <DetailField label="Sexo">
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs font-semibold',
                  gender === 'Macho'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : gender === 'Hembra'
                    ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                )}
              >
                {gender || '-'}
              </Badge>
            </DetailField>
            <DetailField label="Estado Actual">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold',
                  status === 'Vivo'
                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400'
                    : status === 'Enfermo'
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400'
                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                )}
              >
                {status}
              </Badge>
            </DetailField>
            <DetailField label="Fecha Nacimiento" value={birthDate} />
            <DetailField label="Edad en Días" value={ageDays !== '-' ? `${ageDays} días` : '-'} />
            <DetailField label="Lote Ganadero" value={animal.lot_name || animal.lot || '-'} />
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          title="Trazabilidad y Movimientos ICA"
          defaultCollapsed={false}
          accent="emerald"
        >
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Fecha de Ingreso a Finca" value={animal.entry_date ? formatDate(animal.entry_date) : '-'} />
            <DetailField label="Fecha de Compra" value={animal.purchase_date ? formatDate(animal.purchase_date) : '-'} />
            <DetailField label="Fecha de Salida" value={animal.exit_date ? formatDate(animal.exit_date) : '-'} />
            <DetailField label="Fecha de Venta" value={animal.sale_date ? formatDate(animal.sale_date) : '-'} />
            <div className="col-span-2">
              <DetailField label="Motivo de Salida / Novedad" value={animal.exit_reason || 'Sin novedad de salida registrada'} />
            </div>
          </div>
        </CollapsibleCard>
      </div>

      {/* Identificación Digital QR & NFC */}
      <CollapsibleCard
        title="Identificación Digital Inteligente (QR y NFC)"
        defaultCollapsed={true}
        accent="purple"
      >
        <LivestockTagWidget animal={animal} />
      </CollapsibleCard>

      {/* Notas / Observaciones */}
      {animal.notes && (
        <CollapsibleCard
          title="Notas de Campo y Observaciones"
          defaultCollapsed={true}
          accent="slate"
        >
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap p-2 rounded-xl bg-background/50 border border-border/40">
            {animal.notes}
          </p>
        </CollapsibleCard>
      )}
    </div>
  );
};
