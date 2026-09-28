import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { AlertTriangle, Clock, Plus, RefreshCw } from 'lucide-react';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';

const MAX_VISIBLE_ALERTS = 5;

interface HeatAlert {
  animal_id: number;
  record: string;
  breed: string;
  days_since_last_heat: number;
  last_heat_date: string;
  priority: 'Alta' | 'Media' | 'Baja';
  age_days: number | null;
}

interface HeatAlertsWidgetProps {
  onRegisterHeat?: (animalId: number, record?: string) => void;
  onCreateEvent?: () => void;
}

export default function HeatAlertsWidget({ onRegisterHeat, onCreateEvent }: HeatAlertsWidgetProps) {
  const { goTo } = useRoleNavigation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<HeatAlert[]>([]);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await reproductionService.getHeatAlerts();
      setAlerts(response as HeatAlert[]);
      setShowAll(false);
    } catch (error) {
      console.error('Error loading heat alerts:', error);
      setError(true);
      showToast('Error al cargar alertas de celo', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleRegister = (alert: HeatAlert) => {
    if (onRegisterHeat) {
      onRegisterHeat(alert.animal_id, alert.record);
    } else {
      goTo('/admin/reproduction', { state: { preselectAnimal: alert.animal_id, eventType: 'Celo' } });
    }
  };

  if (loading) {
    return (
      <Card className="h-auto self-start">
        <CardHeader>
          <CardTitle className="text-lg">Alertas de Celo</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="space-y-2.5 animate-pulse"
            role="status"
            aria-label="Cargando alertas de celo"
          >
            <div className="h-12 rounded-lg bg-muted/60" />
            <div className="h-12 rounded-lg bg-muted/40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-auto self-start">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            Alertas de Celo
          </CardTitle>
          <CardDescription className="text-xs">
            Hembras en ventana de celo (18-23 días)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-semibold text-foreground">No fue posible cargar las alertas de celo</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Revisa la conexión y vuelve a intentarlo.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAlerts}
              aria-label="Reintentar carga de alertas"
              className="min-h-11 w-full gap-2 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleAlerts = showAll ? alerts : alerts.slice(0, MAX_VISIBLE_ALERTS);
  const remainingAlerts = Math.max(alerts.length - MAX_VISIBLE_ALERTS, 0);

  return (
    <>
      <Card className="h-auto self-start">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                Alertas de Celo
              </CardTitle>
              <CardDescription className="text-xs">
                Hembras en ventana de celo (18-23 días)
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={loadAlerts}
              aria-label="Actualizar alertas de celo"
              title="Actualizar alertas de celo"
              className="min-h-11 min-w-11"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div>
                <p className="font-semibold text-foreground">No hay alertas de celo activas</p>
                <p className="mt-1 text-xs">Puedes registrar una novedad si observaste un celo en campo.</p>
              </div>
              {onCreateEvent && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCreateEvent}
                  aria-label="Registrar novedad reproductiva"
                  className="min-h-11 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Registrar novedad
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAlerts.map((alert) => (
                <div
                  key={alert.animal_id}
                  className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge className={getAutoStatusClass(alert.priority)}>
                      {alert.priority}
                    </Badge>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedAnimalId(alert.animal_id)}
                        aria-label={`Ver ficha de ${alert.record}`}
                        className="block max-w-full cursor-pointer text-left text-sm font-bold text-foreground hover:text-primary hover:underline fit-clamp"
                      >
                        {alert.record}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {alert.breed} • {alert.age_days == null ? 'Edad no disponible' : `${Math.floor(alert.age_days / 365)} años`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:mr-2 sm:text-right">
                      <p className="text-xs text-muted-foreground">Días desde celo</p>
                      <p className="font-semibold text-sm">{alert.days_since_last_heat}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRegister(alert)}
                      aria-label={`Registrar celo para ${alert.record}`}
                      title={`Registrar celo para ${alert.record}`}
                      className="min-h-11 min-w-11 gap-1.5 px-3 font-bold text-xs"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Registrar</span>
                    </Button>
                  </div>
                </div>
              ))}
              {remainingAlerts > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 w-full"
                  onClick={() => setShowAll((current) => !current)}
                  aria-expanded={showAll}
                >
                  {showAll ? 'Mostrar solo 5 alertas' : `Mostrar ${remainingAlerts} alertas más`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </>
  );
}
