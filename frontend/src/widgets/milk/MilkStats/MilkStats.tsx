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
      title: simple ? 'Leche de hoy' : 'Leche de hoy',
      value: dailyLiters.toFixed(1),
      unit: 'L',
      icon: Droplets,
      color: 'text-blue-600 dark:text-blue-400',
      accentColor: 'border-l-blue-500',
      gradient: 'from-blue-50/70 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10',
      iconBg: 'bg-blue-100/80 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
      emptyHint: dailyLiters === 0 && !isLoading ? 'Aún no hay registros hoy. ¿Ya ordeñaste?' : undefined,
    },
    {
      title: simple ? 'Promedio 7 días' : 'Promedio 7 días',
      value: weeklyAverage.toFixed(1),
      unit: 'L/día',
      icon: Calendar,
      color: 'text-emerald-600 dark:text-emerald-400',
      accentColor: 'border-l-emerald-500',
      gradient: 'from-emerald-50/70 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10',
      iconBg: 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    ...(!simple ? [{
      title: '¿Subiendo o bajando?',
      value: `${trendPercentage > 0 ? '+' : ''}${trendPercentage.toFixed(1)}%`,
      unit: '',
      icon: trendPercentage >= 0 ? TrendingUp : TrendingDown,
      color: trendPercentage >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
      accentColor: trendPercentage >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500',
      gradient: trendPercentage >= 0
        ? 'from-emerald-50/70 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/10'
        : 'from-rose-50/70 to-red-50/30 dark:from-rose-950/20 dark:to-red-950/10',
      iconBg: trendPercentage >= 0
        ? 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-rose-100/80 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
    }] : []),
    {
      title: simple ? 'Vacas ordeñadas hoy' : 'Vacas ordeñadas hoy',
      value: animalsMilked.toString(),
      unit: animalsMilked === 1 ? 'vaca' : 'vacas',
      icon: Droplets,
      color: 'text-purple-600 dark:text-purple-400',
      accentColor: 'border-l-purple-500',
      gradient: 'from-purple-50/70 to-fuchsia-50/30 dark:from-purple-950/20 dark:to-fuchsia-950/10',
      iconBg: 'bg-purple-100/80 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
    },
  ];

  if (isLoading) {
    return (
      <div className={cn('grid gap-3 md:gap-4', gridClass)}>
        {stats.map((_, i) => (
          <Card key={i} className={cn('animate-pulse border-l-4 border-l-gray-200', simple && 'last:min-[360px]:col-span-2 last:sm:col-span-1')}>
            <CardContent className="p-3 md:p-4">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-3 md:gap-4', gridClass)}>
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={cn(
            'relative overflow-hidden border-0 border-l-4 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br',
            simple && 'last:min-[360px]:col-span-2 last:sm:col-span-1',
            stat.accentColor,
            stat.gradient
          )}
        >
          <CardContent className="flex h-full min-h-[104px] flex-col justify-between p-3 md:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-xs font-bold leading-snug text-muted-foreground">
                  {stat.title}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                  <span className={cn('text-2xl md:text-[28px] font-black tracking-tight', stat.color)}>
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                      {stat.unit}
                    </span>
                  )}
                </div>
                {noData && (stat as any).emptyHint && (
                  <p className="mt-1 break-words text-xs leading-snug text-muted-foreground">
                    {(stat as any).emptyHint}
                  </p>
                )}
              </div>
              <div className={cn('p-1.5 md:p-2.5 rounded-xl backdrop-blur-sm shadow-inner shrink-0', stat.iconBg)}>
                <stat.icon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
