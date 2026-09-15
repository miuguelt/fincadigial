import React, { useEffect, useState } from 'react';

import type { Task, TaskCompletionRecord } from '@/entities/task/api/task.service';
import { taskService } from '@/entities/task/api/task.service';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { IconAlertTriangle, IconCheck, IconClockCheck } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';

import { getTaskCompletionIndicator } from '../taskCompletion';

interface TaskCompletionRecordPanelProps {
  task: Pick<Task, 'id' | 'status' | 'completion_record_id'>;
  usersMap: Record<number, string>;
}

function formatCompletionMoment(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDateColombia(value);
  return `${formatDateColombia(value)} · ${date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export const TaskCompletionRecordPanel: React.FC<TaskCompletionRecordPanelProps> = ({
  task,
  usersMap,
}) => {
  const [record, setRecord] = useState<TaskCompletionRecord | null>(null);
  const [loading, setLoading] = useState(task.status === 'Completada');
  const [error, setError] = useState<string | null>(null);

  const loadRecord = async () => {
    if (task.status !== 'Completada') {
      setRecord(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await taskService.getCompletion(task.id);
      setRecord(result);
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status === 404) {
        setRecord(null);
      } else {
        setError('No se pudo consultar el registro de cumplimiento.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecord();
    // El vínculo puede aparecer después de una acción rápida de la tarjeta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.status, task.completion_record_id]);

  const indicator = getTaskCompletionIndicator({
    status: task.status,
    completion_record_id: record?.id ?? task.completion_record_id ?? null,
  });
  const completedBy = record?.completed_by
    ? usersMap[record.completed_by] || record.completed_by_name || `Usuario #${record.completed_by}`
    : 'Usuario del sistema';

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4" aria-label="Registro de cumplimiento">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Registro de cumplimiento
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            La evidencia queda ligada a esta tarea y puede auditarse después.
          </p>
        </div>
        <Badge variant={indicator.state === 'linked' ? 'success' : indicator.state === 'missing' ? 'warning' : 'outline'}>
          {indicator.label}
        </Badge>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <IconClockCheck size="sm" /> Consultando el registro guardado…
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-200" role="alert">
          <span className="flex items-center gap-2"><IconAlertTriangle size="sm" />{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadRecord()}>
            Reintentar
          </Button>
        </div>
      )}

      {!loading && !error && record && (
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-card p-3">
            <span className="block font-semibold text-muted-foreground">Guardado el</span>
            <span className="mt-1 block font-bold text-foreground">{formatCompletionMoment(record.completed_at)}</span>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-card p-3">
            <span className="block font-semibold text-muted-foreground">Realizado por</span>
            <span className="mt-1 block font-bold text-foreground">{completedBy}</span>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-card p-3 sm:col-span-2">
            <span className="block font-semibold text-muted-foreground">Observaciones</span>
            <span className="mt-1 block whitespace-pre-line text-foreground">
              {record.notes || 'Sin observaciones adicionales.'}
            </span>
          </div>
        </div>
      )}

      {!loading && !error && !record && task.status === 'Completada' && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100" role="alert">
          <IconAlertTriangle size="sm" />
          <span>{indicator.helper}. Reabre y completa la labor para consolidar el vínculo.</span>
        </div>
      )}

      {!loading && !error && task.status !== 'Completada' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconCheck size="sm" className="text-emerald-600" />
          {indicator.helper}.
        </div>
      )}
    </section>
  );
};
