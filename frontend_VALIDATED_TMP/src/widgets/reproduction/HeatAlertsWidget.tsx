import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { AlertTriangle, Clock, Calendar, Plus, RefreshCw } from 'lucide-react';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { useNavigate } from 'react-router-dom';

interface HeatAlert {
  animal_id: number;
  record: string;
  breed: string;
  days_since_last_heat: number;
  last_heat_date: string;
  priority: 'Alta' | 'Media' | 'Baja';
  age_days: number | null;
}

export default function HeatAlertsWidget() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<HeatAlert[]>([]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getHeatAlerts();
      setAlerts(response as HeatAlert[]);
    } catch (error) {
      console.error('Error loading heat alerts:', error);
      showToast('Error al cargar alertas de celo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleRegisterHeat = (animalId: number) => {
    navigate('/admin/reproduction', { state: { preselectAnimal: animalId, eventType: 'Celo' } });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Alta': return 'bg-red-500';
      case 'Media': return 'bg-yellow-500';
      case 'Baja': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityVariant = (priority: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (priority) {
      case 'Alta': return 'destructive';
      case 'Media': return 'default';
      case 'Baja': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alertas de Celo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertas de Celo
            </CardTitle>
            <CardDescription className="text-xs">
              Hembras en ventana de celo (18-23 días)
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={loadAlerts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay alertas de celo activas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.animal_id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Badge className={getPriorityColor(alert.priority)}>
                    {alert.priority}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{alert.record}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.breed} • {alert.age_days ? `${Math.floor(alert.age_days / 365)} años` : '---'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-2">
                    <p className="text-xs text-muted-foreground">Días desde celo</p>
                    <p className="font-semibold text-sm">{alert.days_since_last_heat}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRegisterHeat(alert.animal_id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {alerts.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate('/admin/reproduction')}
              >
                Ver {alerts.length - 5} más
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
