import { memo } from 'react';
import { X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { typeIcons, priorityConfig } from './alertCard.constants';
import type { AlertCardData } from './AlertNotificationCard';

interface CompactAlertCardProps {
  alert: AlertCardData;
  onMarkRead?: (id: string | number) => void;
  onDismiss?: (id: string | number) => void;
}

export const CompactAlertCard = memo(function CompactAlertCard({
  alert,
  onMarkRead,
  onDismiss,
}: CompactAlertCardProps) {
  const Icon = typeIcons[alert.type] || typeIcons.Estado;
  const priority = priorityConfig[alert.priority] || priorityConfig.Media;
  const timeStr = alert.triggered_at
    ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true, locale: es })
    : '';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-accent/50 group',
        !alert.is_read && priority.bg,
        !alert.is_read && 'border-l-[3px]',
        !alert.is_read && priority.border.replace('border-', 'border-l-'),
        alert.is_read && 'opacity-70 hover:opacity-100',
      )}
      onClick={() => onMarkRead?.(alert.id)}
    >
      <div className={cn('flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', priority.badge, 'text-white')}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm whitespace-normal break-words', !alert.is_read && 'font-semibold')}>{alert.message}</p>
        {timeStr && <p className="text-xs text-muted-foreground mt-0.5">{timeStr}</p>}
      </div>

      {onDismiss && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
            e.stopPropagation();
            onDismiss(alert.id);
          }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
});

export default CompactAlertCard;
