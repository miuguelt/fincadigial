import React, { useState, useEffect, useCallback } from 'react';
import {
  IconSprout,
  IconDroplet,
  IconPaw,
  IconRefresh,
  IconScan,
  IconMilk,
  IconSwitchHorizontal,
  IconCalendar,
  IconChevronRight,
  IconCirclePlus,
  IconHistory,
  IconActivity,
  IconUser,
  IconShieldCheck,
  IconStethoscope,
  IconCalculator,
  IconAlertTriangle,
  IconPackage
} from '@/shared/ui/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { medicalService, UpcomingEventsResponse } from '@/entities/animal/api/medical.service';
import { inventoryAnalyticsService, InventoryAutonomy } from '@/entities/inventory/api/inventory-analytics.service';
import { cn } from '@/shared/ui/cn';

const PeasantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<UpcomingEventsResponse | null>(null);
  const [autonomy, setAutonomy] = useState<InventoryAutonomy[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [upcoming, invAutonomy] = await Promise.all([
        medicalService.getUpcomingEvents(15),
        inventoryAnalyticsService.getAutonomy()
      ]);
      setEvents(upcoming);
      setAutonomy(invAutonomy);
    } catch (error) {
      console.error('Error cargando agenda rural:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadData]);

  const quickActions = [
    { 
      id: 'milk', 
      label: 'Registrar Leche', 
      icon: <IconMilk size="lg" />, 
      color: 'bg-info-600 dark:bg-info-700', 
      path: '/operario/quick/milk' 
    },
    { 
      id: 'ration', 
      label: 'Calcular Ración', 
      icon: <IconCalculator size="lg" />, 
      color: 'bg-success-600 dark:bg-success-700', 
      path: '/operario/ration-calculator' 
    },
    { 
      id: 'transfer', 
      label: 'Mover Ganado', 
      icon: <IconSwitchHorizontal size="lg" />, 
      color: 'bg-warning-600 dark:bg-warning-700', 
      path: '/operario/quick/transfer' 
    },
    { 
      id: 'emergency', 
      label: 'Botiquín SOS', 
      icon: <IconAlertTriangle size="lg" />, 
      color: 'bg-danger-600 dark:bg-danger-700', 
      path: '/operario/emergency-kit' 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans pb-32">
      {/* Header Compacto de Campo */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-border/40 p-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[var(--shadow-token-md)] shadow-primary/20">
              <IconUser size="md" className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter">Mi Finca Rural</h1>
              <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-[var(--radius-full)] animate-pulse", isOnline ? "bg-success-500" : "bg-warning-500")} />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                  {isOnline ? 'Sincronizado' : 'Modo Sin Señal'}
                </span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={loadData} className="rounded-[var(--radius-full)] h-10 w-10">
            <IconRefresh size="md" className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-8 mt-2">
        
        {/* PANEL DE ACCIONES RÁPIDAS (BOTONES GIGANTES) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">¿Qué vas a hacer ahora?</h2>
            <Badge variant="outline" className="text-[8px] border-primary/20 text-primary bg-primary/5">MODO CAMPO</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.05, translateY: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(action.path)}
                className="group relative flex flex-col items-center justify-center gap-4 h-40 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm transition-all overflow-hidden"
              >
                <div className={cn("h-16 w-16 rounded-[var(--radius-lg)] flex items-center justify-center text-white shadow-[var(--shadow-token-lg)] transition-transform group-hover:rotate-6", action.color)}>
                  {action.icon}
                </div>
                <span className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">{action.label}</span>
                <div className="absolute top-2 right-4 text-[8px] font-black text-slate-300 uppercase opacity-20">Villa Luz</div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* AGENDA INTELIGENTE (PENDIENTES DE HOY) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-500">
            <IconCalendar size="sm" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em]">Prioridades de Hoy</h2>
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-[var(--shadow-token-lg)] shadow-slate-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-0">
              <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Resumen Semanal</p>
                  <h3 className="text-xl font-black tracking-tight">{events?.summary.total || 0} Pendientes</h3>
                </div>
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="h-8 w-8 rounded-[var(--radius-full)] border-2 border-slate-900 bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                        <IconActivity size="sm" className="text-emerald-400" />
                     </div>
                   ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="p-10 text-center space-y-4">
                    <IconRefresh size="lg" className="animate-spin mx-auto text-emerald-500 opacity-20" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultando registros...</p>
                  </div>
                ) : (
                  <>
                    {/* Eventos Críticos (Rojos) */}
                    {events?.births.map((e, idx) => (
                      <PriorityItem 
                        key={`birth-${idx}`}
                        title={e.title}
                        subtitle={`Animal ${e.record} • Faltan ${e.days_remaining} días`}
                        icon={<IconSprout size="sm" />}
                        status={e.days_remaining <= 7 ? 'critical' : 'warning'}
                      />
                    ))}
                    
                    {events?.vaccinations.map((e, idx) => (
                      <PriorityItem 
                        key={`vacc-${idx}`}
                        title={e.title}
                        subtitle={`Animal ${e.record} • ${e.days_remaining <= 0 ? '¡Vencida!' : `En ${e.days_remaining} días`}`}
                        icon={<IconStethoscope size="sm" />}
                        status={e.days_remaining <= 3 ? 'critical' : 'warning'}
                      />
                    ))}

                    {(!events || events.summary.total === 0) && (
                      <div className="p-12 text-center space-y-3">
                        <div className="h-12 w-12 rounded-[var(--radius-full)] bg-emerald-50 mx-auto flex items-center justify-center text-emerald-500">
                          <IconShieldCheck size="lg" />
                        </div>
                        <p className="text-xs font-bold text-slate-500">¡Todo al día! No hay tareas urgentes registradas.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ACCESO A MAPA Y BIBLIOTECA */}
        <div className="grid grid-cols-2 gap-4">
           {/* ... (anterior) */}
        </div>

        {/* AUTONOMÍA DE INVENTARIO (NUEVO WIDGET) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1 text-slate-500">
            <IconPackage size={16} />
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em]">Autonomía de Insumos</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {autonomy.length > 0 ? autonomy.map((item, idx) => (
               <div 
                key={idx} 
                className={cn(
                  "p-5 rounded-[2rem] border transition-all flex flex-col justify-between h-32",
                  item.status === 'critical' ? "bg-rose-50 border-rose-100" : 
                  item.status === 'warning' ? "bg-amber-50 border-amber-100" : "bg-white border-slate-100 dark:bg-slate-900"
                )}
               >
                 <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate pr-2">{item.product}</p>
                    <Badge variant="outline" className="text-[7px] border-slate-200">{item.unit}</Badge>
                 </div>
                 
                 <div className="mt-2">
                    <p className={cn(
                      "text-2xl font-black tracking-tighter",
                      item.status === 'critical' ? "text-rose-600" : "text-slate-900 dark:text-white"
                    )}>
                      {item.days_left ?? '∞'} <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">días</span>
                    </p>
                    <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-[var(--radius-full)] mt-2 overflow-hidden">
                       <div 
                        className={cn("h-full", item.status === 'critical' ? "bg-danger-500" : "bg-success-500")}
                        style={{ width: `${Math.min((item.days_left || 0) * 5, 100)}%` }}
                       />
                    </div>
                 </div>
               </div>
             )) : (
               <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed">
                  <p className="text-xs font-bold text-slate-400">Sin datos de consumo registrados.</p>
               </div>
             )}
          </div>
        </section>

      </main>

      {/* FOOTER NAVEGACIÓN RURAL */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-t border-border/40 z-50">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <NavBtn icon={<IconPaw size={22} />} active />
          <NavBtn icon={<IconDroplet size={22} />} onClick={() => navigate('/operario/water')} />
          
          {/* Botón Central de Scan Flotante */}
          <div className="relative -top-8">
            <button 
              onClick={() => navigate('/scanner')}
              className="h-20 w-20 rounded-[var(--radius-full)] bg-slate-900 text-white flex items-center justify-center shadow-[var(--shadow-token-lg)] shadow-slate-900/50 ring-8 ring-slate-50 dark:ring-slate-950 active:scale-90 transition-all"
            >
              <IconScan size={32} />
            </button>
          </div>

          <NavBtn icon={<IconCirclePlus size={22} />} onClick={() => navigate('/quick/control')} />
          <NavBtn icon={<IconHistory size={22} />} onClick={() => navigate('/operario/activity-log')} />
        </div>
      </nav>
    </div>
  );
};

const PriorityItem = ({ title, subtitle, icon, status }: { title: string, subtitle: string, icon: React.ReactNode, status: 'critical' | 'warning' }) => (
  <div className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
    <div className={cn(
      "h-11 w-11 rounded-[var(--radius-lg)] flex items-center justify-center border transition-all",
      status === 'critical' ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-amber-50 border-amber-100 text-amber-600"
    )}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">{title}</h4>
      <p className="text-[10px] font-bold text-slate-500 truncate">{subtitle}</p>
    </div>
    <IconChevronRight size="sm" className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
  </div>
);

const NavBtn = ({ icon, active = false, onClick }: { icon: React.ReactNode, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] transition-all",
      active ? "text-emerald-600" : "text-slate-400 hover:text-emerald-600"
    )}
  >
    {icon}
  </button>
);

export default PeasantDashboard;
