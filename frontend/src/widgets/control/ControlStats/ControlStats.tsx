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
      title: simple ? 'Revisiones del mes' : 'Revisiones del mes',
      value: totalControls.toString(),
      unit: totalControls === 1 ? 'revisión' : 'revisiones',
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      accentColor: 'border-l-blue-500',
      gradient: 'from-blue-50/70 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10',
      iconBg: 'bg-blue-100/80 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
      emptyHint: totalControls === 0 && !isLoading ? 'Sin revisiones registradas este mes' : undefined,
    },
    {
      title: 'Animales con alerta',
      value: sickAnimals.toString(),
      unit: sickAnimals === 1 ? 'alerta' : 'alertas',
      icon: Thermometer,
      color: sickAnimals > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
      accentColor: sickAnimals > 0 ? 'border-l-rose-500' : 'border-l-emerald-500',
      gradient: sickAnimals > 0
        ? 'from-rose-50/70 to-red-50/30 dark:from-rose-950/20 dark:to-red-950/10'
        : 'from-emerald-50/70 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10',
      iconBg: sickAnimals > 0
        ? 'bg-rose-100/80 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300'
        : 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    ...(!simple ? [{
      title: 'Tratamientos',
      value: recentTreatments.toString(),
      unit: recentTreatments === 1 ? 'reciente' : 'recientes',
      icon: Stethoscope,
      color: 'text-amber-600 dark:text-amber-400',
      accentColor: 'border-l-amber-500',
      gradient: 'from-amber-50/70 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10',
      iconBg: 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
    }] : []),
    {
      title: simple ? '% animales sanos' : '% animales sanos',
      value: `${healthyPercentage.toFixed(1)}%`,
      unit: 'sanos',
      icon: FileHeart,
      color: healthyPercentage >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      accentColor: healthyPercentage >= 90 ? 'border-l-emerald-500' : 'border-l-amber-500',
      gradient: healthyPercentage >= 90
        ? 'from-emerald-50/70 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10'
        : 'from-amber-50/70 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10',
      iconBg: healthyPercentage >= 90
        ? 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-amber-100/80 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
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
                {(stat as any).emptyHint && (
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
