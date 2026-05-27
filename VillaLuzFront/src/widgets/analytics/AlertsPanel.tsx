import { useState } from 'react';
import { Filter, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import AlertCard from './AlertCard';

const priorityConfig = [
  { value: 'all', label: 'Todas', icon: Filter, color: 'text-muted-foreground', bg: 'bg-muted dark:bg-card' },
  { value: 'Crítica', label: 'Críticas', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10 dark:bg-red-900/30' },
  { value: 'Alta', label: 'Altas', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { value: 'Media', label: 'Medias', icon: Info, color: 'text-warning', bg: 'bg-warning/10 dark:bg-amber-900/30' },
  { value: 'Baja', label: 'Bajas', icon: CheckCircle, color: 'text-info', bg: 'bg-info/10 dark:bg-blue-900/30' },
];

const AlertsPanel = () => {
  const [priority, setPriority] = useState<string>('all');
  const { useAlerts } = useAnalytics();

  const params = priority !== 'all' ? { priority, limit: 50 } : { limit: 50 };
  const { data, isLoading, refetch, isFetching } = useAlerts(params);

  const handleAction = (alert: any) => {
    switch (alert.type) {
      case 'vaccination_overdue':
      case 'health_checkup_overdue':
      case 'field_overloaded':
      default:
        break;
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">Sistema de Alertas</h2>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground flex items-center space-x-2"
          >
            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {priorityConfig.map((p) => {
            const Icon = p.icon;
            const isActive = priority === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-1.5',
                  isActive ? cn(p.bg, p.color) : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : data?.alerts && data.alerts.length > 0 ? (
          <>
            {data.statistics && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { key: 'Crítica', color: 'text-destructive', bg: 'bg-destructive/5 dark:bg-red-950/20', border: 'border-destructive/30 dark:border-red-800' },
                  { key: 'Alta', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800' },
                  { key: 'Media', color: 'text-warning', bg: 'bg-warning/5 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800' },
                  { key: 'Baja', color: 'text-info', bg: 'bg-info/5 dark:bg-blue-950/20', border: 'border-info/30 dark:border-blue-800' },
                ].map((cfg) => {
                  const key = cfg.key.toLowerCase();
                  const count = data.statistics.by_priority?.[key] ?? 0;
                  return (
                    <div
                      key={cfg.key}
                      onClick={() => setPriority(cfg.key)}
                      className={cn('text-center p-3 rounded-lg cursor-pointer transition-colors border', cfg.bg, cfg.border)}
                    >
                      <p className={cn('text-2xl font-bold', cfg.color)}>{count}</p>
                      <p className={cn('text-xs font-medium', cfg.color)}>{cfg.key}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-4">
              {data.alerts.map((alert: any, index: number) => (
                <AlertCard key={alert.id || index} alert={alert} onAction={handleAction} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">No hay alertas en este momento</p>
            {priority !== 'all' && (
              <button
                onClick={() => setPriority('all')}
                className="mt-4 text-primary hover:text-primary/80 text-sm font-medium"
              >
                Ver todas las alertas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
