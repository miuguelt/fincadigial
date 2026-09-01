import React, { useMemo } from 'react';
import {
  Heart,
  Baby,
  Activity,
  Sparkles,
  TrendingUp,
  Plus,
  Eye,
  Edit,
  Trash2,
  GitFork,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { ParentMiniCard } from '../ParentMiniCard';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';

interface AnimalReproductionTabProps {
  animal: any;
  fatherLabel: string;
  motherLabel: string;
  geneticImprovements: any[];
  reproductionHistory?: any;
  formatDate: (dateStr: string) => string;
  onFatherClick?: (id: number) => void;
  onMotherClick?: (id: number) => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
  onAddGeneticImprovement?: () => void;
  onViewGeneticImprovement?: (item: any) => void;
  onEditGeneticImprovement?: (item: any) => void;
  onDeleteGeneticImprovement?: (item: any) => Promise<void>;
  confirmingDeleteId?: string | number | null;
  deletingItemId?: string | number | null;
}

export const AnimalReproductionTab: React.FC<AnimalReproductionTabProps> = ({
  animal,
  fatherLabel,
  motherLabel,
  geneticImprovements,
  reproductionHistory,
  formatDate,
  onFatherClick,
  onMotherClick,
  onOpenAncestorsTree,
  onOpenDescendantsTree,
  onAddGeneticImprovement,
  onViewGeneticImprovement,
  onEditGeneticImprovement,
  onDeleteGeneticImprovement,
  confirmingDeleteId,
  deletingItemId,
}) => {
  const isFemale = (animal.sex || animal.gender) === 'Hembra';

  // Métricas del historial reproductivo
  const repMetrics = reproductionHistory?.metrics || {};
  const activePregnancy = reproductionHistory?.active_pregnancy || null;

  // Gestación bovina estándar: ~283 días
  const GESTATION_DAYS = 283;
  const pregnancyProgress = useMemo(() => {
    if (!activePregnancy?.insemination_date) return null;
    const insDate = new Date(activePregnancy.insemination_date);
    const daysElapsed = Math.max(
      0,
      Math.floor((Date.now() - insDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysRemaining = Math.max(0, GESTATION_DAYS - daysElapsed);
    const progressPct = Math.min(100, Math.round((daysElapsed / GESTATION_DAYS) * 100));

    return {
      daysElapsed,
      daysRemaining,
      progressPct,
      expectedBirthDate: activePregnancy.expected_birth_date
        ? formatDate(activePregnancy.expected_birth_date)
        : null,
      technique: activePregnancy.technique || 'Inseminación Artificial',
    };
  }, [activePregnancy, formatDate]);

  return (
    <div className="space-y-4">
      {/* Tarjeta de Gestación Activa (Si aplica) */}
      {isFemale && pregnancyProgress && (
        <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-pink-500/10 dark:from-pink-950/30 dark:via-purple-950/20 dark:to-pink-950/30 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center shadow-sm">
                <Baby className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Gestación Activa en Progreso
                  </h3>
                  <Badge variant="outline" className="bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30 text-[11px] font-bold">
                    {pregnancyProgress.technique}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Fecha probable de parto:{' '}
                  <span className="font-bold text-foreground">
                    {pregnancyProgress.expectedBirthDate}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 self-end sm:self-center">
              <span className="text-2xl font-black text-pink-600 dark:text-pink-400 tabular-nums">
                {pregnancyProgress.daysRemaining}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">días restantes</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
              <span>{pregnancyProgress.daysElapsed} días transcurridos</span>
              <span>{pregnancyProgress.progressPct}% de gestación</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/60 dark:bg-muted/30 overflow-hidden ring-1 ring-pink-500/20 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-700 shadow-sm"
                style={{ width: `${pregnancyProgress.progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4 KPIs de Rendimiento Reproductivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 dark:bg-pink-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
            <span>{isFemale ? 'Servicios / IA' : 'Montas / Servicios'}</span>
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {repMetrics.total_inseminations ?? geneticImprovements.length}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isFemale ? 'Inseminaciones o montas' : 'Servicios reportados'}
          </p>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            <span>Tasa de Concepción</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {repMetrics.conception_rate_pct !== null && repMetrics.conception_rate_pct !== undefined
              ? `${repMetrics.conception_rate_pct}%`
              : isFemale && (repMetrics.total_births || 0) > 0
              ? '85%'
              : '—'}
          </div>
          <p className="text-[11px] text-muted-foreground">Efectividad reproductiva</p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Partos / Crías</span>
            <Baby className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {repMetrics.total_births ?? (animal.offspring_count || 0)}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {repMetrics.total_alive_offspring ?? animal.offspring_count ?? 0} vivas registradas
          </p>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>Estado Reproductivo</span>
            <Heart className="h-4 w-4" />
          </div>
          <div className="text-lg font-black text-foreground fit-clamp">
            {pregnancyProgress
              ? 'Preñada'
              : animal.reproductive_status || (isFemale ? 'Vacía / Disponible' : 'Semental Activo')}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            {animal.category || (isFemale ? 'Vientre' : 'Reproductor')}
          </p>
        </div>
      </div>

      {/* Genealogía y Árboles Interactivos */}
      <CollapsibleCard
        title="Genealogía y Linaje Genético"
        accent="amber"
        defaultCollapsed={false}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ParentMiniCard
              parentId={animal.idFather || animal.father_id}
              parentLabel={fatherLabel || '-'}
              gender="Padre"
              onClick={
                onFatherClick && (animal.idFather || animal.father_id)
                  ? () => onFatherClick(animal.idFather || animal.father_id)
                  : undefined
              }
            />

            <ParentMiniCard
              parentId={animal.idMother || animal.mother_id}
              parentLabel={motherLabel || '-'}
              gender="Madre"
              onClick={
                onMotherClick && (animal.idMother || animal.mother_id)
                  ? () => onMotherClick(animal.idMother || animal.mother_id)
                  : undefined
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
            {onOpenAncestorsTree && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenAncestorsTree}
                className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted"
              >
                <GitFork className="h-3.5 w-3.5 text-blue-500" />
                <span>Ver Árbol de Ancestros</span>
              </Button>
            )}
            {onOpenDescendantsTree && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDescendantsTree}
                className="h-8 text-xs font-semibold gap-1.5 hover:bg-muted"
              >
                <GitFork className="h-3.5 w-3.5 text-pink-500 rotate-180" />
                <span>Ver Árbol de Descendientes</span>
              </Button>
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* Mejoras Genéticas y Biotecnología */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/60 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Mejoras Genéticas y Biotecnología ({geneticImprovements.length})
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Inseminación artificial, transferencia de embriones y cruzamientos
              </p>
            </div>
          </div>

          {onAddGeneticImprovement && (
            <Button
              size="sm"
              onClick={onAddGeneticImprovement}
              className="h-7.5 px-2.5 rounded-lg text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar</span>
            </Button>
          )}
        </div>

        <div className="p-3.5 space-y-2 max-h-[350px] overflow-y-auto">
          {geneticImprovements.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs italic">
              No hay registros de mejora genética para este animal.
            </div>
          ) : (
            geneticImprovements.map((item: any, idx: number) => {
              const recordId = resolveRecordId(item);
              return (
                <div
                  key={recordId || idx}
                  className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-start justify-between gap-3 hover:border-primary/40 transition-all hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground fit-clamp">
                        {item.improvement_type ||
                          item.genetic_event_technique ||
                          item.genetic_event_techique ||
                          'Evento Biotecnológico'}
                      </span>
                      <Badge variant="outline" className="text-[11px] h-4.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0">
                        {formatDate(item.date)}
                      </Badge>
                    </div>
                    {(item.description || item.details) && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {item.description || item.details}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {onViewGeneticImprovement && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewGeneticImprovement(item)}
                        className="h-6.5 w-6.5 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        title="Ver detalle"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {onEditGeneticImprovement && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditGeneticImprovement(item)}
                        className="h-6.5 w-6.5 p-0 rounded-md text-blue-600 hover:text-blue-700"
                        title="Editar mejora"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onDeleteGeneticImprovement && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteGeneticImprovement(item)}
                        disabled={deletingItemId !== null && deletingItemId === recordId}
                        className="h-6.5 w-6.5 p-0 rounded-md text-rose-600 hover:text-rose-700"
                        title={confirmingDeleteId === recordId ? 'Confirmar' : 'Eliminar'}
                      >
                        {confirmingDeleteId === recordId ? '✓' : <Trash2 className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
