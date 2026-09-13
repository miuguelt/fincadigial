import React from 'react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';
import { TaskFilterKey } from '../tasks.types';

interface TaskQuickFiltersProps {
  activeFilter: TaskFilterKey;
  onFilterChange: (filter: TaskFilterKey) => void;
  counts: {
    all: number;
    today: number;
    urgent_overdue: number;
    in_progress: number;
    my_tasks: number;
    completed: number;
  };
}

export const TaskQuickFilters: React.FC<TaskQuickFiltersProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const filters: { key: TaskFilterKey; label: string; count: number; alert?: boolean }[] = [
    { key: 'all', label: 'Todas las labores', count: counts.all },
    { key: 'today', label: '📅 Para Hoy', count: counts.today },
    {
      key: 'urgent_overdue',
      label: '⚠️ Urgentes / Atrasadas',
      count: counts.urgent_overdue,
      alert: counts.urgent_overdue > 0,
    },
    { key: 'in_progress', label: '⏳ En Faena', count: counts.in_progress },
    { key: 'my_tasks', label: '🤠 Mis Labores', count: counts.my_tasks },
    { key: 'completed', label: '✅ Cumplidas', count: counts.completed },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 no-scrollbar touch-pan-x">
      {filters.map((f) => {
        const isActive = activeFilter === f.key;

        return (
          <Button
            key={f.key}
            type="button"
            variant={isActive ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(f.key)}
            className={cn(
              'rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap min-h-[40px] sm:min-h-[44px] transition-all',
              isActive
                ? 'shadow-sm ring-1 ring-primary/30'
                : 'bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground',
              f.alert && !isActive && 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400'
            )}
          >
            <span>{f.label}</span>
            <Badge
              variant={isActive ? 'secondary' : 'outline'}
              className={cn(
                'ml-1 px-1.5 py-0.2 text-[11px] font-bold rounded-full',
                isActive && 'bg-primary-foreground/20 text-primary-foreground',
                f.alert && isActive && 'bg-rose-500 text-white'
              )}
            >
              {f.count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
};
