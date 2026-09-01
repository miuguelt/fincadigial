import React, { useMemo } from 'react';
import {
  Syringe,
  Pill,
  Activity,
  Shield,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';

interface AnimalHealthTabProps {
  animal: any;
  vaccinations: any[];
  treatments: any[];
  diseases: any[];
  vaccineOptions: Record<number, string>;
  diseaseOptions: Record<number, string>;
  formatDate: (dateStr: string) => string;
  onAddRecord: (type: 'vaccination' | 'treatment' | 'animal_disease') => void;
  onViewRecord: (type: 'vaccination' | 'treatment' | 'animal_disease', item: any) => void;
  onEditRecord: (type: 'vaccination' | 'treatment' | 'animal_disease', item: any) => void;
  onDeleteRecord: (type: 'vaccination' | 'treatment' | 'animal_disease', item: any) => Promise<void>;
  onOpenSuppliesModal?: (treatment: any) => void;
  confirmingDeleteId?: string | number | null;
  deletingItemId?: string | number | null;
}

export const AnimalHealthTab: React.FC<AnimalHealthTabProps> = ({
  animal: _animal,
  vaccinations,
  treatments,
  diseases,
  vaccineOptions,
  diseaseOptions,
  formatDate,
  onAddRecord,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onOpenSuppliesModal,
  confirmingDeleteId,
  deletingItemId,
}) => {
  const activeDiseasesCount = useMemo(
    () => diseases.filter((d: any) => d.status === 'Activo').length,
    [diseases]
  );
  const curedDiseasesCount = useMemo(
    () =>
      diseases.filter(
        (d: any) => d.status === 'Curado' || d.status === 'Inactivo' || d.status === 'Resuelto'
      ).length,
    [diseases]
  );

  // Cálculo del semáforo ICA determinista
  const icaChecks = useMemo(() => {
    const today = new Date();

    const findLatestVaccine = (keywords: string[]) => {
      const matching = vaccinations
        .filter((v: any) => {
          const vName = String(vaccineOptions[v.vaccine_id] || v.vaccine_name || v.name || '').toLowerCase();
          return keywords.some((kw) => vName.includes(kw));
        })
        .sort((a, b) => new Date(b.vaccination_date).getTime() - new Date(a.vaccination_date).getTime());
      return matching[0] || null;
    };

    const findLatestTreatment = (keywords: string[]) => {
      const matching = treatments
        .filter((t: any) => {
          const tText = `${t.diagnosis || ''} ${t.description || ''}`.toLowerCase();
          return keywords.some((kw) => tText.includes(kw));
        })
        .sort(
          (a, b) =>
            new Date(b.treatment_date || b.date).getTime() -
            new Date(a.treatment_date || a.date).getTime()
        );
      return matching[0] || null;
    };

    const evaluate = (latestDateStr: string | null | undefined, maxDays: number) => {
      if (!latestDateStr) return { status: 'missing', days: null, dateStr: '-' };
      const d = new Date(latestDateStr);
      const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > maxDays) return { status: 'overdue', days: diffDays, dateStr: latestDateStr };
      if (diffDays > maxDays * 0.85)
        return { status: 'due_soon', days: diffDays, dateStr: latestDateStr };
      return { status: 'ok', days: diffDays, dateStr: latestDateStr };
    };

    const aftosa = evaluate(findLatestVaccine(['aftosa'])?.vaccination_date, 180);
    const brucelosis = evaluate(findLatestVaccine(['brucela', 'brucelosis', 'rb51'])?.vaccination_date, 365);
    const clostridial = evaluate(findLatestVaccine(['clostridial', 'clostridi', 'carbón', 'carbon', 'enterotoxemia'])?.vaccination_date, 365);
    const desparasitacion = evaluate(
      findLatestTreatment(['desparasit', 'ivermectin', 'albendazol', 'levamisol', 'purgante'])?.treatment_date ||
        findLatestVaccine(['desparasit', 'ivermectin'])?.vaccination_date,
      120
    );

    const states = [aftosa.status, brucelosis.status, clostridial.status, desparasitacion.status];
    const overall = states.includes('overdue')
      ? 'red'
      : states.includes('missing') || states.includes('due_soon')
      ? 'yellow'
      : 'green';

    return {
      overall,
      items: [
        { label: 'Fiebre Aftosa (Obligatoria ICA)', maxDays: 180, ...aftosa },
        { label: 'Brucelosis Bovina (Cepa 19 / RB51)', maxDays: 365, ...brucelosis },
        { label: 'Carbón Sintomático / Clostridial', maxDays: 365, ...clostridial },
        { label: 'Control Parasitario Periódico', maxDays: 120, ...desparasitacion },
      ],
    };
  }, [vaccinations, treatments, vaccineOptions]);

  return (
    <div className="space-y-4">
      {/* 4 KPIs de Estado Sanitario */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>Vacunaciones</span>
            <Syringe className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {vaccinations.length} <span className="text-xs font-semibold text-muted-foreground">dosis</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Aplicadas en el historial</p>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            <span>Tratamientos</span>
            <Pill className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {treatments.length} <span className="text-xs font-semibold text-muted-foreground">eventos</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Planes clínicos ejecutados</p>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <span>Carga Sanitaria</span>
            <Activity className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {activeDiseasesCount} <span className="text-xs font-semibold text-muted-foreground">activas</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{curedDiseasesCount} recuperaciones registradas</p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3.5 space-y-1',
            icaChecks.overall === 'green'
              ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
              : icaChecks.overall === 'yellow'
              ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300'
              : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span>Semáforo ICA</span>
            <Shield className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-foreground">
            {icaChecks.overall === 'green' ? 'Al Día ✓' : icaChecks.overall === 'yellow' ? 'Por Revisar ⚠' : 'Vencido ✗'}
          </div>
          <p className="text-[11px] text-muted-foreground">Normatividad Sanitaria Colombia</p>
        </div>
      </div>

      {/* Semáforo Detallado de Normatividad ICA */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 p-4 sm:p-5 shadow-sm space-y-3 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Control Sanitario y Vigencia Oficial ICA
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Monitoreo automático de ciclos de vacunación obligatoria y desparasitación
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-[11px] font-bold uppercase px-2.5 py-0.5',
              icaChecks.overall === 'green'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                : icaChecks.overall === 'yellow'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
            )}
          >
            {icaChecks.overall === 'green' ? 'Cumplimiento Óptimo' : 'Acción Requerida'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {icaChecks.items.map((item) => {
            const isOk = item.status === 'ok';
            const isDueSoon = item.status === 'due_soon';
            const isOverdue = item.status === 'overdue';

            return (
              <div
                key={item.label}
                className={cn(
                  'p-3 rounded-xl border flex items-center justify-between gap-3 transition-all',
                  isOk
                    ? 'border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/15'
                    : isDueSoon
                    ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/15'
                    : isOverdue
                    ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/15'
                    : 'border-border/60 bg-background/60'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold',
                      isOk
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : isDueSoon
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : isOverdue
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isOk ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isDueSoon ? (
                      <Clock className="h-4 w-4" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      '—'
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground fit-clamp">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.dateStr !== '-' ? `Última: ${formatDate(item.dateStr)}` : 'Sin registro previo'}
                      {item.days !== null && ` (${item.days} días)`}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px] font-bold shrink-0',
                    isOk
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : isDueSoon
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : isOverdue
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isOk ? 'Al Día' : isDueSoon ? 'Por Vencer' : isOverdue ? 'Vencido' : 'Pendiente'}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid de 2 Columnas con Registros Clínicos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Vacunaciones */}
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 shadow-sm overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/60 bg-card/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Syringe className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Vacunaciones ({vaccinations.length})
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">Biológicos aplicados</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onAddRecord('vaccination')}
              className="h-7.5 px-2.5 rounded-lg text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar</span>
            </Button>
          </div>

          <div className="p-3.5 space-y-2 max-h-[350px] overflow-y-auto">
            {vaccinations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs italic">
                No hay vacunas registradas.
              </div>
            ) : (
              vaccinations.map((v: any, idx: number) => {
                const recordId = resolveRecordId(v);
                return (
                  <div
                    key={recordId || idx}
                    className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-start justify-between gap-2.5 hover:border-primary/40 transition-all hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-foreground fit-clamp">
                          {vaccineOptions[v.vaccine_id] || v.vaccine_name || `Vacuna #${v.vaccine_id}`}
                        </span>
                        <Badge variant="outline" className="text-[11px] h-4.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 shrink-0">
                          {formatDate(v.vaccination_date)}
                        </Badge>
                      </div>
                      {v.next_dose_date && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-sky-400 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                          Próxima dosis: {formatDate(v.next_dose_date)}
                        </div>
                      )}
                      {v.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5 fit-clamp">"{v.notes}"</p>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRecord('vaccination', v)}
                        className="h-6.5 w-6.5 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        title="Ver detalle"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditRecord('vaccination', v)}
                        className="h-6.5 w-6.5 p-0 rounded-md text-blue-600 hover:text-blue-700"
                        title="Editar vacuna"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteRecord('vaccination', v)}
                        disabled={deletingItemId !== null && deletingItemId === recordId}
                        className={cn(
                          'h-6.5 w-6.5 p-0 rounded-md text-rose-600 hover:text-rose-700',
                          confirmingDeleteId === recordId && 'bg-destructive text-destructive-foreground animate-pulse'
                        )}
                        title={confirmingDeleteId === recordId ? 'Confirmar' : 'Eliminar'}
                      >
                        {confirmingDeleteId === recordId ? '✓' : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Tratamientos y Farmacología */}
        <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 shadow-sm overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/60 bg-card/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
                <Pill className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Tratamientos ({treatments.length})
                </h3>
                <p className="text-[11px] text-muted-foreground font-medium">Prescripciones médicas</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => onAddRecord('treatment')}
              className="h-7.5 px-2.5 rounded-lg text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar</span>
            </Button>
          </div>

          <div className="p-3.5 space-y-2 max-h-[350px] overflow-y-auto">
            {treatments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs italic">
                No hay tratamientos registrados.
              </div>
            ) : (
              treatments.map((t: any, idx: number) => {
                const recordId = resolveRecordId(t);
                return (
                  <div
                    key={recordId || idx}
                    className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 space-y-2 hover:border-primary/40 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight fit-clamp">
                          {t.diagnosis || t.description || `Tratamiento #${t.id}`}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          {t.dosis && <span>Dosis: {t.dosis}</span>}
                          {t.frequency && <span>• {t.frequency}</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[11px] h-4.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 shrink-0">
                        {formatDate(t.treatment_date || t.date)}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      {onOpenSuppliesModal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenSuppliesModal(t)}
                          className="h-6 px-2 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 gap-1 rounded-md"
                        >
                          <Syringe className="h-3 w-3" />
                          <span>Ver Insumos</span>
                        </Button>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewRecord('treatment', t)}
                          className="h-6.5 w-6.5 p-0 rounded-md text-muted-foreground hover:text-foreground"
                          title="Ver detalle"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditRecord('treatment', t)}
                          className="h-6.5 w-6.5 p-0 rounded-md text-blue-600 hover:text-blue-700"
                          title="Editar tratamiento"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteRecord('treatment', t)}
                          disabled={deletingItemId !== null && deletingItemId === recordId}
                          className={cn(
                            'h-6.5 w-6.5 p-0 rounded-md text-rose-600 hover:text-rose-700',
                            confirmingDeleteId === recordId && 'bg-destructive text-destructive-foreground animate-pulse'
                          )}
                          title={confirmingDeleteId === recordId ? 'Confirmar' : 'Eliminar'}
                        >
                          {confirmingDeleteId === recordId ? '✓' : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. Enfermedades y Diagnósticos */}
      <CollapsibleCard
        title={`Historial de Enfermedades y Diagnósticos (${diseases.length})`}
        accent="red"
        defaultCollapsed={false}
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => onAddRecord('animal_disease')}
              className="h-7.5 px-3 rounded-lg text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Diagnóstico</span>
            </Button>
          </div>

          {diseases.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs italic">
              El animal no tiene diagnósticos de enfermedad registrados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {diseases.map((d: any, idx: number) => {
                const recordId = resolveRecordId(d);
                const isActive = d.status === 'Activo';
                return (
                  <div
                    key={recordId || idx}
                    className="p-3 rounded-xl bg-background/80 dark:bg-card/50 border border-border/60 flex items-start justify-between gap-3 hover:border-primary/40 transition-all hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-foreground fit-clamp">
                          {diseaseOptions[d.disease_id] || d.disease_name || `Enfermedad #${d.disease_id}`}
                        </span>
                        <Badge
                          variant={isActive ? 'destructive' : 'default'}
                          className={cn(
                            'text-[11px] h-4.5',
                            d.status === 'Curado' ? 'bg-emerald-600 text-white' : ''
                          )}
                        >
                          {d.status || 'Activo'}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        <span>Diagnóstico: {formatDate(d.diagnosis_date)}</span>
                        {d.notes && <p className="italic fit-clamp mt-0.5">"{d.notes}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewRecord('animal_disease', d)}
                        className="h-6.5 w-6.5 p-0 rounded-md text-muted-foreground hover:text-foreground"
                        title="Ver detalle"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditRecord('animal_disease', d)}
                        className="h-6.5 w-6.5 p-0 rounded-md text-blue-600 hover:text-blue-700"
                        title="Editar diagnóstico"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteRecord('animal_disease', d)}
                        disabled={deletingItemId !== null && deletingItemId === recordId}
                        className={cn(
                          'h-6.5 w-6.5 p-0 rounded-md text-rose-600 hover:text-rose-700',
                          confirmingDeleteId === recordId && 'bg-destructive text-destructive-foreground animate-pulse'
                        )}
                        title={confirmingDeleteId === recordId ? 'Confirmar' : 'Eliminar'}
                      >
                        {confirmingDeleteId === recordId ? '✓' : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleCard>
    </div>
  );
};
