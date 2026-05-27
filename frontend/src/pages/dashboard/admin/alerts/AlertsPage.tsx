import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, CheckCheck, CheckCircle, Bell, Zap } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { alertService, Alert, AlertStats, EvaluateResult } from '@/entities/alert/api/alert.service';
import { AlertNotificationCard } from '@/shared/components/notifications/components/AlertNotificationCard';
import { AlertStatsCards } from '@/widgets/alerts/AlertStatsCards';
import { AlertFilterBar, type PriorityFilter, type TypeFilter, type ReadFilter } from '@/widgets/alerts/AlertFilterBar';
import { useToast } from '@/app/providers/ToastContext';

export function AlertsPage() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todas');
  const [readFilter, setReadFilter] = useState<ReadFilter>('no_leidas');
  const [evaluating, setEvaluating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsData, statsData] = await Promise.all([
        alertService.getAlerts({ limit: 200 }),
        alertService.getAlertStats(),
      ]);
      setAlerts(alertsData);
      setStats(statsData);
    } catch (error) {
      console.error('[Alerts] Error loading data:', error);
      showToast('Error cargando alertas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const result: EvaluateResult = await alertService.evaluateAlerts();
      showToast(`Evaluación completada: ${result.triggered} nuevas alertas`, 'success');
      await loadData();
    } catch (error) {
      console.error('[Alerts] Error evaluating:', error);
      showToast('Error evaluando alertas', 'error');
    } finally {
      setEvaluating(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await alertService.markAsRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch {
      showToast('Error marcando alerta', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertService.markAllAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      showToast('Todas las alertas marcadas como leídas', 'success');
    } catch {
      showToast('Error marcando todas', 'error');
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (searchQuery && !alert.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (priorityFilter !== 'todas' && alert.priority !== priorityFilter) return false;
      if (typeFilter !== 'todas' && alert.alert_type !== typeFilter) return false;
      if (readFilter === 'no_leidas' && alert.is_read) return false;
      if (readFilter === 'leidas' && !alert.is_read) return false;
      return true;
    });
  }, [alerts, searchQuery, priorityFilter, typeFilter, readFilter]);

  const sortedAlerts = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      const priorityOrder: Record<string, number> = { Crítica: 0, Alta: 1, Media: 2, Baja: 3 };
      const pA = priorityOrder[a.priority] ?? 4;
      const pB = priorityOrder[b.priority] ?? 4;
      if (pA !== pB) return pA - pB;
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      return new Date(b.triggered_at || 0).getTime() - new Date(a.triggered_at || 0).getTime();
    });
  }, [filteredAlerts]);

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.priority === 'Crítica' && !a.is_read).length;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2.5 rounded-xl shadow-sm shrink-0 mt-0.5',
            criticalCount > 0
              ? 'bg-gradient-to-br from-red-500 to-rose-600'
              : unreadCount > 0
                ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                : 'bg-gradient-to-br from-primary to-green-600'
          )}>
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Centro de Alertas</h1>
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive dark:bg-red-950/60 dark:text-red-300 border border-destructive/30 dark:border-red-800 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Monitoreo inteligente del hato ganadero
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEvaluate}
            disabled={evaluating}
            className="gap-2 rounded-xl"
          >
            {evaluating
              ? <RefreshCw className="h-4 w-4 animate-spin" />
              : <Zap className="h-4 w-4" />
            }
            Evaluar Ahora
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="gap-2 rounded-xl"
            >
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Marcar todas leídas</span>
              <span className="sm:hidden">Todas leídas</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────*/}
      <AlertStatsCards
        stats={stats}
        total={alerts.length}
        unreadCount={unreadCount}
        criticalCount={criticalCount}
      />

      {/* ── Filtros ────────────────────────────────────────────────────────*/}
      <AlertFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        readFilter={readFilter}
        onReadChange={setReadFilter}
      />

      {/* ── Lista de alertas ───────────────────────────────────────────────*/}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              {readFilter === 'no_leidas' ? 'Pendientes' : readFilter === 'leidas' ? 'Leídas' : 'Todas las alertas'}
            </h2>
            <span className={cn(
              'inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-bold',
              sortedAlerts.length > 0
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            )}>
              {sortedAlerts.length}
            </span>
          </div>
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Actualizando…
            </span>
          )}
        </div>

        {/* Estado: cargando */}
        {loading && alerts.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-card/60 flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-base font-semibold">Cargando alertas…</p>
              <p className="text-sm text-muted-foreground mt-1">Evaluando reglas del hato ganadero</p>
            </div>
          </div>
        ) : sortedAlerts.length === 0 ? (
          /* Estado: sin resultados */
          <div className="rounded-lg border border-border/40 bg-card/60 flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="p-4 rounded-full bg-success/10 dark:bg-green-950/40">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="text-base font-semibold">
                {readFilter === 'no_leidas' ? '¡Todo al día!' : 'Sin resultados'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {readFilter === 'no_leidas'
                  ? 'No hay alertas pendientes de revisión'
                  : 'No hay alertas que coincidan con los filtros activos'}
              </p>
            </div>
            {readFilter === 'no_leidas' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl mt-2"
                onClick={handleEvaluate}
                disabled={evaluating}
              >
                <Zap className={cn('h-4 w-4', evaluating && 'animate-pulse')} />
                Evaluar alertas del hato
              </Button>
            )}
          </div>
        ) : (
          /* Lista */
          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1 overscroll-contain scroll-smooth">
            {sortedAlerts.map((alert, idx) => (
              <div
                key={alert.id ?? `alert-${alert.triggered_at}-${idx}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
              >
                <AlertNotificationCard
                  alert={{
                    id: alert.id ?? 0,
                    type: alert.alert_type,
                    priority: alert.priority,
                    message: alert.message,
                    recommendation: alert.recommendation,
                    triggered_at: alert.triggered_at,
                    is_read: alert.is_read,
                  }}
                  onMarkRead={(id) => handleMarkAsRead(Number(id))}
                  onDismiss={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPage;
