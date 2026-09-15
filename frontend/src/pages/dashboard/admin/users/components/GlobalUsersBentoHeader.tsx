import { useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  Layers,
  UserRoundX,
  Users,
} from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { cn } from '@/shared/ui/cn';
import type { UserWithProfile } from '../types';

interface GlobalUsersBentoHeaderProps {
  users: UserWithProfile[];
  className?: string;
}

export const GlobalUsersBentoHeader = ({
  users,
  className,
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
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-4', className)}>
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
    </div>
  );
};
