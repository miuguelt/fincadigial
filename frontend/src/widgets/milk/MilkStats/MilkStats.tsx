import { TrendingUp, TrendingDown, Droplets, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';

interface MilkStatsProps {
  dailyLiters: number;
  weeklyAverage: number;
  trendPercentage: number;
  animalsMilked: number;
  isLoading?: boolean;
  simple?: boolean;
}

export function MilkStats({
  dailyLiters,
  weeklyAverage,
  trendPercentage,
  animalsMilked,
  isLoading = false,
  simple = false,
}: MilkStatsProps) {
  const noData = !isLoading && dailyLiters === 0 && weeklyAverage === 0;
  const gridClass = simple
    ? 'grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4';

  const stats = [
    {
      title: 'Leche de hoy',
      value: dailyLiters.toFixed(1),
      unit: 'L',
      icon: Droplets,
      color: 'text-blue-600 dark:text-blue-400',
      borderGlow: 'border-blue-500/20 hover:border-blue-500/40',
      gradient: 'from-blue-500/10 via-blue-500/5 to-card',
      iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/25',
      emptyHint: dailyLiters === 0 && !isLoading ? 'Aún no hay registros hoy. ¿Ya ordeñaste?' : undefined,
    },
    {
      title: 'Promedio 7 días',
      value: weeklyAverage.toFixed(1),
      unit: 'L/día',
      icon: Calendar,
      color: 'text-emerald-600 dark:text-emerald-400',
      borderGlow: 'border-emerald-500/20 hover:border-emerald-500/40',
      gradient: 'from-emerald-500/10 via-emerald-500/5 to-card',
      iconBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25',
    },
    ...(!simple ? [{
      title: '¿Subiendo o bajando?',
      value: `${trendPercentage > 0 ? '+' : ''}${trendPercentage.toFixed(1)}%`,
      unit: '',
      icon: trendPercentage >= 0 ? TrendingUp : TrendingDown,
      color: trendPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      borderGlow: trendPercentage >= 0 ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-rose-500/20 hover:border-rose-500/40',
      gradient: trendPercentage >= 0
        ? 'from-emerald-500/10 via-emerald-500/5 to-card'
        : 'from-rose-500/10 via-rose-500/5 to-card',
      iconBg: trendPercentage >= 0
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
        : 'bg-rose-600 text-white shadow-md shadow-rose-600/25',
    }] : []),
    {
      title: 'Vacas ordeñadas hoy',
      value: animalsMilked.toString(),
      unit: animalsMilked === 1 ? 'vaca' : 'vacas',
      icon: Droplets,
      color: 'text-purple-600 dark:text-purple-400',
      borderGlow: 'border-purple-500/20 hover:border-purple-500/40',
      gradient: 'from-purple-500/10 via-purple-500/5 to-card',
      iconBg: 'bg-purple-600 text-white shadow-md shadow-purple-600/25',
    },
  ];

  if (isLoading) {
    return (
      <div className={cn('grid gap-3.5 sm:gap-4', gridClass)}>
        {stats.map((_, i) => (
          <Card key={i} className={cn('animate-pulse rounded-2xl border border-border/60 bg-muted/40', simple && 'last:min-[360px]:col-span-2 last:sm:col-span-1')}>
            <CardContent className="p-4 sm:p-5">
              <div className="h-3.5 bg-muted rounded-lg w-2/3 mb-3" />
              <div className="h-7 bg-muted rounded-lg w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3.5 sm:gap-4', gridClass)}>
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={cn(
            'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-0 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
            simple && 'last:min-[360px]:col-span-2 last:sm:col-span-1',
            stat.borderGlow,
            stat.gradient
          )}
        >
          <CardContent className="flex h-full min-h-[110px] flex-col justify-between p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className={cn('text-2xl sm:text-3xl font-black tracking-tight', stat.color)}>
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>
                {noData && (stat as any).emptyHint && (
                  <p className="mt-1 text-xs font-medium leading-tight text-muted-foreground">
                    {(stat as any).emptyHint}
                  </p>
                )}
              </div>
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105', stat.iconBg)}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
