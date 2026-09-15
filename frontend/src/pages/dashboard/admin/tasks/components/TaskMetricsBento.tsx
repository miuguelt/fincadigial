import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import {
  IconCalendar,
  IconAlertTriangle,
  IconCheck,
  IconClockCheck,
} from '@/shared/ui/icons';
import { cn } from '@/shared/ui/cn';
import { TaskMetrics, TaskFilterKey } from '../tasks.types';

interface TaskMetricsBentoProps {
  metrics: TaskMetrics;
  activeFilter: TaskFilterKey;
  onSelectFilter: (filter: TaskFilterKey) => void;
}

export const TaskMetricsBento: React.FC<TaskMetricsBentoProps> = ({
  metrics,
  activeFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      key: 'today' as TaskFilterKey,
      title: 'Labores de Hoy',
      subtitle: 'Para la faena del día',
      value: metrics.todayCount,
      icon: IconCalendar,
      activeColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100',
      badgeColor: 'bg-emerald-600 text-white',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      key: 'urgent_overdue' as TaskFilterKey,
      title: 'Urgentes / Atrasadas',
      subtitle: 'Atención inmediata',
      value: metrics.urgentCount,
      icon: IconAlertTriangle,
      activeColor: 'border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-100',
      badgeColor: 'bg-rose-600 text-white animate-pulse',
      textColor: 'text-rose-700 dark:text-rose-300',
    },
    {
      key: 'in_progress' as TaskFilterKey,
      title: 'En Faena / En Curso',
      subtitle: 'Iniciadas por el equipo',
      value: metrics.inProgressCount,
      icon: IconClockCheck,
      activeColor: 'border-sky-500 bg-sky-500/10 text-sky-950 dark:text-sky-100',
      badgeColor: 'bg-sky-600 text-white',
      textColor: 'text-sky-700 dark:text-sky-300',
    },
    {
      key: 'completed' as TaskFilterKey,
      title: 'Cumplidas',
      subtitle: 'Labores terminadas',
      value: metrics.completedCount,
      icon: IconCheck,
      activeColor: 'border-teal-500 bg-teal-500/10 text-teal-950 dark:text-teal-100',
      badgeColor: 'bg-teal-600 text-white',
      textColor: 'text-teal-700 dark:text-teal-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-3">
      {cards.map((c) => {
        const isActive = activeFilter === c.key;
        const IconComponent = c.icon;

        return (
          <Card
            key={c.key}
            onClick={() => onSelectFilter(isActive ? 'all' : c.key)}
            className={cn(
              'cursor-pointer transition-all duration-200 border-2 rounded-2xl select-none',
              'hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]',
              isActive
                ? cn('shadow-md ring-2 ring-primary/40', c.activeColor)
                : 'border-border/70 bg-card hover:border-border'
            )}
          >
            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-foreground fit-clamp">
                    {c.title}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground fit-clamp hidden sm:block">
                  {c.subtitle}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={cn(
                      'text-xl sm:text-2xl lg:text-3xl font-black tracking-tight',
                      c.textColor
                    )}
                  >
                    {c.value}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase">
                    {c.value === 1 ? 'Labor' : 'Labores'}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm',
                  c.badgeColor
                )}
              >
                <IconComponent size="md" className="text-white" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
