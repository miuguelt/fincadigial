import React, { useState } from 'react';
import { Bell, CheckCircle, RefreshCw, Send, Inbox, Check, X, Clock } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/ui/cn';
import { useRealtimeNotifications } from '@/shared/hooks/useRealtimeNotifications';
import { useFarmRequests } from '@/shared/hooks/useFarmRequests';
import { useToast } from '@/app/providers/ToastContext';
import { formatLongDateColombia } from '@/shared/utils/dateUtils';

type MainTab = 'alertas' | 'accesos';
type AccesoTab = 'recibidas' | 'enviadas';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('alertas');
  const [accesoTab, setAccesoTab] = useState<AccesoTab>('recibidas');
  const { showToast } = useToast();

  const {
    notifications,
    unreadCount: unreadAlerts,
    loading: loadingAlerts,
    markAsRead,
    markAllAsRead,
    refreshAlerts,
  } = useRealtimeNotifications({});

  const {
    received,
    sent,
    loading: loadingRequests,
    respondToInvitation,
    pendingCount: unreadRequests
  } = useFarmRequests();

  const totalUnread = unreadAlerts + unreadRequests;

  const handleRespond = async (id: number, action: 'accept' | 'reject') => {
    const res = await respondToInvitation(id, action);
    if (res.success) {
      showToast(`Invitación ${action === 'accept' ? 'aceptada' : 'rechazada'}`, 'success');
    } else {
      showToast(res.message || 'Error', 'error');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-primary/10 transition-all">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {totalUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-white shadow-sm ring-2 ring-background animate-in zoom-in duration-300">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[450px] p-0 z-[1050] overflow-hidden rounded-[2rem] border-border/40 shadow-2xl backdrop-blur-2xl bg-card/95" align="end" sideOffset={8}>
        {/* Header Personalizado */}
        <div className="bg-primary/5 p-5 border-b border-border/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notificaciones
                </h3>
                <button
                    onClick={() => { refreshAlerts(); }}
                    className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-all active:rotate-180 duration-500"
                >
                    <RefreshCw className={cn("h-4 w-4", (loadingAlerts || loadingRequests) && "animate-spin")} />
                </button>
            </div>

            {/* Pestañas Principales */}
            <div className="flex p-1 bg-muted/50 rounded-2xl border border-border/20">
                <button
                    onClick={() => setMainTab('alertas')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all",
                        mainTab === 'alertas' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Alertas del Ganado
                    {unreadAlerts > 0 && <Badge variant="destructive" className="h-4 px-1 min-w-[1rem] text-[11px]">{unreadAlerts}</Badge>}
                </button>
                <button
                    onClick={() => setMainTab('accesos')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all",
                        mainTab === 'accesos' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Accesos
                    {unreadRequests > 0 && <Badge variant="destructive" className="h-4 px-1 min-w-[1rem] text-[11px]">{unreadRequests}</Badge>}
                </button>
            </div>
        </div>

        <ScrollArea className="h-[420px]">
          {mainTab === 'alertas' ? (
            <div className="p-3 space-y-2">
              {notifications.length === 0 ? (
                <EmptyNotifications icon={<CheckCircle size={48} />} title="Todo tranquilo" description="No hay novedades sanitarias en el ganado por ahora." />
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={cn("p-4 rounded-[1.5rem] border transition-all", n.read ? "bg-muted/10 border-transparent opacity-60" : "bg-background border-border/40 shadow-sm")}>
                    <div className="flex gap-3">
                       <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", n.priority === 'Crítica' ? "bg-destructive" : "bg-primary")} />
                       <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground leading-tight">{n.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                             <Clock size={10} /> {new Date(n.timestamp).toLocaleTimeString('es-CO')}
                          </p>
                       </div>
                       {!n.read && (
                         <button onClick={() => markAsRead(n.id)} className="p-1 hover:bg-primary/10 rounded-md text-primary">
                            <Check size={14} />
                         </button>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
                <div className="flex border-b border-border/10">
                    <button onClick={() => setAccesoTab('recibidas')} className={cn("flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all", accesoTab === 'recibidas' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>Recibidas</button>
                    <button onClick={() => setAccesoTab('enviadas')} className={cn("flex-1 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all", accesoTab === 'enviadas' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>Enviadas</button>
                </div>

                <div className="p-3 space-y-2">
                    {(accesoTab === 'recibidas' ? received : sent).length === 0 ? (
                        <EmptyNotifications
                            icon={accesoTab === 'recibidas' ? <Inbox size={48} /> : <Send size={48} />}
                            title={accesoTab === 'recibidas' ? "Bandeja vacía" : "Sin envíos"}
                            description={accesoTab === 'recibidas' ? "No tiene invitaciones de otras fincas pendientes." : "No ha solicitado entrar a ninguna finca todavía."}
                        />                    ) : (
                        (accesoTab === 'recibidas' ? received : sent).map((r) => (
                            <div key={r.id} className="p-4 rounded-[1.5rem] border border-border/40 bg-background shadow-sm hover:border-primary/30 transition-all">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black shadow-inner">
                                        {r.farm_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black uppercase tracking-tighter text-muted-foreground">{r.farm_name}</p>
                                        <p className="text-sm font-bold text-foreground fit-clamp">{r.type === 'INVITE' ? `De: ${r.user_name}` : 'Solicitud de unión'}</p>
                                        {r.message && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 italic italic-muted">"{r.message}"</p>}

                                        {accesoTab === 'recibidas' && r.status === 'pending' && (
                                            <div className="flex gap-2 mt-4">
                                                <Button size="sm" onClick={() => handleRespond(r.id, 'accept')} className="flex-1 rounded-xl h-8 bg-emerald-600 hover:bg-emerald-700 font-bold text-[11px]">
                                                    <Check size={14} className="mr-1" /> Aceptar
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleRespond(r.id, 'reject')} className="flex-1 rounded-xl h-8 text-rose-600 hover:bg-rose-50 font-bold text-[11px]">
                                                    <X size={14} className="mr-1" /> Rechazar
                                                </Button>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mt-3">
                                            <Badge variant="outline" className="text-[11px] font-black uppercase tracking-widest">{r.status}</Badge>
                                            <span className="text-[11px] text-muted-foreground font-medium">{formatLongDateColombia(r.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          )}
        </ScrollArea>

        {mainTab === 'alertas' && unreadAlerts > 0 && (
            <div className="p-4 border-t border-border/20 bg-muted/20">
                <button
                    onClick={() => markAllAsRead()}
                    className="w-full py-2.5 rounded-xl border border-primary/20 text-primary text-[11px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all"
                >
                    Marcar todas como leídas
                </button>
            </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

const EmptyNotifications: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-primary/20 mb-4">{icon}</div>
        <h4 className="font-bold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">{description}</p>
    </div>
);

export default NotificationCenter;
