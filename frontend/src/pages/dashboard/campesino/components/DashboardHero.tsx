import { AlertTriangle, Clock, LayoutDashboard, Wifi, WifiOff } from 'lucide-react';
import { FincaHeroBanner } from '@/widgets/finca/hero';
import { Badge } from '@/shared/ui/badge';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { ModuleHeading } from '@/widgets/layout/ModuleHeading';

interface DashboardHeroProps {
  fincaName: string;
  isOnline: boolean;
  pendingCount: number;
}

function OfflineNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-warning-foreground">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
      <div className="text-sm leading-relaxed">
        <p className="font-bold">Modo sin conexión activo</p>
        <p className="text-muted-foreground mt-0.5">
          Puedes continuar registrando labores en campo. Los datos se guardarán de forma segura en este dispositivo y se sincronizarán al recuperar la conexión.
        </p>
      </div>
    </div>
  );
}

export function DashboardHero({ fincaName, isOnline, pendingCount }: DashboardHeroProps) {
  return (
    <header className="space-y-4" aria-labelledby="campesino-dashboard-title">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <ModuleHeading
          title={<span id="campesino-dashboard-title">Panel de Campesino</span>}
          description={<>Bienvenido al panel operativo. Gestiona la jornada y labores en <strong className="font-semibold text-foreground">{fincaName}</strong>.</>}
          icon={<LayoutDashboard className="h-5 w-5 text-white" />}
          titleClassName="text-xl sm:text-2xl"
        />

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge className={`${getStatusBadgeClass(isOnline ? 'success' : 'danger')} px-3 py-1.5 shadow-xs`}>
            {isOnline ? (
              <>
                <Wifi className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> En línea
              </>
            ) : (
              <>
                <WifiOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Sin conexión
              </>
            )}
          </Badge>

          {pendingCount > 0 && (
            <Badge className={`${getStatusBadgeClass('warning')} px-3 py-1.5 shadow-xs`}>
              <Clock className="mr-1.5 h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
              {pendingCount} pendiente(s) por subir
            </Badge>
          )}
        </div>
      </div>

      <FincaHeroBanner className="rounded-2xl" />
      {!isOnline && <OfflineNotice />}
    </header>
  );
}
