import { useCallback, useEffect, useState } from 'react';
import { milkService } from '@/entities/milk/api/milk.service';
import { controlService } from '@/entities/control/api/control.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import {
  extractControlRows,
  summarizeControls,
  summarizeDailyMilk,
  summarizeWeeklyMilk,
} from './controlSummary.utils';
import type { AttentionAnimal, ControlRecord } from './controlSummary.utils';

export interface ControlsSummary {
  dailyLiters: number;
  weeklyAverage: number;
  animalsMilked: number;
  trendPercentage: number;
  sickAnimals: number;
  recentTreatments: number;
  totalControls: number;
  healthyPercentage: number;
  loading: boolean;
  /** Registros de ordeño del día (equivale a animalsMilked). */
  milkRecords: number;
  /** Controles registrados en el mes en curso. */
  monthlyControls: number;
  /** Animales cuyo último control indica estado de alerta. */
  animalsNeedingAttention: number;
  /** Qué animales son, para poder mostrarlos y actuar sobre cada uno. */
  attentionAnimals: AttentionAnimal[];
  /** Controles crudos ya descargados; los reportes los reutilizan sin repetir la petición. */
  controlRows: ControlRecord[];
  /** true cuando la fuente falló: la UI muestra "sin datos", no un cero inventado. */
  milkUnavailable: boolean;
  controlsUnavailable: boolean;
  refresh: () => void;
}

const INITIAL = {
  dailyLiters: 0,
  weeklyAverage: 0,
  animalsMilked: 0,
  trendPercentage: 0,
  sickAnimals: 0,
  recentTreatments: 0,
  totalControls: 0,
  healthyPercentage: 100,
  milkRecords: 0,
  monthlyControls: 0,
  animalsNeedingAttention: 0,
  attentionAnimals: [] as AttentionAnimal[],
  controlRows: [] as ControlRecord[],
  milkUnavailable: false,
  controlsUnavailable: false,
  loading: true,
};

export function useControlsSummary(fincaId: number): ControlsSummary {
  const [state, setState] = useState(INITIAL);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleRefetch = (e?: Event) => {
      const detail = (e as CustomEvent)?.detail;
      const res = detail?.resource || detail?.endpoint;
      if (
        !res ||
        res === 'control' ||
        res === 'controls' ||
        res === 'milk-production' ||
        res === 'milk'
      ) {
        refresh();
      }
    };
    window.addEventListener('crud:refetch', handleRefetch);
    window.addEventListener('server-resource-changed', handleRefetch);
    return () => {
      window.removeEventListener('crud:refetch', handleRefetch);
      window.removeEventListener('server-resource-changed', handleRefetch);
    };
  }, [refresh]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true }));

      const queryParams: Record<string, any> = {
        page: 1,
        limit: 1000,
        cache_bust: Date.now(),
      };
      if (fincaId) {
        queryParams.finca_id = fincaId;
      }

      const [daily, weekly, controlData] = await Promise.all([
        milkService.getDailySummary(fincaId).catch(() => null),
        milkService.getWeeklySummary(fincaId).catch(() => null),
        controlService
          .getPaginated(queryParams as any)
          .catch(() => null),
      ]);
      if (!mounted) return;

      const milk = daily ? summarizeDailyMilk(daily) : null;
      const rows = controlData ? extractControlRows(controlData) : [];
      // getTodayColombia y no toISOString: en UTC el día cambia a las 7 p. m.
      // hora local y los conteos "de hoy" saltarían de fecha esa misma noche.
      const controls = controlData
        ? summarizeControls(rows, getTodayColombia())
        : null;

      const treatments = rows.filter((row) =>
        String(row.description ?? '').toLowerCase().includes('tratamiento'),
      ).length;

      setState({
        dailyLiters: milk?.dailyLiters ?? 0,
        milkRecords: milk?.milkRecords ?? 0,
        animalsMilked: milk?.milkRecords ?? 0,
        weeklyAverage: weekly ? summarizeWeeklyMilk(weekly) : 0,
        trendPercentage: 0,
        totalControls: rows.length,
        monthlyControls: controls?.monthlyControls ?? 0,
        animalsNeedingAttention: controls?.animalsNeedingAttention ?? 0,
        attentionAnimals: controls?.attentionAnimals ?? [],
        controlRows: rows,
        sickAnimals: controls?.animalsNeedingAttention ?? 0,
        recentTreatments: treatments,
        healthyPercentage: controls?.healthyPercentage ?? 100,
        milkUnavailable: daily === null,
        controlsUnavailable: controlData === null,
        loading: false,
      });
    };

    load();
    return () => {
      mounted = false;
    };
  }, [fincaId, reloadToken]);

  return { ...state, refresh };
}
