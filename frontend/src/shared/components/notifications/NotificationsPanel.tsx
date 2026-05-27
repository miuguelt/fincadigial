import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from '@/shared/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { NotificationsBell } from './NotificationsBell';
import { useNotifications, NotificationItem } from '@/shared/hooks/useNotifications';
import Icon from '@/shared/ui/Icon';
import { Button } from '@/shared/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'JOIN_REQUEST': return 'user-plus';
    case 'INVITATION_RECEIVED': return 'mail';
    case 'INVITATION_ACCEPTED': return 'circle-check';
    case 'INVITATION_REJECTED': return 'circle-x';
    case 'JOIN_APPROVED': return 'building-farm';
    default: return 'bell';
  }
};

export const NotificationsPanel: React.FC = () => {
  const { notifications, approve, reject, markAsRead, totalPending } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const pendingNotifs = notifications.filter(n => n.status === 'pending');
  const historyNotifs = notifications.filter(n => n.status !== 'pending');

  const renderCard = (notif: NotificationItem) => {
    const isPending = notif.status === 'pending';
    let text = '';
    
    switch (notif.type) {
      case 'JOIN_REQUEST': 
        text = `${notif.sender_name} quiere unirse a "${notif.finca_name}"`;
        break;
      case 'INVITATION_RECEIVED':
        text = `"${notif.finca_name}" te invita como ${notif.requested_role}`;
        break;
      case 'INVITATION_ACCEPTED':
        text = `${notif.sender_name} aceptó unirse a "${notif.finca_name}"`;
        break;
      case 'INVITATION_REJECTED':
        text = `${notif.sender_name} rechazó la invitación`;
        break;
      case 'JOIN_APPROVED':
        text = `Tu solicitud a "${notif.finca_name}" fue aprobada`;
        break;
      default:
        text = `Notificación de ${notif.finca_name}`;
    }

    return (
      <div key={notif.id} className="p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
            <Icon name={getNotificationIcon(notif.type)} size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-foreground capitalize">
                {notif.type.replace('_', ' ').toLowerCase()}
              </h4>
              {isPending && <span className="w-2 h-2 rounded-full bg-danger"></span>}
            </div>
            <p className="text-xs text-muted-foreground leading-snug mb-2">
              {text}
            </p>
            <div className="text-[10px] text-muted-foreground/70 font-medium mb-3">
              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: es })}
            </div>
            
            {isPending && (notif.type === 'JOIN_REQUEST' || notif.type === 'INVITATION_RECEIVED') && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => approve(notif.id)}
                  className="h-8 text-xs px-3 font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
                >
                  {notif.type === 'JOIN_REQUEST' ? 'Aprobar' : 'Aceptar'}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => reject(notif.id)}
                  className="h-8 text-xs px-3 font-bold text-danger hover:bg-danger/10 hover:text-danger rounded-md"
                >
                  Rechazar
                </Button>
              </div>
            )}

            {isPending && notif.type === 'JOIN_APPROVED' && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    markAsRead(notif.id);
                    setIsOpen(false);
                    navigate('/select-finca');
                  }}
                  className="h-8 text-xs px-3 font-bold bg-surface-raised border border-border rounded-md hover:bg-muted"
                >
                  Ir a la finca
                </Button>
              </div>
            )}
            
            {isPending && (notif.type === 'INVITATION_ACCEPTED' || notif.type === 'INVITATION_REJECTED') && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => markAsRead(notif.id)}
                  className="h-8 text-xs px-3 font-bold border border-border rounded-md"
                >
                  Marcar como leída
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationsBell />
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-[380px] p-0 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl z-[1050] overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <h3 className="font-black text-sm uppercase tracking-widest text-foreground flex items-center gap-2">
            <Icon name="bell" size={16} className="text-primary" />
            Notificaciones
          </h3>
          {totalPending > 0 && (
            <span className="text-[10px] bg-danger text-white px-2 py-0.5 rounded-full font-bold">
              {totalPending} nuevas
            </span>
          )}
        </div>
        
        <Tabs defaultValue="pendientes" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent h-12 p-0">
            <TabsTrigger 
              value="pendientes" 
              className="flex-1 h-full rounded-none data-[state=active]:bg-muted/30 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Pendientes ({pendingNotifs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="historial"
              className="flex-1 h-full rounded-none data-[state=active]:bg-muted/30 data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Historial
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pendientes" className="m-0 p-0 max-h-[400px] overflow-y-auto">
            {pendingNotifs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Icon name="bell-off" size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No hay notificaciones pendientes</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {pendingNotifs.map(renderCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="historial" className="m-0 p-0 max-h-[400px] overflow-y-auto">
            {historyNotifs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Icon name="history" size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">No hay historial reciente</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {historyNotifs.map(renderCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
