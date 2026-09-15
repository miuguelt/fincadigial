import React from 'react';

import type { Task } from '@/entities/task/api/task.service';
import { Badge } from '@/shared/ui/badge';
import { IconAlertTriangle, IconCheck } from '@/shared/ui/icons';

import { getTaskCompletionIndicator } from '../taskCompletion';

interface TaskCompletionBadgeProps {
  task: Pick<Task, 'status' | 'completion_record_id'>;
  compact?: boolean;
}

export const TaskCompletionBadge: React.FC<TaskCompletionBadgeProps> = ({
  task,
  compact = false,
}) => {
  const indicator = getTaskCompletionIndicator(task);
  const isLinked = indicator.state === 'linked';
  const isMissing = indicator.state === 'missing';

  return (
    <div className="flex min-w-0 flex-col gap-1" title={indicator.helper}>
      <Badge
        variant={isLinked ? 'success' : isMissing ? 'warning' : 'outline'}
        className="w-fit max-w-full gap-1 text-[11px] font-bold"
      >
        {isLinked ? <IconCheck size="sm" /> : isMissing ? <IconAlertTriangle size="sm" /> : null}
        <span className="fit-clamp">{indicator.label}</span>
      </Badge>
      {!compact && (
        <span className="fit-clamp text-[11px] text-muted-foreground">{indicator.helper}</span>
      )}
    </div>
  );
};
