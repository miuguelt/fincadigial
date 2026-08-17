import { useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Layers,
  RefreshCw,
  ShieldCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import KPICard from '@/widgets/analytics/KPICard';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import type { UserWithProfile } from '../types';

interface GlobalUsersBentoHeaderProps {
  users: UserWithProfile[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const GlobalUsersBentoHeader = ({
  users,
  loading = false,
  onRefresh,
}: GlobalUsersBentoHeaderProps) => {
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => {
      return typeof u.status === 'boolean' ? u.status : u.status === '1' || u.status === 1;
    }).length;
    const inactive = total - active;

    const allFincaIds = new Set<number>();
    let multiFincaCount = 0;
    let withoutFincaCount = 0;

    users.forEach((u) => {
      const userFincas = Array.isArray(u.fincas) ? u.fincas : [];
      if (userFincas.length === 0 && !u.finca_id) {
        withoutFincaCount++;
      } else {
        if (userFincas.length > 1) {
          multiFincaCount++;
        }
        userFincas.forEach((f: any) => {
          const fid = f.id || f.finca_id;
          if (fid) allFincaIds.add(fid);
        });
        if (u.finca_id) allFincaIds.add(u.finca_id);
      }
    });

    return {
      total,
      active,
      inactive,
      totalFincas: allFincaIds.size,
      multiFincaCount,
      withoutFincaCount,
    };
  }, [users]);

  return (
    <DataScreenHeader
      icon={<ShieldCheck className="h-5 w-5 text-white" />}
      iconClassName="from-emerald-600 to-teal-700 shadow-emerald-500/20"
      title={<>Usuarios de <span className="text-emerald-600 dark:text-emerald-400">Todo el Sistema</span></>}
      description="Directorio maestro y control transversal de membresías en todas las fincas"
      metricsColumns={5}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1 rounded-full shadow-sm"
          >
            {metrics.total} Usuarios Registrados
          </Badge>
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 h-8 rounded-xl font-bold transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          )}
        </div>
      }
      metrics={
        <>
          <KPICard
            compact
            title="Total Usuarios"
            value={metrics.total}
            icon={<Users className="h-4 w-4 text-emerald-600" />}
          />
          <KPICard
            compact
            title="Colaboradores Activos"
            value={metrics.active}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          />
          <KPICard
            compact
            title="Fincas Conectadas"
            value={metrics.totalFincas}
            icon={<Building2 className="h-4 w-4 text-sky-600" />}
          />
          <KPICard
            compact
            title="Multi-Finca"
            value={metrics.multiFincaCount}
            icon={<Layers className="h-4 w-4 text-indigo-500" />}
          />
          <KPICard
            compact
            title="Sin Finca Asignada"
            value={metrics.withoutFincaCount}
            icon={<UserRoundX className="h-4 w-4 text-amber-500" />}
            goodWhenHigher={false}
          />
        </>
      }
    />
  );
};
