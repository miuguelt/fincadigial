import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { cn } from '@/shared/ui/cn';

interface MilkQualityAlert {
  id: string;
  animal_record: string;
  type: 'mastitis' | 'low_production' | 'high_somatic' | 'quality';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  value?: number;
  threshold?: number;
  date: string;
}

interface MilkQualityAlertsProps {
  alerts: MilkQualityAlert[];
  isLoading?: boolean;
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
  },
};

const typeLabels = {
  mastitis: 'Posible Mastitis',
  low_production: 'Baja Producción',
  high_somatic: 'Células Somáticas Altas',
  quality: 'Alerta de Calidad',
};

export function MilkQualityAlerts({ alerts, isLoading = false }: MilkQualityAlertsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alertas de Calidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                <div className="h-8 w-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Alertas de Calidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 text-green-600 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Sin alertas de calidad</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Alertas de Calidad</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', config.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{alert.animal_record}</span>
                    <Badge className={cn('text-xs', config.badge)}>
                      {typeLabels[alert.type]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  {alert.value && alert.threshold && (
                    <p className="text-xs text-gray-500 mt-1">
                      Valor: {alert.value} | Umbral: {alert.threshold}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(alert.date).toLocaleDateString('es-CO')}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
