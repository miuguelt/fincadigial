import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { fieldService } from '@/entities/field/api/field.service';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';
import { FIELD_STATES } from '@/shared/constants/enums';
import type { FieldResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { FieldActionsMenu } from '@/widgets/dashboard/FieldActionsMenu';
import { FieldDetailsModal } from '@/widgets/analytics/FieldDetailsModal';
import { FoodTypeLink } from '@/entities/food-type/ui';
import { MapPin, PawPrint, Map as MapIcon, Activity, LayoutDashboard, Info, Scale, Sprout, Clock } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { cn } from '@/shared/ui/cn';
import { useAuth } from '@/features/auth/model/useAuth';
import { Card, CardContent, CardFooter } from '@/shared/ui/card';
import { PotrerosBoardPage, AforoCalculatorModal, PastureRestModal, getStandardRestDays } from '@/features/potreros';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/shared/ui/badge';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type FieldFormInput = {
  name: string;
  ubication: string;
  area: string;
  capacity: string;
  state: 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido' | string;
  handlings: string;
  gauges: string;
  food_type_id?: number;
  rest_days?: string;
  grazing_days?: string;
};

// ─── Utilidades de color/semáforo ────────────────────────────────────────────

/** Devuelve la paleta completa según el % de ocupación */
const getOccupancyPalette = (pct: number, hasCapacity: boolean = true, animalCount: number = 0) => {
  if (!hasCapacity && animalCount > 0) {
    return {
      light: 'bg-indigo-400',
      bar: 'from-indigo-400 to-indigo-500',
      track: 'bg-indigo-100 dark:bg-indigo-950/60',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border border-indigo-300/60',
      glow: 'shadow-indigo-400/40',
      ring: 'ring-indigo-400/40',
      label: 'Ocupado (S/C)',
    };
  }
  if (pct >= 100)
    return {
      light: 'bg-destructive',
      bar: 'from-rose-500 to-red-600',
      track: 'bg-destructive/10 dark:bg-rose-950/60',
      text: 'text-destructive dark:text-destructive/80',
      badge: 'bg-destructive/10 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-destructive/40/60',
      glow: 'shadow-rose-400/40',
      ring: 'ring-rose-400/40',
      label: 'Sobrecargado',
    };
  if (pct >= 80)
    return {
      light: 'bg-warning',
      bar: 'from-amber-400 to-orange-500',
      track: 'bg-warning/10 dark:bg-amber-950/60',
      text: 'text-warning dark:text-warning/80',
      badge: 'bg-warning/10 text-warning dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300/60',
      glow: 'shadow-amber-400/40',
      ring: 'ring-amber-400/40',
      label: 'Casi lleno',
    };
  if (pct >= 50)
    return {
      light: 'bg-yellow-400',
      bar: 'from-yellow-400 to-lime-500',
      track: 'bg-warning/10 dark:bg-yellow-950/60',
      text: 'text-warning dark:text-yellow-400',
      badge: 'bg-warning/10 text-warning dark:bg-yellow-900/60 dark:text-yellow-200 border border-yellow-300/60',
      glow: 'shadow-yellow-400/40',
      ring: 'ring-yellow-400/40',
      label: 'Medio',
    };
  if (pct > 0)
    return {
      light: 'bg-info',
      bar: 'from-blue-400 to-cyan-500',
      track: 'bg-info/10 dark:bg-blue-950/60',
      text: 'text-info dark:text-info/80',
      badge: 'bg-info/10 text-info dark:bg-blue-900/60 dark:text-blue-200 border border-info/40/60',
      glow: 'shadow-blue-400/40',
      ring: 'ring-blue-400/40',
      label: 'Bajo',
    };
  return {
    light: 'bg-emerald-500',
    bar: 'from-emerald-400 to-teal-500',
    track: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300/60',
    glow: 'shadow-emerald-400/40',
    ring: 'ring-emerald-400/40',
    label: 'Vacío',
  };
};

/** Colores de semáforo para el estado del potrero */
const getStateSemaphore = (state: string) => {
  switch ((state || '').toLowerCase()) {
    case 'disponible':
      return { dot: 'bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]', text: 'text-emerald-700 dark:text-emerald-400' };
    case 'ocupado':
      return { dot: 'bg-warning shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]', text: 'text-warning dark:text-warning/80' };
    case 'mantenimiento':
      return { dot: 'bg-info shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]', text: 'text-info dark:text-info/80' };
    case 'restringido':
      return { dot: 'bg-destructive shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]', text: 'text-destructive dark:text-destructive/80' };
    default:
      return { dot: 'bg-muted shadow-[0_0_6px_2px_rgba(148,163,184,0.4)]', text: 'text-muted-foreground dark:text-muted-foreground' };
  }
};

