import { useState, useMemo, useCallback } from 'react';
import { Bell, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { useRealtimeNotifications } from '@/shared/hooks/useRealtimeNotifications';
import { useToast } from '@/app/providers/ToastContext';
import { CompactAlertCard } from './components/CompactAlertCard';
import { NotificationCenterHeader } from './components/NotificationCenterHeader';
import { NotificationFilterTabs } from './components/NotificationFilterTabs';
import { NotificationFooter } from './components/NotificationFooter';
import { useNavigate } from 'react-router-dom';

type FilterTab = 'todas' | 'criticas' | 'pendientes' | 'leidas';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('pendientes');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    connected,
    loading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    refreshAlerts,
  } = useRealtimeNotifications({
    onNotification: useCallback((notification: any) => {
      if (notification.priority === 'Crítica' || notification.priority === 'Alta') {
        showToast(notification.message, notification.type);
      }
    }, [showToast]),
  });

  const criticalCount = useMemo(
    () => notifications.filter(n => n.priority === 'Crítica' && !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'criticas': return notifications.filter(n => n.priority === 'Crítica');
      case 'pendientes': return notifications.filter(n => !n.read);
      case 'leidas': return notifications.filter(n => n.read);
      default: return notifications;
    }
  }, [notifications, activeTab]);

  const mapToCard = (n: any) => ({
    id: n.id,
    type: n.alertType || n.title,
    priority: n.priority || 'Media',
    message: n.message,
    recommendation: n.recommendation,
    triggered_at: n.timestamp,
    is_read: n.read,
    action_url: n.action?.url,
    action_label: n.action?.label,
  });

  const handleMarkAsRead = (id: string | number) => markAsRead(String(id));
  const handleRemove = (id: string | number) => removeNotification(String(id));

  const tabs = [
    { key: 'pendientes' as FilterTab, label: 'Pendientes', count: unreadCount },
    { key: 'criticas' as FilterTab, label: 'Críticas', count: criticalCount },
    { key: 'todas' as FilterTab, label: 'Todas', count: notifications.length },
    { key: 'leidas' as FilterTab, label: 'Leídas' },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)}>
          <Bell className="h-5 w-5" />
          {criticalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white animate-pulse">
              {criticalCount > 9 ? '!' : criticalCount}
            </span>
          )}
          {unreadCount > 0 && criticalCount === 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[420px] p-0 z-[60]" align="end" sideOffset={8} collisionPadding={16}>
        <NotificationCenterHeader
          connected={connected}
          loading={loading}
          unreadCount={unreadCount}
          criticalCount={criticalCount}
          onRefresh={refreshAlerts}
        />

        <NotificationFilterTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">Cargando alertas...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm font-medium">
                {activeTab === 'pendientes' ? 'Todo al día' : 'Sin notificaciones'}
              </p>
              <p className="text-xs mt-1">
                {activeTab === 'pendientes' ? 'No hay alertas pendientes' : 'Las notificaciones aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredNotifications.map((n) => (
                <CompactAlertCard
                  key={n.id}
                  alert={mapToCard(n)}
                  onMarkRead={handleMarkAsRead}
                  onDismiss={handleRemove}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        <NotificationFooter
          connected={connected}
          totalCount={notifications.length}
          unreadCount={unreadCount}
          onMarkAllAsRead={markAllAsRead}
          onViewAll={() => { setOpen(false); navigate('/alerts'); }}
        />
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
