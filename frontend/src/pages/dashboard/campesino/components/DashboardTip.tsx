import { Lightbulb } from 'lucide-react';
import type { DashboardTip as DashboardTipData } from '../config/dashboard.config';
import { Card, CardContent } from '@/shared/ui/card';

export function DashboardTip({ tip }: { tip: DashboardTipData | null }) {
  return (
    <Card className="border-border/70 bg-card shadow-2xs" premium hoverable={false}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-0.5">
              Recomendación Operativa
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
              {tip?.text || 'La aplicación permite registrar labores sin conexión a internet; la información se sincronizará automáticamente al recuperar la señal.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
