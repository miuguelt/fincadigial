import React, { useEffect, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { analyticsService } from '@/features/reporting/api/analytics.service';

interface WeightDeltaEntry {
  latest_weight: number;
  prev_weight: number | null;
  delta_pct: number | null;
  delta_kg: number | null;
  last_checkup_date: string | null;
}

// Caché por animal: el delta cambia solo cuando cambian los controles del mismo
const deltaCache = new Map<string, WeightDeltaEntry | null>();

/**
 * Celda de peso del listado de animales: peso actual + chip de variación
 * respecto al control anterior, con la fecha del último pesaje como tooltip.
 */
export const AnimalWeightCell: React.FC<{
  animalId: number;
  current: number | null | undefined;
}> = ({ animalId, current }) => {
  const [entry, setEntry] = useState<WeightDeltaEntry | null | undefined>(
    () => deltaCache.get(String(animalId))
  );
  const [loaded, setLoaded] = useState(deltaCache.has(String(animalId)));

  useEffect(() => {
    if (loaded || !animalId) return;
    let alive = true;
    analyticsService
      .getWeightDeltas([animalId])
      .then((res: Record<string, any>) => {
        if (!alive) return;
        const found = res?.[String(animalId)] || null;
        if (found) deltaCache.set(String(animalId), found);
        setEntry(found);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) {
          setEntry(undefined);
          setLoaded(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [animalId, loaded]);

  const weight = current ?? entry?.latest_weight;
  if (weight == null) {
    return <span className="text-muted-foreground/60 italic text-xs">—</span>;
  }

  const delta = entry?.delta_pct;
  const hasDelta = delta != null && entry?.prev_weight != null;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={
        entry?.last_checkup_date
          ? `Último pesaje: ${entry.last_checkup_date}${
              hasDelta ? ` · antes: ${entry.prev_weight} kg` : ''
            }`
          : undefined
      }
    >
      <span className="tabular-nums font-semibold">{weight} kg</span>
      {hasDelta && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-bold border',
            delta! <= -5 && 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30',
            delta! < 0 && delta! > -5 && 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
            delta! >= 0 && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
          )}
        >
          {delta! >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {delta! > 0 ? `+${delta}%` : `${delta}%`}
        </span>
      )}
    </span>
  );
};

export default AnimalWeightCell;
