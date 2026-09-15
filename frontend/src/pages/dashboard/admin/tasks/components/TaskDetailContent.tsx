import React, { useState } from 'react';
import { Task, taskService } from '@/entities/task/api/task.service';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  IconCalendar,
  IconMapPin,
  IconPaw,
  IconUser,
  IconCheck,
  IconClockCheck,
  IconAlertTriangle,
  IconRotate,
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';
import { formatDateColombia, getTodayColombia } from '@/shared/utils/dateUtils';
import { useToast } from '@/app/providers/ToastContext';
import { TaskCompletionRecordPanel } from './TaskCompletionRecordPanel';

interface TaskDetailContentProps {
  task: Task;
  fieldsMap?: Record<number, string>;
  animalsMap?: Record<number, string>;
  usersMap?: Record<number, string>;
  onStatusChanged?: (newStatus: Task['status']) => void;
}

export const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  fieldsMap = {},
  animalsMap = {},
  usersMap = {},
  onStatusChanged,
}) => {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Task['status']>(task.status);
  const today = getTodayColombia();

  const handleStatusChange = async (newStatus: Task['status']) => {
    setUpdating(true);
    try {
      const result = await taskService.updateStatus(task.id, newStatus);
      setCurrentStatus(newStatus);
      onStatusChanged?.(newStatus);
      window.dispatchEvent(new CustomEvent('crud:refetch'));
      showToast(
        newStatus === 'Completada'
          ? result?.id
            ? `¡Labor completada! Se guardó el registro #${result.id}.`
            : '¡Labor completada con éxito en la finca!'
          : `Estado actualizado a "${newStatus}"`,
        'success'
      );
    } catch (err) {
      console.error('Error al actualizar estado de tarea:', err);
      showToast('No se pudo actualizar el estado de la labor', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const getDueInfo = () => {
    if (!task.due_date) return null;
    const taskDate = task.due_date.split('T')[0];

    if (currentStatus === 'Completada') {
      return {
        label: formatDateColombia(task.due_date),
        variant: 'outline' as const,
      };
    }

    if (taskDate < today) {
      const diffTime = Math.abs(new Date(today).getTime() - new Date(taskDate).getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        label: diffDays === 1 ? 'Atrasada hace 1 día' : `Atrasada hace ${diffDays} días`,
        variant: 'destructive' as const,
        isOverdue: true,
      };
    }

    if (taskDate === today) {
      return {
        label: '¡Para Hoy!',
        variant: 'success' as const,
        isToday: true,
      };
    }

    return {
      label: formatDateColombia(task.due_date),
      variant: 'outline' as const,
    };
  };

  const dueInfo = getDueInfo();
  const fieldName = task.field_id ? fieldsMap[task.field_id] : null;
  const animalName = task.animal_id ? animalsMap[task.animal_id] : null;
  const assigneeName = task.assigned_to ? usersMap[task.assigned_to] : null;

  return (
    <div className="space-y-5 p-1">
      {/* Encabezado con estado y prioridad */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              currentStatus === 'Completada'
                ? 'success'
                : currentStatus === 'En Progreso'
                ? 'warning'
                : 'secondary'
            }
            className="text-xs font-bold px-2.5 py-1 rounded-lg"
          >
            {currentStatus === 'En Progreso' ? 'En Faena' : currentStatus}
          </Badge>

          <Badge variant="outline" className="text-xs font-semibold px-2 py-1 rounded-lg">
            Prioridad {task.priority}
          </Badge>
        </div>

        {dueInfo && (
          <Badge
            variant={dueInfo.variant as any}
            className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1',
              dueInfo.isToday && 'bg-emerald-600 text-white',
              dueInfo.isOverdue && 'bg-rose-600 text-white'
            )}
          >
            {dueInfo.isOverdue ? <IconAlertTriangle size="sm" /> : <IconCalendar size="sm" />}
            {dueInfo.label}
          </Badge>
        )}
      </div>

      {/* Título y descripción */}
      <div className="space-y-2">
        <h2 className="text-lg sm:text-xl font-black text-foreground">{task.title}</h2>
        {task.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-card p-3 rounded-xl border border-border/50">
            {task.description}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sin observaciones adicionales registradas.</p>
        )}
      </div>

      {/* Contexto ganadero */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <IconMapPin size="sm" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Potrero</span>
            <span className="text-sm font-bold text-foreground fit-clamp block">
              {fieldName || 'No especificado'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <IconPaw size="sm" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Animal / Lote</span>
            <span className="text-sm font-bold text-foreground fit-clamp block">
              {animalName || 'Toda la finca / Sin animal'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border/60 flex items-center gap-3 sm:col-span-2">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <IconUser size="sm" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase block">Vaquero / Encargado</span>
            <span className="text-sm font-bold text-foreground fit-clamp block">
              {assigneeName || 'Sin asignar'}
            </span>
          </div>
        </div>
      </div>

      <TaskCompletionRecordPanel task={{ ...task, status: currentStatus }} usersMap={usersMap} />

      {/* Botones de acción rápida */}
      <div className="pt-3 border-t border-border/60 space-y-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
          Acciones de Faena
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {currentStatus !== 'Completada' && (
            <Button
              type="button"
              variant="primary"
              disabled={updating}
              onClick={() => handleStatusChange('Completada')}
              className="flex-1 min-h-[44px] rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
            >
              <IconCheck size="sm" />
              <span>Marcar como Completada</span>
            </Button>
          )}

          {currentStatus === 'Pendiente' && (
            <Button
              type="button"
              variant="outline"
              disabled={updating}
              onClick={() => handleStatusChange('En Progreso')}
              className="flex-1 min-h-[44px] rounded-xl font-bold border-sky-500/50 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300 flex items-center justify-center gap-2"
            >
              <IconClockCheck size="sm" />
              <span>Arrancar Faena</span>
            </Button>
          )}

          {currentStatus === 'Completada' && (
            <Button
              type="button"
              variant="outline"
              disabled={updating}
              onClick={() => handleStatusChange('Pendiente')}
              className="w-full min-h-[44px] rounded-xl font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
            >
              <IconRotate size="sm" />
              <span>Reabrir Labor (Pasar a Pendiente)</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
