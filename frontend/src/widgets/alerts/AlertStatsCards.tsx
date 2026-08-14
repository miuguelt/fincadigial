import { BarChart3, AlertCircle, AlertTriangle, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { AlertStats } from '@/entities/alert/api/alert.service';

interface AlertStatsCardsProps {
  stats: AlertStats | null;
  /** Total real del servidor (meta.pagination.total_items), no el largo de la página. */
  total?: number;
  unreadCount: number;
  criticalCount: number;
}

export function AlertStatsCards({ stats, total = 0, unreadCount, criticalCount }: AlertStatsCardsProps) {
  // Todas las métricas salen de la misma fuente. Mezclar el total del servidor con
  // conteos locales sobre una página truncada producía porcentajes negativos.
  const totalAlerts = stats?.total ?? total;
  const unread = stats ? stats.unread : unreadCount;
  const critical = stats ? stats.criticalUnread : criticalCount;
  const typeCount = Object.keys(stats?.by_type || {}).length;
  const readRate = totalAlerts > 0
    ? Math.min(100, Math.max(0, Math.round(((totalAlerts - unread) / totalAlerts) * 100)))
    : 100;

  const cards = [
    {
      key: 'total',
      label: 'Total Alertas',
      value: totalAlerts,
      icon: BarChart3,
      gradient: 'from-blue-500/10 to-indigo-500/10',
      borderGlow: 'border-info/30/80 dark:border-blue-800/60',
      iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      textColor: 'text-info dark:text-blue-300',
      badge: null,
    },
    {
      key: 'unread',
      label: 'Sin Leer',
      value: unread,
      icon: AlertCircle,
      gradient: unread > 0 ? 'from-amber-500/15 to-orange-500/10' : 'from-green-500/10 to-emerald-500/10',
      borderGlow: unread > 0 ? 'border-amber-200/80 dark:border-amber-800/60' : 'border-success/30/80 dark:border-green-800/60',
      iconBg: unread > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-green-500 to-emerald-600',
      textColor: unread > 0 ? 'text-warning dark:text-amber-300' : 'text-success dark:text-green-300',
      badge: unread > 0 ? { label: `${readRate}% leídas`, up: false } : { label: 'Al día ✓', up: true },
    },
    {
      key: 'critical',
      label: 'Críticas',
      value: critical,
      icon: AlertTriangle,
      gradient: critical > 0 ? 'from-red-500/15 to-rose-500/10' : 'from-slate-500/10 to-gray-500/10',
      borderGlow: critical > 0 ? 'border-red-300/80 dark:border-red-800/60' : 'border-border/80 dark:border-border/60',
      iconBg: critical > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-slate-400 to-slate-500',
      textColor: critical > 0 ? 'text-destructive dark:text-red-300' : 'text-muted-foreground dark:text-muted-foreground',
      badge: critical > 0 ? { label: 'Requiere atención', up: false } : null,
      pulse: critical > 0,
    },
    {
      key: 'types',
      label: 'Tipos activos',
      value: typeCount,
      icon: Filter,
      gradient: 'from-violet-500/10 to-purple-500/10',
      borderGlow: 'border-violet-200/80 dark:border-violet-800/60',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
      textColor: 'text-violet-700 dark:text-violet-300',
      badge: null,
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.key}
          style={{ animationDelay: `${i * 60}ms` }}
          className={cn(
            'relative overflow-hidden rounded-lg border p-4',
            'bg-gradient-to-br', card.gradient,
            card.borderGlow,
            'shadow-sm hover:shadow-md transition-all duration-300',
            'hover:-translate-y-0.5',
            'animate-fade-in-up'
          )}
        >
          {/* Fondo decorativo */}
          <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-current pointer-events-none" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider leading-none">
                {card.label}
              </p>
              <div className="flex items-end gap-2">
                <span className={cn('text-3xl font-bold tabular-nums leading-none', card.textColor)}>
                  {card.value}
                </span>
                {'pulse' in card && card.pulse && card.value > 0 && (
                  <span className="flex h-2 w-2 mb-1">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-destructive/80 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                  </span>
                )}
              </div>
              {card.badge && (
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit',
                  card.badge.up
                    ? 'bg-success/10 text-success dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-warning/10 text-warning dark:bg-amber-900/40 dark:text-amber-300'
                )}>
                  {card.badge.up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {card.badge.label}
                </span>
              )}
            </div>
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm',
              card.iconBg
            )}>
              <card.icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AlertStatsCards;
