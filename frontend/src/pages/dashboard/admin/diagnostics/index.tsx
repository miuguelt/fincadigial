import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, HardDrive, RefreshCw, ServerCog, Workflow } from 'lucide-react';
import { apiFetch } from '@/shared/api/apiFetch';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

interface HealthCheck {
  status?: string;
  response_time_ms?: number;
  workers_active?: number;
  error?: string;
}

interface HealthReport {
  status: string;
  timestamp?: string;
  response_time_ms?: number;
  checks?: Record<string, HealthCheck>;
  summary?: {
    failed_checks?: string[];
    warning_checks?: string[];
    total_checks?: number;
  };
}

const CHECKS = [
  { key: 'database', label: 'Base de datos', icon: Database },
  { key: 'cache', label: 'Caché', icon: HardDrive },
  { key: 'celery', label: 'Procesamiento asíncrono', icon: Workflow },
  { key: 'system_resources', label: 'Recursos del servidor', icon: ServerCog },
  { key: 'api_endpoints', label: 'Rutas críticas de API', icon: Activity },
] as const;

const statusLabel = (status?: string) => {
  if (status === 'healthy') return 'Saludable';
  if (status === 'warning' || status === 'degraded') return 'Con advertencias';
  if (status === 'disabled') return 'Deshabilitado';
  if (status === 'unhealthy') return 'Con fallos';
  return 'Sin información';
};

const statusVariant = (status?: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
  if (status === 'healthy') return 'success';
  if (status === 'warning' || status === 'degraded') return 'warning';
  if (status === 'unhealthy') return 'destructive';
  return 'secondary';
};

export default function DiagnosticsPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch({ url: '/health/detailed', method: 'GET' });
      const payload = response?.data?.data ?? response?.data ?? response;
      setReport(payload as HealthReport);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible consultar el estado del sistema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagnóstico del Sistema</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado en vivo de los servicios que sostienen la aplicación.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadHealth()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Comprobando…' : 'Actualizar'}
        </Button>
      </header>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p role="alert" className="text-sm text-destructive">{error}</p>
            <Button type="button" size="sm" onClick={() => void loadHealth()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <Summary label="Estado general" value={loading && !report ? 'Comprobando…' : statusLabel(report?.status)} />
          <Summary label="Comprobaciones" value={report?.summary?.total_checks ?? '—'} />
          <Summary label="Tiempo de respuesta" value={report?.response_time_ms == null ? '—' : `${report.response_time_ms} ms`} />
        </CardContent>
      </Card>

      <section aria-label="Comprobaciones de salud" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHECKS.map(({ key, label, icon: Icon }) => {
          const check = report?.checks?.[key];
          return (
            <Card key={key}>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
                <Badge variant={statusVariant(check?.status)}>{loading && !report ? 'Consultando' : statusLabel(check?.status)}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {check?.response_time_ms != null && <p>Respuesta: {check.response_time_ms} ms</p>}
                {key === 'celery' && check?.workers_active != null && <p>Workers activos: {check.workers_active}</p>}
                {check?.error && <p className="break-words text-destructive">{check.error}</p>}
                {!loading && !check && <p>El servidor no entregó datos para esta comprobación.</p>}
              </CardContent>
            </Card>
          );
        })}
      </section>

      {report?.timestamp && (
        <p className="text-right text-xs text-muted-foreground">
          Última comprobación: {new Date(report.timestamp).toLocaleString('es-CO')}
        </p>
      )}
    </div>
  );
}

const Summary = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
  </div>
);
