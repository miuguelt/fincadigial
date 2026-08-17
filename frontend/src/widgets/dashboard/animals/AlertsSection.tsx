import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, BellRing, Check, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useCallback } from 'react';
import { cn } from '@/shared/ui/cn';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { alertService, Alert } from '@/entities/alert/api/alert.service';

interface AlertsSectionProps {
  animalId: number;
  healthAlerts?: string[];
}

const priorityConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  Crítica: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/5 dark:bg-red-950/30', border: 'border-destructive/30 dark:border-red-800' },
  Alta: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800' },
  Media: { icon: BellRing, color: 'text-warning', bg: 'bg-warning/5 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
  Baja: { icon: Info, color: 'text-info', bg: 'bg-info/5 dark:bg-blue-950/30', border: 'border-info/30 dark:border-blue-800' },
};

function getPriorityConfig(priority: string) {
  const key = Object.keys(priorityConfig).find(
    k => k.toLowerCase() === priority.toLowerCase()
  );
  return priorityConfig[key || 'Media'] || priorityConfig.Media;
}

export function AlertsSection({ animalId, healthAlerts = [] }: AlertsSectionProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertService.getAlerts({ animal_id: animalId } as any);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('No se pudieron cargar las alertas');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    if (animalId) fetchAlerts();
  }, [animalId, fetchAlerts]);

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await alertService.markAsRead(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch {
      //
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertService.markAllAsRead();
      setAlerts([]);
    } catch {
      //
    }
  };

  const healthMappedAlerts: Alert[] = healthAlerts.map((msg, idx) => ({
    id: -(idx + 1),
    alert_type: 'Salud / Crecimiento',
    message: msg,
    priority: 'Media',
    is_read: false
  }));

  const uniqueAlertsMap = new Map<string, Alert>();
  const fallbackAlerts: Alert[] = [];

  alerts.forEach(a => {
    if (a.message) {
      const key = a.message.trim().toLowerCase();
      if (!uniqueAlertsMap.has(key)) {
        uniqueAlertsMap.set(key, a);
      }
    } else {
      fallbackAlerts.push(a);
    }
  });

  healthMappedAlerts.forEach(a => {
    if (a.message) {
      const key = a.message.trim().toLowerCase();
      if (!uniqueAlertsMap.has(key)) {
        uniqueAlertsMap.set(key, a);
      }
    } else {
      fallbackAlerts.push(a);
    }
  });

  const combinedAlerts = [...Array.from(uniqueAlertsMap.values()), ...fallbackAlerts];

  const priorityWeight: Record<string, number> = {
    'crítica': 4,
    'alta': 3,
    'media': 2,
    'baja': 1
  };

  const sortedAlerts = [...combinedAlerts].sort((a, b) => {
    const weightA = priorityWeight[a.priority.toLowerCase()] || 0;
    const weightB = priorityWeight[b.priority.toLowerCase()] || 0;
    return weightB - weightA;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-xs text-muted-foreground text-center py-3 italic opacity-60">
        {error}
      </div>
    );
  }

  if (sortedAlerts.length === 0) return null;

  const highestPriority = sortedAlerts[0]?.priority || 'Media';
  const highestCfg = getPriorityConfig(highestPriority);
  const hasMoreThanThree = sortedAlerts.length > 3;
  const displayedAlerts = hasMoreThanThree && !isExpanded
    ? sortedAlerts.slice(0, 3)
    : sortedAlerts;

  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/40">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
            highestCfg.bg,
            highestCfg.border,
            highestCfg.color
          )}>
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Alertas del animal
              </h3>
              <Badge variant="outline" className={cn("h-5 px-2 text-[11px] font-bold", highestCfg.color, highestCfg.border)}>
                {sortedAlerts.length}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Prioridad mayor: {highestPriority}
            </p>
          </div>
        </div>
        {alerts.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="h-8 justify-start text-xs gap-1.5 text-muted-foreground hover:text-foreground sm:justify-center"
          >
            <Check className="h-3.5 w-3.5" />
            Marcar leídas
          </Button>
        )}
      </div>
      <div
        className={cn(
          "grid gap-2 p-3 transition-all duration-200 md:grid-cols-2 xl:grid-cols-3",
          isExpanded && "max-h-72 overflow-y-auto"
        )}
      >
        {displayedAlerts.map((alert) => {
          const cfg = getPriorityConfig(alert.priority);
          const Icon = cfg.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "group flex min-w-0 items-start gap-2.5 rounded-lg border p-3 text-xs transition-all hover:shadow-sm",
                cfg.bg,
                cfg.border
              )}
            >
              <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground fit-clamp">{alert.alert_type}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] h-4 px-1.5 font-bold",
                      cfg.color,
                      cfg.border
                    )}
                >
                  {alert.priority}
                </Badge>
                </div>
                <p className="text-foreground/80 mt-1 leading-relaxed line-clamp-3">{alert.message}</p>
                {alert.recommendation && (
                  <p className="text-muted-foreground italic mt-1 text-[11px] line-clamp-2">
                    {alert.recommendation}
                  </p>
                )}
              </div>
              {alert.id !== undefined && alert.id > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alert.id && handleMarkAsRead(alert.id)}
                  className="h-6 w-6 p-0 shrink-0 opacity-40 transition-opacity hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Marcar como leída"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {hasMoreThanThree && (
        <div className="flex justify-center border-t border-border/40 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Colapsar alertas
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Ver {sortedAlerts.length - 3} alertas más
              </>
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
