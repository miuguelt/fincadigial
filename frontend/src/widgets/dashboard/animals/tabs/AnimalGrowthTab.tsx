import React, { useMemo } from 'react';
import {
  TrendingUp,
  Scale,
  Plus,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Target,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { AnimalMetricsCharts } from '../AnimalMetricsCharts';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';

interface AnimalGrowthTabProps {
  animal: any;
  controls: any[];
  formatDate: (dateStr: string) => string;
  onAddControl?: () => void;
  onViewControl?: (item: any) => void;
  onEditControl?: (item: any) => void;
  onDeleteControl?: (item: any) => Promise<void>;
  confirmingDeleteId?: string | number | null;
  deletingItemId?: string | number | null;
}

export const AnimalGrowthTab: React.FC<AnimalGrowthTabProps> = ({
  animal,
  controls,
  formatDate,
  onAddControl,
  onViewControl,
  onEditControl,
  onDeleteControl,
  confirmingDeleteId,
  deletingItemId,
}) => {
  // Ordenar controles cronológicamente
  const sortedControls = useMemo(() => {
    return [...controls].sort(
      (a, b) => new Date(a.checkup_date).getTime() - new Date(b.checkup_date).getTime()
    );
  }, [controls]);

  // Controles descendentes para la tabla
  const reverseControls = useMemo(() => {
    return [...sortedControls].reverse();
  }, [sortedControls]);

  // Cálculos Ponderales y Rendimiento
  const growthMetrics = useMemo(() => {
    if (sortedControls.length === 0) {
      const currentWeight = Number(animal.weight) || 0;
      return {
        initialWeight: currentWeight,
        currentWeight: currentWeight,
        totalGain: 0,
        totalDays: 0,
        overallAdg: null,
        recentAdg: null,
        lastHeight: null,
        bmi: null,
      };
    }

    const first = sortedControls[0];
    const last = sortedControls[sortedControls.length - 1];
    const initialW = Number(first.weight) || 0;
    const currentW = Number(last.weight) || Number(animal.weight) || initialW;
    const totalGain = Math.max(0, currentW - initialW);

    const firstDate = new Date(first.checkup_date);
    const lastDate = new Date(last.checkup_date);
    const totalDays = Math.max(
      1,
      Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const overallAdg = sortedControls.length >= 2 ? (totalGain / totalDays).toFixed(2) : null;

    // ADG del último periodo
    let recentAdg = null;
    if (sortedControls.length >= 2) {
      const prev = sortedControls[sortedControls.length - 2];
      const prevW = Number(prev.weight) || 0;
      const prevDate = new Date(prev.checkup_date);
      const periodDays = Math.max(
        1,
        Math.round((lastDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const periodGain = currentW - prevW;
      recentAdg = (periodGain / periodDays).toFixed(2);
    }

    const lastHeight = last.height ? Number(last.height) : null;
    const bmi = lastHeight && currentW > 0 ? (currentW / Math.pow(lastHeight, 2)).toFixed(1) : null;

    return {
      initialWeight: initialW,
      currentWeight: currentW,
      totalGain: Number(totalGain.toFixed(1)),
      totalDays,
      overallAdg,
      recentAdg,
      lastHeight,
      bmi,
    };
  }, [sortedControls, animal.weight]);

  // Proyecciones deterministas de ceba y mercado (meta: 450 kg por defecto en ganado de engorde)
  const TARGET_MARKET_WEIGHT = 450;
  const projections = useMemo(() => {
    const currentW = growthMetrics.currentWeight;
    const adgNum =
      growthMetrics.recentAdg !== null && Number(growthMetrics.recentAdg) > 0
        ? Number(growthMetrics.recentAdg)
        : growthMetrics.overallAdg !== null && Number(growthMetrics.overallAdg) > 0
        ? Number(growthMetrics.overallAdg)
        : 0.65; // Heurística estándar colombiana si no hay suficientes datos (650 g/día)

    const projected30d = (currentW + adgNum * 30).toFixed(1);
    const projected60d = (currentW + adgNum * 60).toFixed(1);
    const projected90d = (currentW + adgNum * 90).toFixed(1);

    const remainingKg = Math.max(0, TARGET_MARKET_WEIGHT - currentW);
    const daysToMarket = adgNum > 0 ? Math.ceil(remainingKg / adgNum) : null;

    const estimatedMarketDate =
      daysToMarket !== null
        ? new Date(Date.now() + daysToMarket * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : null;

    const progressPct = Math.min(100, Math.round((currentW / TARGET_MARKET_WEIGHT) * 100));

    return {
      adgUsed: adgNum.toFixed(2),
      projected30d,
      projected60d,
      projected90d,
      remainingKg: remainingKg.toFixed(1),
      daysToMarket,
      estimatedMarketDate,
      progressPct,
    };
  }, [growthMetrics]);

  return (
    <div className="space-y-4">
      {/* 4 Tarjetas Bento de Rendimiento Ponderal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Peso Actual</span>
            <Scale className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {growthMetrics.currentWeight} <span className="text-xs font-semibold text-muted-foreground">kg</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {growthMetrics.totalGain > 0
              ? `+${growthMetrics.totalGain} kg ganados en total`
              : 'Peso de ingreso / inicial'}
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>Ganancia Diaria (ADG)</span>
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {growthMetrics.recentAdg !== null
              ? `${Number(growthMetrics.recentAdg) >= 0 ? '+' : ''}${growthMetrics.recentAdg}`
              : growthMetrics.overallAdg !== null
              ? `+${growthMetrics.overallAdg}`
              : '-'}{' '}
            <span className="text-xs font-semibold text-muted-foreground">kg/día</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {growthMetrics.overallAdg !== null
              ? `Promedio histórico: ${growthMetrics.overallAdg} kg/día`
              : 'Requiere mín. 2 pesajes'}
          </p>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            <span>Meta de Ceba ({TARGET_MARKET_WEIGHT} kg)</span>
            <Target className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {projections.progressPct}%
          </div>
          <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${projections.progressPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <span>Salida a Mercado</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-foreground fit-clamp">
            {projections.daysToMarket !== null ? `${projections.daysToMarket} días` : '-'}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            {projections.estimatedMarketDate ? `Est. ${projections.estimatedMarketDate}` : 'Calculando proyección'}
          </p>
        </div>
      </div>

      {/* Proyecciones Deterministas de Crecimiento */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 p-4 sm:p-5 shadow-sm space-y-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Proyecciones Deterministas de Ganancia de Peso
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Cálculo analítico basado en el ritmo de ganancia diario actual ({projections.adgUsed} kg/día)
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
            Modelo Ganadero
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-background/80 dark:bg-card/60 border border-border/60 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Proyección a +30 días</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-black text-foreground tabular-nums">
              {projections.projected30d} <span className="text-xs font-semibold text-muted-foreground">kg</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              +{(Number(projections.adgUsed) * 30).toFixed(1)} kg estimados
            </p>
          </div>

          <div className="p-3 rounded-xl bg-background/80 dark:bg-card/60 border border-border/60 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Proyección a +60 días</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-black text-foreground tabular-nums">
              {projections.projected60d} <span className="text-xs font-semibold text-muted-foreground">kg</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              +{(Number(projections.adgUsed) * 60).toFixed(1)} kg estimados
            </p>
          </div>

          <div className="p-3 rounded-xl bg-background/80 dark:bg-card/60 border border-border/60 space-y-1">
            <div className="text-[11px] font-bold text-muted-foreground uppercase flex items-center justify-between">
              <span>Proyección a +90 días</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-purple-500" />
            </div>
            <div className="text-xl font-black text-foreground tabular-nums">
              {projections.projected90d} <span className="text-xs font-semibold text-muted-foreground">kg</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              +{(Number(projections.adgUsed) * 90).toFixed(1)} kg estimados
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos de Evolución de Crecimiento */}
      <CollapsibleCard
        title="Curvas de Evolución (Peso, Altura e IMC)"
        accent="blue"
        defaultCollapsed={false}
      >
        <div className="p-1 sm:p-2">
          <AnimalMetricsCharts controls={controls} />
        </div>
      </CollapsibleCard>

      {/* Historial Detallado de Controles y Pesajes */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/60 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Historial de Controles y Pesajes
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                {controls.length} {controls.length === 1 ? 'registro' : 'registros'} de control físico
              </p>
            </div>
          </div>

          {onAddControl && (
            <Button
              size="sm"
              onClick={onAddControl}
              className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Pesaje</span>
            </Button>
          )}
        </div>

        <div className="p-3.5 sm:p-4">
          {reverseControls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs italic">
              No hay controles de crecimiento registrados para este animal.
            </div>
          ) : (
            <div className="space-y-2.5">
              {reverseControls.map((ctrl: any, idx: number) => {
                const recordId = resolveRecordId(ctrl);
                const nextCtrl = reverseControls[idx + 1];
                const weightDiff =
                  nextCtrl && ctrl.weight && nextCtrl.weight
                    ? (Number(ctrl.weight) - Number(nextCtrl.weight)).toFixed(1)
                    : null;

                return (
                  <div
                    key={recordId || idx}
                    className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 font-black text-xs">
                        #{reverseControls.length - idx}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-foreground tabular-nums">
                            {ctrl.weight ? `${ctrl.weight} kg` : 'Sin peso'}
                          </span>
                          {weightDiff !== null && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-bold px-1.5 py-0 h-4.5',
                                Number(weightDiff) >= 0
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                              )}
                            >
                              {Number(weightDiff) >= 0 ? `+${weightDiff}` : weightDiff} kg
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[11px] h-4.5 border-border/60">
                            {formatDate(ctrl.checkup_date)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          {ctrl.height && <span>Altura: {ctrl.height} m</span>}
                          {ctrl.health_status && (
                            <span className="font-semibold text-foreground/80">
                              Estado: {ctrl.health_status}
                            </span>
                          )}
                          {ctrl.notes && <span className="italic fit-clamp max-w-[200px]">"{ctrl.notes}"</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                      {onViewControl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewControl(ctrl)}
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          title="Ver detalle"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onEditControl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditControl(ctrl)}
                          className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:text-blue-700"
                          title="Editar control"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onDeleteControl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteControl(ctrl)}
                          disabled={deletingItemId !== null && deletingItemId === recordId}
                          className={cn(
                            'h-7 w-7 p-0 rounded-lg text-rose-600 hover:text-rose-700',
                            confirmingDeleteId === recordId && 'bg-destructive text-destructive-foreground animate-pulse'
                          )}
                          title={confirmingDeleteId === recordId ? 'Confirmar eliminación' : 'Eliminar control'}
                        >
                          {confirmingDeleteId === recordId ? '✓' : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
