import { Users } from 'lucide-react';
import type { CampesinoDemographics } from '../hooks/useCampesinoEstadisticas';

interface DistribucionHatoCampesinaProps {
  demographics: CampesinoDemographics;
}

export const DistribucionHatoCampesina: React.FC<DistribucionHatoCampesinaProps> = ({
  demographics,
}) => {
  const { totalAlive, males, females, calves, young, adults, mature } = demographics;

  const malePercent = totalAlive > 0 ? Math.round((males / totalAlive) * 100) : 0;
  const femalePercent = totalAlive > 0 ? Math.round((females / totalAlive) * 100) : 0;

  const categories = [
    {
      title: 'Terneros (Cría)',
      subtitle: '0 a 1 año',
      count: calves,
      emoji: '🍼',
      color: 'border-blue-200 bg-blue-50/60 text-blue-900 dark:border-blue-800/40 dark:bg-blue-950/20 dark:text-blue-200',
    },
    {
      title: 'Levante / Jóvenes',
      subtitle: '1 a 2 años',
      count: young,
      emoji: '🌱',
      color: 'border-emerald-200 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200',
    },
    {
      title: 'Ceba / Vientres',
      subtitle: '2 a 5 años',
      count: adults,
      emoji: '🥩',
      color: 'border-amber-200 bg-amber-50/60 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200',
    },
    {
      title: 'Maduros / Reproductores',
      subtitle: '5+ años',
      count: mature,
      emoji: '👑',
      color: 'border-purple-200 bg-purple-50/60 text-purple-900 dark:border-purple-800/40 dark:bg-purple-950/20 dark:text-purple-200',
    },
  ];

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Composición y Lotes del Ganado
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Total de {totalAlive} cabezas activas en la finca
            </p>
          </div>
        </div>
      </div>

      {/* Sex Balance Visual Bar */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
            🐂 Machos: {males} ({malePercent}%)
          </span>
          <span className="text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            🐄 Hembras: {females} ({femalePercent}%)
          </span>
        </div>

        <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${malePercent}%` }}
            className="h-full bg-sky-500 transition-all duration-500"
            title={`Machos: ${malePercent}%`}
          />
          <div
            style={{ width: `${femalePercent}%` }}
            className="h-full bg-rose-500 transition-all duration-500"
            title={`Hembras: ${femalePercent}%`}
          />
        </div>
      </div>

      {/* 4 Age Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.title}
            className={`p-4 rounded-2xl border flex flex-col justify-between ${cat.color}`}
          >
            <div>
              <span className="text-2xl">{cat.emoji}</span>
              <p className="text-xs font-bold mt-2 leading-tight">{cat.title}</p>
              <p className="text-[10px] opacity-70">{cat.subtitle}</p>
            </div>
            <p className="text-2xl font-black mt-3">
              {cat.count}{' '}
              <span className="text-xs font-normal opacity-70">
                ({totalAlive > 0 ? Math.round((cat.count / totalAlive) * 100) : 0}%)
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
