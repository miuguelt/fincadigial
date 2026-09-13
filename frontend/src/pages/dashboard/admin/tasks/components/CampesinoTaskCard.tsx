import React from 'react';
import { Task } from '@/entities/task/api/task.service';
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

interface CampesinoTaskCardProps {
  task: Task;
  onOpenDetail?: (task: Task) => void;
  onStatusChange?: (task: Task, newStatus: Task['status']) => void;
  fieldsMap?: Record<number, string>;
  animalsMap?: Record<number, string>;
  usersMap?: Record<number, string>;
  loadingStatusId?: number | null;
}

export const CampesinoTaskCard: React.FC<CampesinoTaskCardProps> = ({
  task,
  onOpenDetail,
  onStatusChange,
  fieldsMap = {},
  animalsMap = {},
  usersMap = {},
  loadingStatusId,
}) => {
  const isUpdating = loadingStatusId === task.id;
  const today = getTodayColombia();

  // Calcular atraso o urgencia
  const getDueStatus = () => {
    if (!task.due_date) return null;
    const taskDate = task.due_date.split('T')[0];

    if (task.status === 'Completada') {
      return {
        label: formatDateColombia(task.due_date),
        variant: 'outline' as const,
        isOverdue: false,
      };
    }

    if (taskDate < today) {
      // Calcular días de atraso
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

    // Mañana
    const tomorrow = new Date(new Date(today).getTime() + 86400000).toISOString().split('T')[0];
    if (taskDate === tomorrow) {
      return {
        label: 'Mañana',
        variant: 'secondary' as const,
      };
    }

    return {
      label: formatDateColombia(task.due_date),
      variant: 'outline' as const,
    };
  };

  const dueInfo = getDueStatus();

  const priorityVariants: Record<string, 'destructive' | 'warning' | 'secondary' | 'outline'> = {
    Urgente: 'destructive',
    Alta: 'warning',
    Media: 'secondary',
    Baja: 'outline',
  };

  const fieldName = task.field_id ? fieldsMap[task.field_id] : null;
  const animalName = task.animal_id ? animalsMap[task.animal_id] : null;
  const assigneeName = task.assigned_to ? usersMap[task.assigned_to] : null;

  return (
    <div
      onClick={() => onOpenDetail?.(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail?.(task);
        }
      }}
      className={cn(
        'group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 select-none cursor-pointer',
        'bg-card hover:shadow-lg active:scale-[0.99] min-h-[200px]',
        task.status === 'Completada'
          ? 'border-emerald-500/40 bg-emerald-500/5 opacity-85 hover:opacity-100'
          : dueInfo?.isOverdue
          ? 'border-rose-500/60 shadow-sm shadow-rose-500/10'
          : task.status === 'En Progreso'
          ? 'border-sky-500/60 shadow-sm shadow-sky-500/10'
          : 'border-border/80 hover:border-primary/60'
      )}
    >
      <div>
        {/* Cabecera de la tarjeta: Vencimiento y Prioridad */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {dueInfo && (
              <Badge
                variant={dueInfo.variant as any}
                className={cn(
                  'text-[11px] font-bold px-2 py-0.5 flex items-center gap-1 rounded-lg',
                  dueInfo.isToday && 'bg-emerald-600 text-white animate-pulse',
                  dueInfo.isOverdue && 'bg-rose-600 text-white font-black'
                )}
              >
                {dueInfo.isOverdue ? (
                  <IconAlertTriangle size="sm" />
                ) : (
                  <IconCalendar size="sm" />
                )}
                {dueInfo.label}
              </Badge>
            )}

            <Badge
              variant={priorityVariants[task.priority] || 'secondary'}
              className="text-[10px] uppercase font-bold tracking-wider rounded-lg"
            >
              {task.priority}
            </Badge>
          </div>

          <Badge
            variant={
              task.status === 'Completada'
                ? 'success'
                : task.status === 'En Progreso'
                ? 'warning'
                : 'secondary'
            }
            className="text-[11px] font-semibold rounded-lg"
          >
            {task.status === 'En Progreso' ? 'En Faena' : task.status}
          </Badge>
        </div>

        {/* Título de la labor */}
        <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {task.title}
        </h3>

        {/* Descripción o notas */}
        {task.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Contexto ganadero (Potrero, Animal, Encargado) */}
        <div className="mt-3.5 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {fieldName && (
            <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
              <IconMapPin size="sm" className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate">Potrero: <strong className="text-foreground">{fieldName}</strong></span>
            </div>
          )}

          {animalName && (
            <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
              <IconPaw size="sm" className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="truncate">Animal: <strong className="text-foreground">{animalName}</strong></span>
            </div>
          )}

          {assigneeName && (
            <div className="flex items-center gap-1.5 text-foreground/80 font-medium sm:col-span-2">
              <IconUser size="sm" className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
              <span className="truncate">Encargado: <strong className="text-foreground">{assigneeName}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción táctiles de 1 Toque (Min 44px de alto) */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
        {task.status === 'Pendiente' && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(task, 'En Progreso');
              }}
              className="flex-1 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border-sky-500/40 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
            >
              <IconClockCheck size="sm" />
              <span>Iniciar faena</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(task, 'Completada');
              }}
              className="flex-1 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <IconCheck size="sm" />
              <span>¡Completar!</span>
            </Button>
          </>
        )}

        {task.status === 'En Progreso' && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isUpdating}
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(task, 'Completada');
            }}
            className="w-full min-h-[44px] rounded-xl font-black text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95"
          >
            <IconCheck size="md" />
            <span>✓ ¡Terminar y Guardar Labor!</span>
          </Button>
        )}

        {task.status === 'Completada' && (
          <div className="w-full flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <IconCheck size="sm" />
              Labor realizada con éxito
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUpdating}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(task, 'Pendiente');
              }}
              className="min-h-[36px] text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <IconRotate size="sm" />
              Reabrir
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