/**
 * Separa el área en número y unidad. El campo `area` es texto libre y a veces ya
 * trae la unidad ("71 hectáreas"), así que no podemos concatenar "ha" a ciegas.
 */
const parseArea = (raw?: string | null): { value: string; unit: string } | null => {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const match = text.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) return { value: text, unit: '' };
  const [, value, rest] = match;
  const unit = rest.trim() ? (/^hect/i.test(rest.trim()) ? 'ha' : rest.trim()) : 'ha';
  return { value, unit };
};

// ─── Barra de progreso de ocupación (vista tabla) ─────────────────────────────
const FieldOccupancyBar: React.FC<{ animalCount: number; capacity: string; area?: string }> = ({
  animalCount,
  capacity,
  area,
}) => {
  const manualCapacity = parseInt(capacity) || 0;
  const areaNum = area ? parseFloat(String(area).replace(',', '.')) : 0;
  const estimatedCapacity = areaNum > 0 ? Math.max(1, Math.round(areaNum * 2)) : 0;

  const hasCapacity = manualCapacity > 0;
  const capacityNum = hasCapacity ? manualCapacity : estimatedCapacity > 0 ? estimatedCapacity : null;
  const isEstimated = !hasCapacity && estimatedCapacity > 0;

  const pct = capacityNum ? Math.min(Math.round((animalCount / capacityNum) * 100), 100) : 0;
  const displayPct = capacityNum ? `${pct}%${isEstimated ? ' (Est.)' : ''}` : (animalCount > 0 ? 'N/A' : '0%');
  const barWidth = capacityNum ? pct : (animalCount > 0 ? 100 : 0);
  const palette = getOccupancyPalette(pct, capacityNum !== null && capacityNum > 0, animalCount);

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">
          {animalCount} / {capacityNum || '∞'}
        </span>
        <span className={`font-semibold ${palette.text}`}>{displayPct}</span>
      </div>
      <div className={`w-full ${palette.track} rounded-full h-2 overflow-hidden ring-1 ring-black/5`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${palette.bar} transition-all duration-500`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

// ─── Tarjeta enriquecida (vista grid) ─────────────────────────────────────────

interface PotreroCardProps {
  potrero: FieldResponse & { [k: string]: any };
  foodTypeLabel: string;
  onVerAnimales: (potrero: any) => void;
  onOpenDetail?: (potrero: any) => void;
  onOpenAforo?: (potrero: any) => void;
}

const PotreroCard: React.FC<PotreroCardProps> = ({ 
  potrero, 
  foodTypeLabel, 
  onVerAnimales, 
  onOpenDetail,
  onOpenAforo,
}) => {
  const actual = potrero.animal_count ?? 0;
  const area = parseArea(potrero.area);
  const manualCapacity = parseInt(potrero.capacity || '0') || 0;
  const areaNum = potrero.area ? parseFloat(String(potrero.area).replace(',', '.')) : 0;
  const estimatedCapacity = areaNum > 0 ? Math.max(1, Math.round(areaNum * 2)) : 0;

  const hasCapacity = manualCapacity > 0;
  const capacidad = hasCapacity ? manualCapacity : estimatedCapacity > 0 ? estimatedCapacity : null;
  const isEstimated = !hasCapacity && estimatedCapacity > 0;

  const pct = capacidad ? Math.min(Math.round((actual / capacidad) * 100), 100) : 0;
  const palette = getOccupancyPalette(pct, capacidad !== null && capacidad > 0, actual);
  const barWidth = capacidad ? pct : (actual > 0 ? 100 : 0);

  // Estado zootécnico de descanso y rebrote
  const restDaysReq = potrero.rest_days || getStandardRestDays(foodTypeLabel || potrero.handlings);
  let restStatus = {
    label: 'Listo para pastoreo',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    icon: Sprout,
  };

  if (actual > 0) {
    restStatus = {
      label: `En pastoreo (${actual} cab)`,
      badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
      icon: PawPrint,
    };
  } else if (potrero.last_grazing_date) {
    const lastDate = new Date(potrero.last_grazing_date).getTime();
    const today = new Date().getTime();
    const elapsedDays = Math.max(0, Math.round((today - lastDate) / (1000 * 60 * 60 * 24)));
    const remaining = Math.max(0, restDaysReq - elapsedDays);
    if (remaining > 0) {
      restStatus = {
        label: `En descanso (${remaining}d restantes)`,
        badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
        icon: Clock,
      };
    }
  }

  let remainingText = 'Sin animales';
  if (capacidad === null || capacidad === 0) {
    remainingText = 'Capacidad ilimitada';
  } else {
    const libres = capacidad - actual;
    if (actual === 0) remainingText = `Disponibles: ${libres}`;
    else if (libres > 0) remainingText = `Libres: ${libres}`;
    else if (libres === 0) remainingText = 'Capacidad completa';
    else remainingText = `Excedido por ${Math.abs(libres)}`;
  }

  const statusBaseColor = (potrero.state || 'Disponible').toLowerCase();
  const borderClasses =
    statusBaseColor === 'disponible' ? 'border-l-emerald-500 shadow-emerald-500/10' :
    statusBaseColor === 'ocupado' ? 'border-l-amber-500 shadow-amber-500/10' :
    statusBaseColor === 'mantenimiento' ? 'border-l-blue-500 shadow-blue-500/10' :
    'border-l-rose-500 shadow-rose-500/10';

  return (
    <Card
      onClick={() => onOpenDetail?.(potrero)}
      premium={true}
      hoverable={true}
      className={cn(
        "flex h-fit min-h-0 w-full self-start flex-col border-l-[6px] transition-all duration-500",
        borderClasses,
        "hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4),0_18px_36px_-18px_rgba(0,0,0,0.4)]",
        "group/potrero"
      )}
    >
      <CardContent className="!p-4 flex flex-col gap-3 relative overflow-hidden">
        {/* Glow effect on hover */}
        <div className="absolute -inset-x-20 -top-20 h-40 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover/potrero:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="flex items-start justify-between gap-2 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("w-2.5 h-2.5 rounded-full shrink-0 animate-pulse", getStateSemaphore(potrero.state).dot)} />
              <h3
                className="font-black text-lg text-foreground tracking-tight fit-clamp group-hover/potrero:text-primary transition-colors"
                title={potrero.name || 'Sin nombre'}
              >
                {potrero.name || 'Sin nombre'}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-black text-muted-foreground uppercase tracking-wider opacity-60 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="fit-clamp">{potrero.ubication || potrero.location || 'Sin ubicación'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="secondary" className="font-mono font-black text-[11px] px-2 bg-white/5 border-white/10 text-muted-foreground/60 whitespace-nowrap">
              #{potrero.id}
            </Badge>
            <span className={cn("text-[11px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap", restStatus.badge)}>
              {restStatus.label}
            </span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 group-hover/potrero:border-white/10 group-hover/potrero:bg-white/10 transition-all duration-500 relative z-10">
          <div className="flex justify-between items-end gap-3 mb-3">
             <div className="min-w-0">
               <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block mb-1 opacity-70 whitespace-nowrap">Carga Biológica</span>
               <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                 <span className={cn("text-4xl font-black tracking-tight drop-shadow-sm tabular-nums", actual > 0 ? palette.text : "text-foreground/30")}>
                   {actual}
                 </span>
                 <span className="text-sm font-bold text-muted-foreground/40 tabular-nums">/ {capacidad || '∞'}</span>
               </div>
             </div>
             <span className={cn(
               "text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border transition-all duration-500 shrink-0 whitespace-nowrap mb-1",
               palette.badge,
               "shadow-lg group-hover/potrero:scale-105"
             )}>
               {palette.label}
             </span>
          </div>

          <div className={cn("h-3 rounded-full overflow-hidden p-0.5 bg-black/30 ring-1 ring-white/5 shadow-inner", palette.track)}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${barWidth}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn("h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-gradient-to-r", palette.bar)}
            />
          </div>

          <p className="mt-3 text-[11px] font-black text-muted-foreground/50 uppercase tracking-wider flex items-center gap-2 min-w-0 group-hover/potrero:text-muted-foreground transition-colors">
             <Info className={cn("h-3.5 w-3.5 shrink-0", palette.text)} />
             <span className="fit-clamp">
               {remainingText} {isEstimated && <span className="text-[11px] opacity-40 font-bold">(Estimado por área)</span>}
             </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 group-hover/potrero:bg-white/10 transition-colors min-w-0">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5 opacity-60 whitespace-nowrap">Extensión</span>
            <span className="text-sm font-black text-foreground flex items-baseline gap-1 whitespace-nowrap overflow-hidden">
              <span className="fit-clamp">{area ? area.value : '—'}</span>
              {area?.unit && <span className="text-[11px] opacity-40 shrink-0">{area.unit}</span>}
            </span>
          </div>
          <div className="bg-white/5 rounded-lg p-3 border border-white/5 group-hover/potrero:bg-white/10 transition-colors min-w-0">
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-wider block mb-1.5 opacity-60 whitespace-nowrap">Suministro</span>
            <span className="text-sm font-black text-foreground fit-clamp block" title={foodTypeLabel}>{foodTypeLabel || '—'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="!p-0 border-t border-white/5 bg-white/5 overflow-hidden relative z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetail?.(potrero); }}
          className="flex-1 flex items-center justify-center gap-1.5 h-12 text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-white/5 transition-all active:scale-95"
          title="Ver ficha completa del potrero"
        >
          <Activity className="w-4 h-4 opacity-50" /> Detalle
        </button>
        <div className="w-px h-8 my-auto bg-white/10" />
        <button
          onClick={(e) => { e.stopPropagation(); if (actual > 0) onVerAnimales(potrero); }}
          disabled={actual === 0}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-12 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95",
            actual === 0 ? "opacity-20 grayscale cursor-not-allowed" : "text-muted-foreground hover:text-emerald-400 hover:bg-white/5"
          )}
          title={actual > 0 ? `Ver los ${actual} animales en este potrero` : 'Potrero sin animales'}
        >
          <PawPrint className="w-4 h-4 opacity-50" /> {actual > 0 ? `Ganado (${actual})` : 'Vacío'}
        </button>
        <div className="w-px h-8 my-auto bg-white/10" />
        <button
          onClick={(e) => { e.stopPropagation(); onOpenAforo?.(potrero); }}
          className="flex-1 flex items-center justify-center gap-1.5 h-12 text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95"
          title="Calcular aforo y capacidad de pastoreo"
        >
          <Scale className="w-4 h-4 text-emerald-500" /> Aforar
        </button>
      </CardFooter>
    </Card>
  );
};
// ─── Componente PremiumHeader ────────────────────────────────────────────────
const PremiumFieldsHeader: React.FC<{
  items: Array<FieldResponse & { [k: string]: any }>;
  /** En tabla y rotación el hero roba ~340px de alto útil: se colapsa a una sola franja. */
  compact?: boolean;
}> = ({ items, compact = false }) => {
  const metrics = useMemo(() => {
    let totalCapacity = 0;
    let totalAnimals = 0;

    const validFields = items.filter(f => (f.state as string) !== 'Inactivo');

    validFields.forEach(field => {
      const cap = parseInt(field.capacity || '0') || 0;
      const areaVal = field.area ? parseFloat(String(field.area).replace(',', '.')) : 0;
      const effectiveCap = cap > 0 ? cap : (areaVal > 0 ? Math.round(areaVal * 2) : 0);
      const count = typeof field.animal_count === 'number' ? field.animal_count : 0;
      totalCapacity += effectiveCap;
      totalAnimals += count;
    });

    const averageOccupation = totalCapacity > 0 ? Math.round((totalAnimals / totalCapacity) * 100) : 0;
    const availableSpots = Math.max(0, totalCapacity - totalAnimals);

    const distribution = validFields
      .map(field => {
        const cap = parseInt(field.capacity || '0') || 0;
        const areaVal = field.area ? parseFloat(String(field.area).replace(',', '.')) : 0;
        const effectiveCap = cap > 0 ? cap : (areaVal > 0 ? Math.round(areaVal * 2) : 0);
        const isEst = cap === 0 && areaVal > 0;
        const count = typeof field.animal_count === 'number' ? field.animal_count : 0;
        const rate = effectiveCap > 0 ? (count / effectiveCap) * 100 : count > 0 ? 100 : 0;
        return {
          id: field.id,
          name: field.name,
          capacity: cap,
          effectiveCapacity: effectiveCap,
          isEstimated: isEst,
          occupied: count,
          available: Math.max(0, effectiveCap - count),
          occupation_rate: rate,
          state: field.state,
          area: field.area,
          overCapacity: effectiveCap > 0 && count > effectiveCap,
        };
      })
      .sort((a, b) => b.occupation_rate - a.occupation_rate);

    return {
      totalCapacity,
      totalAnimals,
      averageOccupation,
      availableSpots,
      distribution,
      totalFields: validFields.length,
      overCapacityCount: distribution.filter(d => d.overCapacity).length,
    };
  }, [items]);

  if (compact) {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border/50 bg-card/40 px-4 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 mr-auto">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-success-500 to-success-600 shadow-md shadow-success-500/20">
            <MapIcon className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-base font-black tracking-tight text-foreground whitespace-nowrap">
            Gestión de <span className="text-success-500">Potreros</span>
          </h1>
        </div>
        {[
          { label: 'Potreros', value: metrics.totalFields },
          { label: 'Capacidad', value: metrics.totalCapacity },
          { label: 'Animales', value: metrics.totalAnimals },
          { label: 'Ocupación', value: `${metrics.averageOccupation}%` },
          { label: 'Disponibles', value: metrics.availableSpots },
        ].map((kpi) => (
          <div key={kpi.label} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/70">{kpi.label}</span>
            <span className="text-sm font-black tabular-nums text-foreground">{kpi.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <DataScreenHeader
      icon={<MapIcon className="h-5 w-5 text-white" />}
      iconClassName="from-success-500 to-success-600 shadow-success-500/20"
      title={<>Gestión de <span className="text-success-500">Potreros</span></>}
      description="Administra y monitorea la ocupación de tus campos (Offline-Ready)"
      metrics={
        <>
          <KPICard compact title="Capacidad Total" value={metrics.totalCapacity} icon="📊" />
          <KPICard compact title="Animales Ubicados" value={metrics.totalAnimals} icon="🐄" />
          <KPICard compact title="Ocupación Promedio" value={`${metrics.averageOccupation}%`} icon="📈" />
          <KPICard compact title="Espacios Disponibles" value={metrics.availableSpots} icon="✅" />
        </>
      }
    />
  );
};

// ─── Página principal ─────────────────────────────────────────────────────────
interface FieldsViewSwitcherProps {
  onOpenAforo?: () => void;
  onOpenRestModal?: () => void;
}

/**
 * Selector de vista compartido: la rotación se monta como página propia y
 * necesita los mismos botones para volver a la tabla o a las tarjetas, además
 * de las herramientas zootécnicas de campo para el campesino.
 */
const FieldsViewSwitcher: React.FC<FieldsViewSwitcherProps> = ({
  onOpenAforo,
  onOpenRestModal,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useGlobalViewMode();
  const isRotationView = searchParams.get('view') === 'rotation';

  const goToCrudView = (mode: 'table' | 'cards') => {
    const params = new URLSearchParams(searchParams);
    params.delete('view');
    const query = params.toString();
    navigate(query ? `?${query}` : '?');
    setViewMode(mode);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-xl border border-border/50">
        <Button
          variant={!isRotationView && viewMode === 'table' ? 'primary' : 'ghost'}
          size="sm"
          className="h-8 px-3 text-xs font-bold"
          onClick={() => goToCrudView('table')}
          aria-label="Vista en tabla"
        >
          Tabla
        </Button>
        <Button
          variant={!isRotationView && viewMode === 'cards' ? 'primary' : 'ghost'}
          size="sm"
          className="h-8 px-3 text-xs font-bold"
          onClick={() => goToCrudView('cards')}
          aria-label="Vista en tarjetas"
        >
          Tarjetas
        </Button>
        <Button
          variant={isRotationView ? 'primary' : 'ghost'}
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-bold"
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('view', 'rotation');
            navigate(`?${params.toString()}`);
          }}
          aria-label="Vista Rotación"
        >
          <LayoutDashboard size={14} />
          Rotación
        </Button>
      </div>

      <div className="h-5 w-px bg-border/60 mx-0.5 hidden sm:block" />

      {/* Herramientas zootécnicas para el campesino */}
      {onOpenAforo && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-sm"
          onClick={onOpenAforo}
          title="Calculadora de aforo de pasturas y capacidad de carga"
        >
          <Scale size={14} className="text-emerald-500" />
          Aforo de Pastos
        </Button>
      )}

      {onOpenRestModal && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shadow-sm"
          onClick={onOpenRestModal}
          title="Semáforo de recuperación y descanso de potreros"
        >
          <Sprout size={14} className="text-amber-500" />
          Semáforo de Reposo
        </Button>
      )}
    </div>
  );
};

interface FieldsCrudPageProps {
  viewSwitcher: React.ReactNode;
  onOpenAforo?: (field?: FieldResponse | null) => void;
  onOpenRestModal?: () => void;
}

function FieldsCrudPage({ viewSwitcher, onOpenAforo }: FieldsCrudPageProps) {
  const { userRole, user: _user } = useAuth() as any;
  const isCampesino = userRole === 'Operario' || userRole === 'Aprendiz';

  const [foodTypeOptions, setFoodTypeOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [viewMode] = useGlobalViewMode();

  const [isAnimalsOpen, setIsAnimalsOpen] = useState(false);
  const [modalField, setModalField] = useState<FieldResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailField, setDetailField] = useState<FieldResponse | null>(null);

  const openAnimalsForField = useCallback(async (field: FieldResponse & { [k: string]: any }) => {
    setModalField(field);
    setIsAnimalsOpen(true);
  }, []);

  const openFieldDetail = useCallback((field: FieldResponse & { [k: string]: any }) => {
    setDetailField(field);
    setIsDetailOpen(true);
  }, []);

  const foodTypeMap = useMemo(() => {
    const map = new Map<number, string>();
    foodTypeOptions.forEach((opt) => map.set(opt.value, opt.label));
    return map;
  }, [foodTypeOptions]);

  // ─── Columnas de tabla ────────────────────────────────────────────────────
  const columns: CRUDColumn<FieldResponse & { [k: string]: any }>[] = useMemo(
    () => [
      {
        key: 'id',
        label: 'Código',
        sortable: true,
        render: (v) => (
          <span className="font-mono text-[11px] bg-secondary/30 px-1.5 py-0.5 rounded">{v}</span>
        ),
      },
      { key: 'name', label: 'Nombre', sortable: true },
      {
        key: 'state',
        label: 'Estado',
        sortable: true,
        render: (v) => {
          const sem = getStateSemaphore(v as string);
          return (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sem.dot}`} />
              <span className={`text-xs font-medium ${sem.text}`}>{v as string || '-'}</span>
            </div>
          );
        },
      },
      {
        key: 'rest_status' as any,
        label: 'Reposo / Forraje',
        render: (_v, item) => {
          const actual = item.animal_count ?? 0;
          const foodTypeName = item.food_type_id ? foodTypeMap.get(item.food_type_id) : undefined;
          const restDaysReq = item.rest_days || getStandardRestDays(foodTypeName || item.handlings);
          if (actual > 0) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 whitespace-nowrap">
                🐮 En pastoreo
              </span>
            );
          }
          if (item.last_grazing_date) {
            const lastDate = new Date(item.last_grazing_date).getTime();
            const today = new Date().getTime();
            const elapsed = Math.max(0, Math.round((today - lastDate) / (1000 * 60 * 60 * 24)));
            const remaining = Math.max(0, restDaysReq - elapsed);
            if (remaining === 0) {
              return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
                  🌿 Listo ({elapsed}d)
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap">
                ⏳ Descanso ({remaining}d)
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
              🌿 Listo
            </span>
          );
        },
      },
      {
        key: 'location' as any,
        label: 'Ubicación',
        render: (_v, item) => item.location || item.ubication || '-',
      },
      { key: 'area', label: 'Área', sortable: true },
      {
        key: 'animal_count' as any,
        label: 'Animales',
        render: (_v, item) => {
          const animalCount = item.animal_count ?? 0;
          const capacityNum = parseInt(item.capacity || '0') || 0;
          const hasCapacity = capacityNum > 0;
          const pct = hasCapacity ? Math.round((animalCount / capacityNum) * 100) : 0;
          const palette = getOccupancyPalette(pct, hasCapacity, animalCount);
          return (
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${palette.badge}`}>
                {animalCount}
              </span>
            </div>
          );
        },
      },
      {
        key: 'occupancy' as any,
        label: 'Ocupación',
        render: (_v, item) => {
          const animalCount = item.animal_count ?? 0;
          const capacity = item.capacity || '';
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation?.();
                openAnimalsForField(item as any);
              }}
              className="min-w-[160px] group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
              title="Ver animales en este potrero"
            >
              <FieldOccupancyBar animalCount={animalCount} capacity={capacity} area={item.area} />
            </button>
          );
        },
      },
      {
        key: 'food_type_id',
        label: 'Tipo de Alimento',
        render: (v) => {
          if (!v) return '-';
          const id = Number(v);
          const label = foodTypeMap.get(id) || `Tipo ${id}`;
          return <FoodTypeLink id={id} label={label} />;
        },
      },
      {
        key: 'management',
        label: 'Manejo',
        render: (_v, item) => item.management || item.handlings || '-',
      },
      {
        key: 'created_at',
        label: 'Creado',
        sortable: true,
        render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-'),
      },
    ],
    [foodTypeMap, openAnimalsForField]
  );

  // ─── Config CRUD ──────────────────────────────────────────────────────────
  const [currentItems, setCurrentItems] = useState<Array<FieldResponse & { [k: string]: any }>>([]);

  const crudConfig: CRUDConfig<FieldResponse & { [k: string]: any }, FieldFormInput> = {
    title: 'Potreros',
    entityName: 'Campo',
    columns,
    formSections: [],
    searchPlaceholder: 'Buscar Potreros...',
    emptyStateMessage: 'No hay potreros creados',
    emptyStateDescription: 'Dibuje los potreros de su finca para organizar el ganado.',
    emptyStateIcon: 'IconMap2',
    enableDetailModal: false,
    enableCreateModal: !isCampesino,
    enableEditModal: !isCampesino,
    enableDelete: !isCampesino,
    defaultLimit: 24,
    pageSizeOptions: [12, 24, 48, 96],
    additionalFilters: {
      sort_by: 'animal_count',
      sort_order: 'desc',
    },
    customHeader: (
      <PremiumFieldsHeader
        items={currentItems}
        compact={viewMode === 'table'}
      />
    ),
    themeColor: 'emerald',
  };

  const mapResponseToForm = (item: FieldResponse & { [k: string]: any }): FieldFormInput => ({
    name: item.name || '',
    ubication: item.ubication || item.location || '',
    area: item.area || '',
    capacity: item.capacity || '',
    state: item.state || 'Disponible',
    handlings: item.handlings || item.management || '',
    gauges: item.gauges || item.measurements || '',
    food_type_id: item.food_type_id,
    rest_days: item.rest_days != null ? String(item.rest_days) : '30',
    grazing_days: item.grazing_days != null ? String(item.grazing_days) : '3',
  });

  const validateForm = (formData: FieldFormInput): string | null => {
    if (!formData.name?.trim()) return 'El nombre es obligatorio.';
    if (!formData.area?.trim()) return 'El área es obligatoria.';
    if (!formData.state) return 'El estado es obligatorio.';
    if (formData.capacity?.trim()) {
      const n = parseInt(formData.capacity);
      if (isNaN(n) || !/^\d+$/.test(formData.capacity.trim())) {
        return 'La capacidad debe ser un número entero válido (ej: 50).';
      }
      if (n <= 0) return 'La capacidad debe ser mayor a 0.';
    }
    return null;
  };

  const initialFormData: FieldFormInput = {
    name: '',
    ubication: '',
    area: '',
    capacity: '',
    state: 'Disponible',
    handlings: '',
    gauges: '',
    food_type_id: undefined,
    rest_days: '30',
    grazing_days: '3',
  };

  useEffect(() => {
    try {
      localStorage.setItem('adminFieldsViewMode', viewMode);
    } catch {
      /* silencioso */
    }
  }, [viewMode]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await foodTypesService.getFoodTypes?.({ page: 1, limit: 1000 });
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setFoodTypeOptions(
          (list || []).map((ft: any) => ({
            value: ft.id,
            label: ft.food_type || ft.name || ft.description || `ID ${ft.id}`,
          }))
        );
      } catch (e) {
        console.warn('[fields] Error al cargar tipos de alimento', e);
      }
    })();
  }, []);

  // ─── Render de tarjeta unificada ──────────────────────────────────────────
  const renderFieldCard = (item: FieldResponse & { [k: string]: any }) => {
    const foodTypeLabel = item.food_type_id
      ? foodTypeOptions.find((ft) => Number(ft.value) === Number(item.food_type_id))?.label ||
        `ID ${item.food_type_id}`
      : '-';

    return (
      <PotreroCard
        potrero={item}
        foodTypeLabel={foodTypeLabel}
        onVerAnimales={openAnimalsForField}
        onOpenDetail={openFieldDetail}
        onOpenAforo={onOpenAforo}
      />
    );
  };

  // ─── Secciones del formulario ─────────────────────────────────────────────
  const formSectionsLocal: CRUDFormSection<FieldFormInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre del Potrero', type: 'text', required: true, placeholder: 'Ej: Sector 34 / El Mango' },
        { name: 'area', label: 'Área (ha)', type: 'text', required: true, placeholder: 'Ej: 3.5' },
        { name: 'state', label: 'Estado', type: 'select', required: true, options: FIELD_STATES as any },
        {
          name: 'food_type_id',
          label: 'Tipo de Pasto / Forraje',
          type: 'select',
          options: foodTypeOptions,
          placeholder: 'Seleccionar tipo de pasto (Kikuyo, Brachiaria, Mombaza...)',
        },
      ],
    },
    {
      title: 'Planificación de Rotación',
      gridCols: 2,
      fields: [
        {
          name: 'rest_days',
          label: 'Días de Descanso (Rebrote)',
          type: 'text',
          placeholder: 'Ej: 30',
          helperText: 'Días requeridos de descanso antes del próximo pastoreo',
        },
        {
          name: 'grazing_days',
          label: 'Días Máx. de Ocupación',
          type: 'text',
          placeholder: 'Ej: 3',
          helperText: 'Días continuos máximos recomendados para el lote',
        },
      ],
    },
    {
      title: 'Capacidad y Manejo',
      gridCols: 2,
      fields: [
        { name: 'ubication', label: 'Ubicación / Sector', type: 'text', placeholder: 'Ej: Zona Alta / Lote 3' },
        {
          name: 'capacity',
          label: 'Capacidad (animales)',
          type: 'text',
          placeholder: 'Solo números. Ej: 50',
          helperText: 'Ingrese solo números enteros. Ejemplo: 50',
        },
        { name: 'handlings', label: 'Manejo / Fuente de Agua', type: 'textarea', placeholder: 'Bebederos, sombrío, división de cerca, etc.', colSpan: 2 },
        { name: 'gauges', label: 'Mediciones / Aforo', type: 'textarea', placeholder: 'Historial de aforos y observaciones del suelo', colSpan: 2 },
      ],
    },
  ];

  // ─── Config final con extensiones ─────────────────────────────────────────
  const crudConfigLocal = {
    ...crudConfig,
    formSections: formSectionsLocal,
    viewMode,
    renderCard: renderFieldCard,
    cardGridClassName: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 !auto-rows-max',
    customToolbar: viewSwitcher,
    customActions: isCampesino ? undefined : (record: any) => (
      <div className="flex items-center gap-1">
        <FieldActionsMenu field={record as FieldResponse} />
      </div>
    ),
  } as any;

  return (
    <>
      <AdminCRUDPage<FieldResponse & { [k: string]: any }, FieldFormInput>
        config={crudConfigLocal}
        service={fieldService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        onItemsChange={setCurrentItems}
        realtime={true}
        pollIntervalMs={0}
        refetchOnFocus={false}
        refetchOnReconnect={true}
        enhancedHover={true}
      />

      <FieldDetailsModal
        field={isAnimalsOpen ? modalField as any : null}
        isOpen={isAnimalsOpen}
        onClose={() => setIsAnimalsOpen(false)}
        initialTab="animals"
      />

      <FieldDetailsModal
        field={isDetailOpen ? detailField as any : null}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        initialTab="overview"
      />
    </>
  );
}

/**
 * `?view=rotation` muestra el tablero de potreros, que carga su propio
 * inventario completo en lugar de la página paginada del CRUD.
 */
function AdminFieldsPage() {
  const [searchParams] = useSearchParams();
  const [isAforoOpen, setIsAforoOpen] = useState(false);
  const [aforoField, setAforoField] = useState<FieldResponse | null>(null);
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);

  const openAforo = useCallback((field?: FieldResponse | null) => {
    setAforoField(field || null);
    setIsAforoOpen(true);
  }, []);

  const openRestModal = useCallback(() => {
    setIsRestModalOpen(true);
  }, []);

  const viewSwitcher = (
    <FieldsViewSwitcher
      onOpenAforo={() => openAforo(null)}
      onOpenRestModal={openRestModal}
    />
  );

  return (
    <>
      {searchParams.get('view') === 'rotation' ? (
        <PotrerosBoardPage viewSwitcher={viewSwitcher} />
      ) : (
        <FieldsCrudPage
          viewSwitcher={viewSwitcher}
          onOpenAforo={openAforo}
          onOpenRestModal={openRestModal}
        />
      )}

      <AforoCalculatorModal
        isOpen={isAforoOpen}
        onClose={() => setIsAforoOpen(false)}
        initialField={aforoField}
      />

      <PastureRestModal
        isOpen={isRestModalOpen}
        onClose={() => setIsRestModalOpen(false)}
      />
    </>
  );
}

export default AdminFieldsPage;

