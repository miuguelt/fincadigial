import React, { useMemo } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';

interface AnimalPastureTabProps {
  animal: any;
  fields: any[];
  fieldOptions: Record<number, string>;
  formatDate: (dateStr: string) => string;
  onAddRecord: (type: 'animal_field') => void;
  onViewRecord: (type: 'animal_field', item: any) => void;
  onEditRecord: (type: 'animal_field', item: any) => void;
  onDeleteRecord: (type: 'animal_field', item: any) => Promise<void>;
  confirmingDeleteId?: string | number | null;
  deletingItemId?: string | number | null;
}

export const AnimalPastureTab: React.FC<AnimalPastureTabProps> = ({
  animal,
  fields,
  fieldOptions,
  formatDate,
  onAddRecord,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  confirmingDeleteId,
  deletingItemId,
}) => {
  // Ordenar asignaciones de potreros de más reciente a más antigua
  const sortedFields = useMemo(() => {
    return [...fields].sort(
      (a, b) =>
        new Date(b.assignment_date || b.created_at).getTime() -
        new Date(a.assignment_date || a.created_at).getTime()
    );
  }, [fields]);

  const activeAssignment = useMemo(() => {
    return fields.find((f: any) => !f.removal_date);
  }, [fields]);

  const currentPotreroName = useMemo(() => {
    if (activeAssignment) {
      return (
        fieldOptions[activeAssignment.field_id] ||
        activeAssignment.field?.name ||
        activeAssignment.field_name ||
        `Potrero #${activeAssignment.field_id}`
      );
    }
    return animal.current_field_name || animal.current_pasture || 'Sin potrero asignado';
  }, [activeAssignment, fieldOptions, animal.current_field_name, animal.current_pasture]);

  const daysInCurrentField = useMemo(() => {
    if (!activeAssignment?.assignment_date) return null;
    const diff = Math.floor(
      (Date.now() - new Date(activeAssignment.assignment_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 ? diff : 0;
  }, [activeAssignment]);

  const avgDaysPerField = useMemo(() => {
    if (fields.length === 0) return 0;
    const completed = fields.filter((f: any) => f.assignment_date && f.removal_date);
    if (completed.length === 0) return daysInCurrentField ?? 0;
    const totalDays = completed.reduce((acc, f: any) => {
      const d1 = new Date(f.assignment_date).getTime();
      const d2 = new Date(f.removal_date).getTime();
      return acc + Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
    }, 0);
    return Math.round(totalDays / completed.length);
  }, [fields, daysInCurrentField]);

  // Alerta de sobrepastoreo si supera 30 días continuos en el mismo potrero
  const isOvergrazing = daysInCurrentField !== null && daysInCurrentField > 30;

  return (
    <div className="space-y-4">
      {/* 4 KPIs de Manejo de Pasturas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Potrero Actual</span>
            <MapPin className="h-4 w-4" />
          </div>
          <div className="text-xl font-black text-foreground fit-clamp" title={currentPotreroName}>
            {currentPotreroName}
          </div>
          <p className="text-[11px] text-muted-foreground fit-clamp">
            {activeAssignment ? `Desde ${formatDate(activeAssignment.assignment_date)}` : 'Sin asignación activa'}
          </p>
        </div>

        <div
          className={cn(
            'rounded-xl border p-3.5 space-y-1',
            isOvergrazing
              ? 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30'
              : 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20'
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <span>Permanencia Continua</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {daysInCurrentField !== null ? `${daysInCurrentField} días` : '—'}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isOvergrazing ? '⚠️ Rotación recomendada' : 'Tiempo en el lote actual'}
          </p>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
            <span>Total Rotaciones</span>
            <RotateCw className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {fields.length} <span className="text-xs font-semibold text-muted-foreground">traslados</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Movimientos registrados en finca</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <span>Promedio por Potrero</span>
            <Calendar className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {avgDaysPerField} <span className="text-xs font-semibold text-muted-foreground">días</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Ciclo medio de descanso y pastoreo</p>
        </div>
      </div>

      {/* Tarjeta de Alerta de Rotación / Buenas Prácticas */}
      {isOvergrazing && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
              Alerta de Manejo de Pasturas: {daysInCurrentField} Días en el Mismo Potrero
            </h4>
            <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mt-0.5">
              Se aconseja trasladar este animal a un nuevo potrero con pasto recuperado para prevenir la
              degradación del forraje y optimizar la ganancia de peso (ADG).
            </p>
          </div>
        </div>
      )}

      {/* Historial Detallado de Rotaciones */}
      <div className="rounded-2xl border border-border/70 dark:border-white/10 bg-card/70 dark:bg-card/40 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border/60 bg-card/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Historial de Asignaciones y Rotaciones de Potreros ({fields.length})
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Trazabilidad de ocupación y descanso de praderas
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onAddRecord('animal_field')}
            className="h-7.5 px-2.5 rounded-lg text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Asignar Potrero</span>
          </Button>
        </div>

        <div className="p-3.5 space-y-2.5 max-h-[400px] overflow-y-auto">
          {sortedFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs italic">
              No hay historial de rotaciones de potrero para este animal.
            </div>
          ) : (
            sortedFields.map((item: any, idx: number) => {
              const recordId = resolveRecordId(item);
              const isCurrent = !item.removal_date;
              const durationDays = item.assignment_date
                ? Math.floor(
                    (new Date(item.removal_date || Date.now()).getTime() -
                      new Date(item.assignment_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <div
                  key={recordId || idx}
                  className={cn(
                    'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:shadow-sm',
                    isCurrent
                      ? 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20'
                      : 'border-border/60 bg-background/80 dark:bg-card/50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black',
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-foreground fit-clamp">
                          {fieldOptions[item.field_id] || `Potrero #${item.field_id}`}
                        </span>
                        <Badge
                          variant={isCurrent ? 'default' : 'secondary'}
                          className={cn(
                            'text-[11px] h-4.5',
                            isCurrent ? 'bg-emerald-600 text-white animate-pulse' : ''
                          )}
                        >
                          {isCurrent ? 'Activo en este potrero' : 'Rotado / Salida'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span>Ingreso: {formatDate(item.assignment_date)}</span>
                        {item.removal_date && <span>Salida: {formatDate(item.removal_date)}</span>}
                        {durationDays !== null && (
                          <span className="font-semibold text-foreground/80">
                            Duración: {durationDays} {durationDays === 1 ? 'día' : 'días'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewRecord('animal_field', item)}
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                      title="Ver detalle"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditRecord('animal_field', item)}
                      className="h-7 w-7 p-0 rounded-lg text-blue-600 hover:text-blue-700"
                      title="Editar asignación"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteRecord('animal_field', item)}
                      disabled={deletingItemId !== null && deletingItemId === recordId}
                      className={cn(
                        'h-7 w-7 p-0 rounded-lg text-rose-600 hover:text-rose-700',
                        confirmingDeleteId === recordId && 'bg-destructive text-destructive-foreground animate-pulse'
                      )}
                      title={confirmingDeleteId === recordId ? 'Confirmar' : 'Eliminar'}
                    >
                      {confirmingDeleteId === recordId ? '✓' : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
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
