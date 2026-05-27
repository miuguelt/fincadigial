import React, { useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatChangePercentage } from '@/shared/utils/formatUtils';
import { cn } from '@/shared/ui/cn.ts';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
  goodWhenHigher?: boolean;
  trendData?: { value: number }[]; // Datos opcionales para la mini-gráfica
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  icon,
  loading = false,
  subtitle,
  goodWhenHigher = true,
  trendData = [
    { value: 40 }, { value: 30 }, { value: 45 }, { value: 50 }, 
    { value: 35 }, { value: 60 }, { value: 55 }
  ],
}) => {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange
    ? (goodWhenHigher ? (change as number) >= 0 : (change as number) <= 0)
    : true;
  const isNeutral = !hasChange || change === 0;
  
  const changeColor = isNeutral
    ? 'text-slate-600 dark:text-slate-400'
    : isPositive
    ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-rose-700 dark:text-rose-400';

  const bgColor = isNeutral
    ? 'bg-slate-100 dark:bg-slate-800'
    : isPositive
    ? 'bg-emerald-50 dark:bg-emerald-950/60'
    : 'bg-rose-50 dark:bg-rose-950/60';

  const chartColor = isNeutral
    ? 'var(--color-slate-400, #94a3b8)'
    : isPositive
    ? 'var(--color-success-500, #10b981)'
    : 'var(--color-danger-500, #f43f5e)';

  const accentGradient = isNeutral
    ? 'from-slate-400 via-slate-300 to-slate-200'
    : isPositive
    ? 'from-emerald-500 via-teal-400 to-cyan-300'
    : 'from-rose-500 via-pink-400 to-orange-300';

  const ChangeBadgeIcon = isNeutral ? Minus : isPositive ? ArrowUp : ArrowDown;

  const formattedChange = useMemo(
    () => formatChangePercentage(change),
    [change]
  );

  const gradientId = useMemo(
    () => `kpi-gradient-${title.replace(/\s+/g, '-').toLowerCase()}`,
    [title]
  );

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border/40 p-6 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2 w-full">
             <div className="h-3 bg-muted rounded-full w-1/3"></div>
             <div className="h-8 bg-muted rounded-lg w-1/2 mt-2"></div>
          </div>
          <div className="h-10 w-10 bg-muted rounded-xl flex-shrink-0 ml-4"></div>
        </div>
        <div className="h-12 bg-muted/50 rounded-xl w-full mt-4"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="group relative bg-card/50 dark:bg-card/30 backdrop-blur-xl border border-border/50 rounded-lg overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/6 hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Barra de acento superior */}
      <div className={cn(
        "absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r opacity-75 group-hover:opacity-100 transition-opacity duration-300",
        accentGradient
      )} />

      {/* Fondo decorativo sutil */}
      <div className={cn(
        "absolute -right-8 -bottom-8 w-28 h-28 blur-2xl opacity-[0.07] rounded-full transition-colors duration-500",
        isNeutral ? "bg-slate-500" : isPositive ? "bg-emerald-500" : "bg-rose-500"
      )} />

      <div className="relative z-10 flex flex-col h-full p-5">
        {/* Encabezado: título + icono */}
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-0.5 flex-1 min-w-0 pr-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground group-hover:text-primary/80 transition-colors truncate">
              {title}
            </h3>
            <div className="flex items-baseline gap-1 mt-1">
              <p className="text-3xl font-black tracking-tighter text-foreground tabular-nums leading-none">
                {value}
              </p>
              {unit && (
                <span className="text-sm font-bold text-muted-foreground/60 mb-0.5">{unit}</span>
              )}
            </div>
          </div>
          {icon && (
            <div className="p-2.5 rounded-xl bg-card border border-border/60 flex-shrink-0 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300">
              {icon}
            </div>
          )}
        </div>

        {/* Badge de cambio + subtítulo */}
        <div className="flex items-center gap-2 mb-3 min-h-[22px]">
          {formattedChange && (
            <span className={cn(
              "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide",
              bgColor, changeColor
            )}>
              <ChangeBadgeIcon className="w-3 h-3 flex-shrink-0" />
              {formattedChange}
            </span>
          )}
          {subtitle && (
            <p className="text-[10px] font-medium text-muted-foreground/70 truncate">{subtitle}</p>
          )}
        </div>

        {/* Sparkline mini-chart */}
        <div className="h-10 w-full mt-auto -mx-1 opacity-50 group-hover:opacity-90 transition-opacity duration-400">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor}
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                isAnimationActive={true}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default KPICard;
