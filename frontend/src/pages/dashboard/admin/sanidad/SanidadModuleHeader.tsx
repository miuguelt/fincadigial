import React from 'react';
import {
  Activity,
  AlertTriangle,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';
import type { SanidadStatsData } from './useSanidadStats';

export type SanidadView = 'casos' | 'tratamientos';

function formatCompactCOP(amount: number): string {
  if (!amount || Number.isNaN(amount)) return '$ 0';
  if (amount >= 1_000_000) return `$ ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$ ${(amount / 1_000).toFixed(0)}k`;
  return `$ ${amount.toLocaleString('es-CO')}`;
}

function StatCard({
  label,
  sublabel,
  value,
  icon,
  className,
  mobileLabel,
  mobileSublabel,
}: {
  label: string;
  sublabel: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
  mobileLabel?: string;
  mobileSublabel?: string;
}) {
  return (
    <div
      className={cn(
        'backdrop-blur-xl rounded-xl border p-2.5 sm:p-3 flex items-center justify-between shadow-xs transition-all duration-300 group',
        className
      )}
    >
      <div className="space-y-0.5 min-w-0">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block fit-clamp">
          <span className="sm:hidden">{mobileLabel || label}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        <div className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-none">
          {value}
        </div>
        <p className="text-[11px] text-muted-foreground/80 font-medium fit-clamp">
          <span className="sm:hidden">{mobileSublabel || sublabel}</span>
          <span className="hidden sm:inline">{sublabel}</span>
        </p>
      </div>
      <div className="p-1.5 sm:p-2 rounded-lg bg-background/40 border border-border/30 shrink-0 ml-1 text-muted-foreground group-hover:scale-110 transition-transform">
        {icon}
      </div>
    </div>
  );
}

interface SanidadModuleHeaderProps {
  view: SanidadView;
  stats: SanidadStatsData;
  onViewChange: (view: SanidadView) => void;
}

/**
 * Encabezado único del Módulo Sanidad: navegación de sanidad (SanidadTabs,
 * con los conteos de casos y tratamientos en los grupos) e indicadores
 * unificados de casos + tratamientos.
 */
export const SanidadModuleHeader: React.FC<SanidadModuleHeaderProps> = ({
  stats,
}: SanidadModuleHeaderProps) => {
  const { episodes, treatments } = stats;

  return (
    <div className="space-y-3 sm:space-y-3.5">
      <SanidadTabs
        counts={{
          'disease-animals': episodes.total,
          treatments: treatments.total,
        }}
      />

      {/* KPI unificados del módulo: 2x2 en móvil, 4 en fila en escritorio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          label="Enfermos"
          sublabel="Casos activos en la finca"
          mobileLabel="Activos"
          mobileSublabel="Casos activos"
          value={episodes.active}
          icon={<Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse text-red-500" />}
          className="bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-950/40 dark:to-red-900/10 border-red-500/20 hover:border-red-500/40"
        />
        <StatCard
          label="En retiro"
          sublabel="Retiro sanitario activo (carne/leche)"
          mobileLabel="Retiro"
          mobileSublabel="Carne / leche"
          value={
            treatments.activeWithdrawals > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">{treatments.activeWithdrawals}</span>
            ) : (
              treatments.activeWithdrawals
            )
          }
          icon={<AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />}
          className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/40 dark:to-amber-900/10 border-amber-500/20 hover:border-amber-500/40"
        />
        <StatCard
          label="% Sanados"
          sublabel="Tasa de recuperación (12 m)"
          mobileLabel="Sanados"
          mobileSublabel="Últimos 12 meses"
          value={`${episodes.recoveryRate || 0}%`}
          icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-950/40 dark:to-blue-900/10 border-blue-500/20 hover:border-blue-500/40"
        />
        <StatCard
          label="Inversión salud"
          sublabel="Costo acumulado en tratamientos"
          mobileLabel="Inversión"
          mobileSublabel="Costo total"
          value={formatCompactCOP(treatments.totalCost)}
          icon={<DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />}
          className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/40 dark:to-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40"
        />
      </div>
    </div>
  );
};

export default SanidadModuleHeader;
