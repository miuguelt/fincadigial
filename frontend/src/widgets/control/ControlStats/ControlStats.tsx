import { Activity, Thermometer, Stethoscope, FileHeart } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';

interface ControlStatsProps {
  totalControls: number;
  sickAnimals: number;
  recentTreatments: number;
  healthyPercentage: number;
  isLoading?: boolean;
  simple?: boolean;
}

export function ControlStats({
  totalControls,
  sickAnimals,
  recentTreatments,
  healthyPercentage,
  isLoading = false,
  simple = false,
}: ControlStatsProps) {
  const gridClass = simple
    ? 'grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3'
    : 'grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4';

  const stats = [
    {
      title: 'Revisiones del mes',
      value: totalControls.toString(),
      unit: totalControls === 1 ? 'revisión' : 'revisiones',
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      borderGlow: 'border-blue-500/20 hover:border-blue-500/40',
      gradient: 'from-blue-500/10 via-blue-500/5 to-card',
      iconBg: 'bg-blue-600 text-white shadow-md shadow-blue-600/25',
      emptyHint: totalControls === 0 && !isLoading ? 'Sin revisiones registradas este mes' : undefined,
    },
    {
      title: 'Animales con alerta',
      value: sickAnimals.toString(),
      unit: sickAnimals === 1 ? 'alerta' : 'alertas',
      icon: Thermometer,
      color: sickAnimals > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
      borderGlow: sickAnimals > 0 ? 'border-rose-500/20 hover:border-rose-500/40' : 'border-emerald-500/20 hover:border-emerald-500/40',
      gradient: sickAnimals > 0
        ? 'from-rose-500/10 via-rose-500/5 to-card'
        : 'from-emerald-500/10 via-emerald-500/5 to-card',
      iconBg: sickAnimals > 0
        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
        : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25',
    },
    ...(!simple ? [{
      title: 'Tratamientos',
      value: recentTreatments.toString(),
      unit: recentTreatments === 1 ? 'reciente' : 'recientes',
      icon: Stethoscope,
      color: 'text-amber-600 dark:text-amber-400',
      borderGlow: 'border-amber-500/20 hover:border-amber-500/40',
      gradient: 'from-amber-500/10 via-amber-500/5 to-card',
      iconBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/25',
    }] : []),
    {
      title: '% animales sanos',
      value: `${healthyPercentage.toFixed(1)}%`,
      unit: 'sanos',
      icon: FileHeart,
      color: healthyPercentage >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      borderGlow: healthyPercentage >= 90 ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-amber-500/20 hover:border-amber-500/40',
      gradient: healthyPercentage >= 90
        ? 'from-emerald-500/10 via-emerald-500/5 to-card'
        : 'from-amber-500/10 via-amber-500/5 to-card',
      iconBg: healthyPercentage >= 90
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
        : 'bg-amber-500 text-white shadow-md shadow-amber-500/25',
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
                {(stat as any).emptyHint && (
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
