import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface NotificationFooterProps {
  connected: boolean;
  totalCount: number;
  unreadCount: number;
  onMarkAllAsRead: () => void;
  onViewAll: () => void;
}

export function NotificationFooter({
  connected,
  totalCount,
  unreadCount,
  onMarkAllAsRead,
  onViewAll,
}: NotificationFooterProps) {
  return (
    <div className="p-3 border-t bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-success' : 'bg-destructive')} />
          <span className="text-xs text-muted-foreground">
            {totalCount} alerta{totalCount !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAllAsRead}>
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}

          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewAll}>
            Ver todas
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotificationFooter;
