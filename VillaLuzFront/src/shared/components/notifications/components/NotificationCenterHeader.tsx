import { Bell, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface NotificationCenterHeaderProps {
  connected: boolean;
  loading: boolean;
  unreadCount: number;
  criticalCount: number;
  onRefresh: () => void;
}

export function NotificationCenterHeader({
  connected,
  loading,
  unreadCount,
  criticalCount,
  onRefresh,
}: NotificationCenterHeaderProps) {
  return (
    <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Centro de Alertas</h3>
            <p className="text-xs text-muted-foreground">
              {connected ? 'Conectado en tiempo real' : 'Modo offline'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>
      </div>

      {unreadCount > 0 && (
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-destructive/5 dark:bg-red-950/40 border border-destructive/30 dark:border-red-800">
              <AlertCircle className="h-3 w-3 text-destructive dark:text-destructive/80" />
              <span className="text-xs font-semibold text-destructive dark:text-red-300">
                {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {unreadCount > criticalCount && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning/5 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3 w-3 text-warning dark:text-warning/80" />
              <span className="text-xs font-semibold text-warning dark:text-amber-300">
                {unreadCount - criticalCount} pendiente{(unreadCount - criticalCount) > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenterHeader;
