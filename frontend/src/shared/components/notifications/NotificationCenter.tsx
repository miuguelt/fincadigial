import { useState } from 'react';
import { 
  Bell, 
  Check, 
  Trash2, 
  X, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { useRealtimeNotifications, Notification } from '@/shared/hooks/useRealtimeNotifications';

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const typeColors = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
};

const typeBgColors = {
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
};

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useRealtimeNotifications({
    onNotification: (notification) => {
      // Mostrar toast para notificaciones importantes
      if (notification.type === 'error' || notification.type === 'warning') {
        // Aquí podrías integrar con use-toast
        console.log('Notificación importante:', notification);
      }
    },
  });

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeNotification(id);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.action?.url) {
      window.open(notification.action.url, '_blank');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
        >
          <Bell className="h-5 w-5" />
          
          {/* Indicador de conexión */}
          <span
            className={cn(
              "absolute top-1 right-1 w-2 h-2 rounded-full",
              connected ? "bg-green-500" : "bg-red-500"
            )}
          />
          
          {/* Badge de no leídas */}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0 z-[60]" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span className="font-semibold">Notificaciones</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} sin leer
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar leídas
              </Button>
            )}
            
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearAll}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Lista de notificaciones */}
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No hay notificaciones</p>
              <p className="text-xs">Las notificaciones aparecerán aquí</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type];
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-accent",
                      !notification.read && typeBgColors[notification.type],
                      !notification.read && "border-l-4",
                      !notification.read && typeColors[notification.type].replace('bg-', 'border-')
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        typeColors[notification.type]
                      )}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => handleRemove(notification.id, e)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        {/* Botón de acción */}
                        {notification.action && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(notification.action!.url, '_blank');
                              }}
                            >
                              {notification.action.label}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        )}

                        {/* Marcar como leída */}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar como leída
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {connected ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Conectado
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Desconectado
                </span>
              )}
            </span>
            <span>{notifications.length} notificaciones</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default NotificationCenter;
