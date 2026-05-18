import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { RefreshCw } from 'lucide-react';
import { useT } from '@/shared/i18n';
import SystemTelemetryWidget from './SystemTelemetryWidget';

const SystemTab: React.FC = () => {
  const t = useT();

  return (
    <div className="space-y-6">
      {/* Telemetría real en tiempo real */}
      <SystemTelemetryWidget />

      {/* Rendimiento (datos estáticos — placeholder para futura integración) */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.system.performance.title')}</CardTitle>
          <CardDescription>{t('dashboard.system.performance.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: t('dashboard.system.performance.cpu'), value: 45, color: 'bg-blue-500' },
              { label: t('dashboard.system.performance.memory'), value: 62, color: 'bg-green-500' },
              { label: t('dashboard.system.performance.disk'), value: 75, color: 'bg-yellow-500' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">{value}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`${color} h-2 rounded-full`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemTab;
