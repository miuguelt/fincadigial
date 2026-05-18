import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { RefreshCw, Cpu, HardDrive, Database, Wifi, WifiOff } from 'lucide-react';
import { apiFetch } from '@/shared/api/apiFetch';

interface SystemHealth {
  status: string;
  database: 'online' | 'offline';
  redis?: 'online' | 'offline';
  celery_workers?: number;
  version?: string;
  uptime_seconds?: number;
  environment?: string;
  self_healing?: {
    status: string;
    actions_taken: string[];
    timestamp: string;
  };
}

const formatUptime = (seconds?: number) => {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const StatusBadge = ({ status }: { status: 'online' | 'offline' | undefined }) => {
  if (!status) return <Badge variant="outline">—</Badge>;
  return status === 'online'
    ? <Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge>
    : <Badge variant="destructive">Offline</Badge>;
};

const SystemTelemetryWidget: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth & { resources?: { cpu: number, memory: number } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch({ url: '/health', method: 'GET' } as any);
      const data = res?.data ?? res;
      setHealth({
        status: data?.status ?? 'unknown',
        database: data?.database_status === 'connected' ? 'online' : 'offline',
        redis: data?.redis === 'ok' ? 'online' : (data?.redis === 'unavailable' ? 'offline' : undefined),
        celery_workers: data?.celery_workers,
        version: data?.version ?? '1.0.0',
        uptime_seconds: data?.uptime_seconds,
        environment: data?.environment ?? import.meta.env.MODE,
        resources: data?.system_resources
      });
    } catch {
      setHealth(prev => prev ?? {
        status: 'error',
        database: 'offline',
        redis: 'offline',
        environment: import.meta.env.MODE,
      });
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Auto-refresh cada 60 segundos
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';

  const getResourceColor = (percent: number) => {
    if (percent > 85) return 'text-red-500';
    if (percent > 70) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Estado del Sistema
              {isHealthy
                ? <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                : <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              }
            </CardTitle>
            <CardDescription>
              Monitoreo en tiempo real de la infraestructura
              {lastChecked && (
                <span className="ml-2 text-xs text-muted-foreground">
                  · Actualizado: {lastChecked.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* API */}
          <div className="space-y-1 p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wifi className="h-4 w-4" /> API
            </div>
            {isHealthy
              ? <Badge className="bg-green-500 text-white hover:bg-green-600">Online</Badge>
              : <Badge variant="destructive">Error</Badge>
            }
          </div>

          {/* Base de datos */}
          <div className="space-y-1 p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Database className="h-4 w-4" /> Base de Datos
            </div>
            <StatusBadge status={health?.database} />
          </div>

          {/* Redis */}
          <div className="space-y-1 p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HardDrive className="h-4 w-4" /> Redis
            </div>
            {health?.redis
              ? <StatusBadge status={health.redis} />
              : <Badge variant="outline" className="text-xs">Sin configurar</Badge>
            }
          </div>

          {/* Workers */}
          <div className="space-y-1 p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Cpu className="h-4 w-4" /> Workers
            </div>
            <Badge variant="outline">
              {health?.celery_workers !== undefined ? `${health.celery_workers} activos` : '—'}
            </Badge>
          </div>
        </div>

        {/* Resources Metrics */}
        {health?.resources && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-2 rounded border bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">CPU</span>
                <span className={`font-bold ${getResourceColor(health.resources.cpu)}`}>
                  {health.resources.cpu}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    health.resources.cpu > 85 ? 'bg-red-500' : (health.resources.cpu > 70 ? 'bg-orange-500' : 'bg-green-500')
                  }`}
                  style={{ width: `${health.resources.cpu}%` }}
                />
              </div>
            </div>
            <div className="p-2 rounded border bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">RAM</span>
                <span className={`font-bold ${getResourceColor(health.resources.memory)}`}>
                  {health.resources.memory}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    health.resources.memory > 85 ? 'bg-red-500' : (health.resources.memory > 70 ? 'bg-orange-500' : 'bg-green-500')
                  }`}
                  style={{ width: `${health.resources.memory}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center justify-between p-2 rounded border">
            <span className="text-muted-foreground">Versión</span>
            <Badge variant="outline">{health?.version ?? '—'}</Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded border">
            <span className="text-muted-foreground">Entorno</span>
            <Badge variant={health?.environment === 'development' ? 'default' : 'secondary'}>
              {health?.environment ?? '—'}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 rounded border">
            <span className="text-muted-foreground">Uptime</span>
            <span className="font-mono text-xs">{formatUptime(health?.uptime_seconds)}</span>
          </div>
        </div>

        {/* Self-Healing Activity */}
        {health?.self_healing && (
          <div className="mt-4 p-3 rounded-lg border bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                <RefreshCw className="h-3 w-3 animate-spin-slow" />
                Log de Autorreparación
              </h4>
              <Badge variant="outline" className="text-[10px] h-4 bg-white/50">
                Auto-Habilitado
              </Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Estado Último Ciclo:</span>
                <span className={`font-semibold ${health.self_healing.status === 'healthy' ? 'text-green-600' : 'text-orange-600'}`}>
                  {health.self_healing.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Acciones:</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {health.self_healing.actions_taken.length > 0 ? (
                    health.self_healing.actions_taken.map((action, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] py-0 h-4">
                        {action}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">Ninguna (Sistema estable)</span>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-right text-muted-foreground mt-1">
                Última verificación: {new Date(health.self_healing.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemTelemetryWidget;
