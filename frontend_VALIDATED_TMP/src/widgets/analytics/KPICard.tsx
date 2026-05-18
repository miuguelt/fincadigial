import React, { useMemo } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { formatChangePercentage } from '@/shared/utils/formatUtils';
import { cn } from '@/shared/ui/cn.ts';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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
  
  const changeColor = isPositive ? 'text-emerald-600' : 'text-rose-600';
  const bgColor = isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const chartColor = isPositive ? '#10b981' : '#f43f5e';

  const formattedChange = useMemo(
    () => formatChangePercentage(change),
    [change]
  );

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/40 p-6 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2 w-full">
             <div className="h-4 bg-muted rounded w-1/3"></div>
             <div className="h-8 bg-muted rounded w-1/2"></div>
          </div>
          <div className="h-10 w-10 bg-muted rounded-xl"></div>
        </div>
        <div className="h-12 bg-muted/50 rounded-xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="group relative bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-500 overflow-hidden">
      {/* Decorative background gradient */}
      <div className={cn(
        "absolute -right-10 -bottom-10 w-32 h-32 blur-3xl opacity-10 rounded-full transition-colors duration-500",
        isPositive ? "bg-emerald-500" : "bg-rose-500"
      )} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground group-hover:text-primary transition-colors">{title}</h3>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">
                {value}
                {unit && (
                  <span className="ml-1 text-sm font-bold text-muted-foreground/60">{unit}</span>
                )}
              </p>
            </div>
          </div>
          {icon && (
            <div className="p-3 rounded-2xl bg-surface-secondary/50 border border-border/40 group-hover:scale-110 group-hover:border-primary/30 transition-all duration-500">
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          {formattedChange && (
            <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-black", bgColor, changeColor)}>
              {isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
              {formattedChange}
            </div>
          )}
          {subtitle && (
            <p className="text-[10px] font-medium text-muted-foreground/70 truncate">{subtitle}</p>
          )}
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-12 w-full mt-auto -mb-2 -mx-2 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={chartColor} 
                strokeWidth={2} 
                fill={`url(#gradient-${title.replace(/\s+/g, '')})`}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
