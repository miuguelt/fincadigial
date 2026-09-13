import React, { useMemo, useState } from 'react';
import {
  Heart,
  Baby,
  Activity,
  Sparkles,
  Plus,
  Eye,
  Edit,
  Trash2,
  GitFork,
  ExternalLink,
  Flame,
  Syringe,
  CheckCircle2,
  Milk,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { ParentMiniCard } from '../ParentMiniCard';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';
import { ReproductiveEventQuickModal } from '@/widgets/reproduction/ReproductiveEventQuickModal';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { useNavigate } from 'react-router-dom';

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
  onRefreshHistory?: () => void;
  onOpenAnimal?: (id: number) => void;
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
  onRefreshHistory,
  onOpenAnimal,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isFemale = (animal.sex || animal.gender) === 'Hembra';

  // Modal rápido de evento reproductivo
  const [isQuickEventModalOpen, setIsQuickEventModalOpen] = useState(false);
  const [confirmingDeleteEventId, setConfirmingDeleteEventId] = useState<number | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  // Métricas del historial reproductivo
  const repMetrics = reproductionHistory?.metrics || {};
  const activePregnancy = reproductionHistory?.active_pregnancy || null;
  const events: any[] = reproductionHistory?.events || [];

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

  // Manejo de eliminación de evento reproductivo
  const handleDeleteEvent = async (eventId: number) => {
    if (confirmingDeleteEventId !== eventId) {
      setConfirmingDeleteEventId(eventId);
      return;
    }

    setDeletingEventId(eventId);
    try {
      await reproductionService.delete(eventId);
      showToast('Evento reproductivo eliminado correctamente', 'success');
      setConfirmingDeleteEventId(null);
      window.dispatchEvent(new CustomEvent('crud:refetch'));
      if (onRefreshHistory) onRefreshHistory();
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar el evento', 'error');
    } finally {
      setDeletingEventId(null);
    }
  };

  // Navegar al Centro Reproductivo con filtro para este animal
  const handleGoToHub = () => {
    navigate(`/admin/reproduction?animal_id=${animal.id}`);
  };

  // Recopilar crías de los partos de este animal
  const allOffspring = useMemo(() => {
    const list: any[] = [];
    events.forEach((ev) => {
      if (ev.event_type === 'Parto' && Array.isArray(ev.offspring_list)) {
        ev.offspring_list.forEach((off: any) => {
          list.push({ ...off, birth_date: ev.event_date });
        });
      }
    });
    return list;
  }, [events]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Barra Superior de Acciones Rápidas Reproductivas */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-muted/40 border border-border/70 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm">
            <Heart className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
              Hoja de Vida Reproductiva
            </h4>
            <p className="text-[11px] text-muted-foreground font-medium">
              {isFemale ? 'Historial de celos, servicios, partos y fertilidad' : 'Desempeño del toro reproductor y crías'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            size="sm"
            onClick={() => setIsQuickEventModalOpen(true)}
            className="h-8.5 px-3 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm shadow-purple-600/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Novedad Reproductiva</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToHub}
            className="h-8.5 px-2.5 rounded-xl text-xs font-semibold gap-1 text-muted-foreground hover:text-foreground border-border/80"
            title="Ver en Centro Reproductivo"
          >
            <span>Ver en Hub</span>
            <ExternalLink className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </Button>
        </div>
      </div>

      {/* Tarjeta de Gestación Activa (Si aplica a la hembra) */}
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

      {/* 4 KPIs de Rendimiento Reproductivo Zootécnico */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* KPI 1: Servicios */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            <span>{isFemale ? 'Servicios / IA' : 'Montas del Toro'}</span>
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {repMetrics.total_inseminations ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isFemale ? 'Inseminaciones o montas' : 'Servicios reportados'}
          </p>
        </div>

        {/* KPI 2: Tasa de Concepción */}
        <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 dark:bg-pink-950/20 p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-400">
            <span>Efectividad</span>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {repMetrics.conception_rate_pct !== null && repMetrics.conception_rate_pct !== undefined
              ? `${repMetrics.conception_rate_pct}%`
              : '—'}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isFemale
              ? `${repMetrics.positive_diagnoses ?? 0} preñeces logradas`
              : `${repMetrics.positive_diagnoses ?? 0} preñeces confirmadas`}
          </p>
        </div>

        {/* KPI 3: Partos e Intervalo Entre Partos (IEP) */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>{isFemale ? 'Partos & Crías' : 'Crías Engendradas'}</span>
            <Baby className="h-4 w-4" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-foreground tabular-nums">
              {isFemale ? (repMetrics.total_births ?? 0) : (repMetrics.total_alive_offspring ?? 0)}
            </span>
            {isFemale && repMetrics.iep_days && (
              <Badge variant="outline" className="text-[11px] font-black px-1.5 py-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                IEP {repMetrics.iep_days}d
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {repMetrics.total_alive_offspring ?? 0} vivas registradas
          </p>
        </div>

        {/* KPI 4: Estado Reproductivo o Días Abiertos */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3 sm:p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>{isFemale ? 'Estado Reproductivo' : 'Condición Semental'}</span>
            <Heart className="h-4 w-4" />
          </div>
          <div className="text-lg font-black text-foreground fit-clamp">
            {pregnancyProgress
              ? 'Preñada'
              : animal.reproductive_status || (isFemale ? 'Vacía / Disponible' : 'Reproductor Activo')}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            {isFemale && repMetrics.days_open
              ? `${repMetrics.days_open} días abiertos`
              : animal.category || (isFemale ? 'Vientre' : 'Semental')}
          </p>
        </div>
      </div>

      {/* LÍNEA DE TIEMPO: Historial Cronológico de Eventos Reproductivos */}
      <div className="rounded-2xl border border-border/80 bg-card/60 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/60 bg-muted/30">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
              Historial de Novedades Reproductivas ({events.length})
            </h3>
          </div>

          <Button
            size="sm"
            onClick={() => setIsQuickEventModalOpen(true)}
            className="h-7 px-2.5 rounded-lg text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-3 w-3" />
            <span>Registrar</span>
          </Button>
        </div>

        <div className="p-3.5 sm:p-4">
          {events.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-2">
              <Heart className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs font-semibold text-foreground">
                No hay novedades reproductivas registradas para este animal
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                Registre celos, servicios, tactos rectales o partos para construir la hoja de vida zootécnica.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQuickEventModalOpen(true)}
                className="mt-2 h-8 text-xs font-bold rounded-lg border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Registrar primer evento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev: any) => {
                const isParto = ev.event_type === 'Parto';
                const isInsem = ev.event_type === 'Inseminacion';
                const isDiag = ev.event_type === 'Diagnostico';
                const isCelo = ev.event_type === 'Celo';
                const isSecado = ev.event_type === 'Secado';

                let eventBadgeClass = 'bg-muted text-foreground border-border';
                let EventIcon = Activity;

                if (isCelo) {
                  eventBadgeClass = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
                  EventIcon = Flame;
                } else if (isInsem) {
                  eventBadgeClass = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
                  EventIcon = Syringe;
                } else if (isDiag) {
                  eventBadgeClass = ev.diagnosis_result === 'Positivo'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
                  EventIcon = CheckCircle2;
                } else if (isParto) {
                  eventBadgeClass = 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30';
                  EventIcon = Baby;
                } else if (isSecado) {
                  eventBadgeClass = 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
                  EventIcon = Milk;
                }

                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/70 hover:border-purple-500/40 transition-all space-y-2 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${eventBadgeClass}`}>
                          <EventIcon className="h-3.5 w-3.5" />
                        </div>
                        <Badge variant="outline" className={`font-black text-xs ${eventBadgeClass}`}>
                          {ev.event_type}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          {formatDate(ev.event_date)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(ev.id)}
                          disabled={deletingEventId === ev.id}
                          className="h-7 px-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 text-xs font-semibold"
                          title={confirmingDeleteEventId === ev.id ? 'Confirmar eliminación' : 'Eliminar novedad'}
                        >
                          {confirmingDeleteEventId === ev.id ? (
                            <span className="text-[11px] font-bold text-rose-600">¿Confirmar?</span>
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Detalles según el tipo */}
                    <div className="text-xs text-muted-foreground pl-1 sm:pl-8 space-y-1">
                      {/* Inseminación */}
                      {isInsem && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                          <span>
                            <strong>Técnica:</strong> {ev.technique || 'Inseminación Artificial'}
                          </span>
                          {ev.sire ? (
                            <span>
                              <strong>Toro Reproductor:</strong>{' '}
                              <button
                                type="button"
                                onClick={() => onOpenAnimal && ev.sire_id && onOpenAnimal(ev.sire_id)}
                                className="font-bold text-primary hover:underline cursor-pointer"
                              >
                                {ev.sire.record || `Toro #${ev.sire_id}`}
                              </button>
                            </span>
                          ) : (
                            <span><strong>Toro:</strong> Pajilla / No asignado</span>
                          )}
                          {ev.expected_birth_date && (
                            <span className="text-purple-600 dark:text-purple-400 font-bold">
                              FPP: {formatDate(ev.expected_birth_date)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Diagnóstico */}
                      {isDiag && (
                        <div className="flex items-center gap-3">
                          <span><strong>Resultado:</strong></span>
                          <Badge className={
                            ev.diagnosis_result === 'Positivo'
                              ? 'bg-emerald-600 text-white font-black'
                              : ev.diagnosis_result === 'Negativo'
                              ? 'bg-rose-600 text-white font-black'
                              : 'bg-amber-600 text-white font-black'
                          }>
                            {ev.diagnosis_result === 'Positivo' ? 'Preñada (Positivo)' : ev.diagnosis_result || 'Pendiente'}
                          </Badge>
                        </div>
                      )}

                      {/* Parto */}
                      {isParto && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-3 font-semibold">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {ev.alive_count ?? 0} crías vivas
                            </span>
                            {(ev.dead_count ?? 0) > 0 && (
                              <span className="text-rose-600 font-bold">
                                {ev.dead_count} muertas
                              </span>
                            )}
                            {ev.complications && (
                              <Badge variant="destructive" className="text-[11px] px-1.5 py-0 font-bold">
                                Distocia / Complicación
                              </Badge>
                            )}
                          </div>

                          {/* Lista de crías del parto si existen */}
                          {Array.isArray(ev.offspring_list) && ev.offspring_list.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[11px] font-bold text-foreground">Crías:</span>
                              {ev.offspring_list.map((off: any, oIdx: number) => (
                                <Badge
                                  key={off.id || oIdx}
                                  variant="outline"
                                  className="text-[11px] bg-background border-border/80 gap-1 font-semibold"
                                >
                                  {off.animal_id ? (
                                    <button
                                      type="button"
                                      onClick={() => onOpenAnimal && onOpenAnimal(off.animal_id)}
                                      className="font-black text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                      <Baby className="h-3 w-3" />
                                      {off.animal?.record || `Arete #${off.animal_id}`}
                                    </button>
                                  ) : (
                                    <span>
                                      Cría {off.sex || ''} {off.birth_weight ? `(${off.birth_weight}kg)` : ''}
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notas de campo */}
                      {ev.notes && (
                        <p className="text-[11px] text-muted-foreground/90 italic pt-0.5">
                          "{ev.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DE CRÍAS Y DESCENDENCIA (Si tiene partos registrados) */}
      {allOffspring.length > 0 && (
        <CollapsibleCard
          title={`Descendencia y Crías del Ganado (${allOffspring.length})`}
          accent="purple"
          defaultCollapsed={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {allOffspring.map((cria: any, idx: number) => (
              <div
                key={cria.id || idx}
                className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-2 shadow-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                    <Baby className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-foreground truncate">
                        {cria.animal?.record || `Cría #${cria.id}`}
                      </span>
                      <Badge variant="outline" className="text-[11px] px-1 py-0 font-bold">
                        {cria.sex || 'Cría'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Nacimiento: {formatDate(cria.birth_date)} {cria.birth_weight ? `· ${cria.birth_weight}kg` : ''}
                    </p>
                  </div>
                </div>

                {cria.animal_id && onOpenAnimal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenAnimal(cria.animal_id)}
                    className="h-7 w-7 p-0 rounded-lg text-primary hover:bg-primary/10 shrink-0"
                    title="Ver ficha de la cría"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CollapsibleCard>
      )}

      {/* Genealogía y Linaje Genético */}
      <CollapsibleCard
        title="Genealogía y Linaje Genético"
        accent="amber"
        defaultCollapsed={false}
      >
        <div className="space-y-3">
          {(() => {
            const fatherId = Number(animal.idFather || animal.father_id);
            const motherId = Number(animal.idMother || animal.mother_id);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ParentMiniCard
                  parentId={fatherId > 0 ? fatherId : undefined}
                  parentLabel={fatherLabel || '-'}
                  gender="Padre"
                  onClick={
                    onFatherClick && fatherId > 0
                      ? () => onFatherClick(fatherId)
                      : undefined
                  }
                />

                <ParentMiniCard
                  parentId={motherId > 0 ? motherId : undefined}
                  parentLabel={motherLabel || '-'}
                  gender="Madre"
                  onClick={
                    onMotherClick && motherId > 0
                      ? () => onMotherClick(motherId)
                      : undefined
                  }
                />
              </div>
            );
          })()}

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

      {/* Mejoras Genéticas y Biotecnología (Sección Secundaria Colapsable) */}
      <CollapsibleCard
        title={`Mejoras Genéticas y Biotecnología (${geneticImprovements.length})`}
        accent="emerald"
        defaultCollapsed={true}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground font-medium">
              Inseminación artificial, transferencia de embriones y cruzamientos biotecnológicos
            </p>
            {onAddGeneticImprovement && (
              <Button
                size="sm"
                onClick={onAddGeneticImprovement}
                className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 bg-primary text-primary-foreground shadow-sm"
              >
                <Plus className="h-3 w-3" />
                <span>Registrar</span>
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {geneticImprovements.length === 0 ? (
              <div className="text-center py-5 text-muted-foreground text-xs italic">
                No hay registros de mejora genética para este animal.
              </div>
            ) : (
              geneticImprovements.map((item: any, idx: number) => {
                const recordId = resolveRecordId(item);
                return (
                  <div
                    key={recordId || idx}
                    className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-start justify-between gap-3 hover:border-primary/40 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground truncate">
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
      </CollapsibleCard>

      {/* Modal Flotante de Registro Rápido */}
      <ReproductiveEventQuickModal
        isOpen={isQuickEventModalOpen}
        onOpenChange={setIsQuickEventModalOpen}
        defaultAnimalId={animal.id}
        defaultAnimalRecord={animal.record}
        defaultEventType="Celo"
        onSuccess={() => {
          if (onRefreshHistory) onRefreshHistory();
        }}
      />
    </div>
  );
};
