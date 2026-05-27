import { useState, useEffect } from 'react';
import { milkService } from '@/entities/milk/api/milk.service';
import { controlService } from '@/entities/control/api/control.service';

interface ControlsSummary {
  dailyLiters: number;
  weeklyAverage: number;
  animalsMilked: number;
  trendPercentage: number;
  sickAnimals: number;
  recentTreatments: number;
  totalControls: number;
  healthyPercentage: number;
  loading: boolean;
}

export function useControlsSummary(fincaId: number): ControlsSummary {
  const [dailyLiters, setDailyLiters] = useState(0);
  const [weeklyAverage, setWeeklyAverage] = useState(0);
  const [animalsMilked, setAnimalsMilked] = useState(0);
  const [trendPercentage, setTrendPercentage] = useState(0);
  const [sickAnimals, setSickAnimals] = useState(0);
  const [recentTreatments, setRecentTreatments] = useState(0);
  const [totalControls, setTotalControls] = useState(0);
  const [healthyPercentage, setHealthyPercentage] = useState(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const [daily, weekly, controlData] = await Promise.all([
        milkService.getDailySummary(fincaId).catch(() => null),
        milkService.getWeeklySummary(fincaId).catch(() => null),
        controlService.getPaginated({ page: 1, limit: 1000, finca_id: fincaId } as any).catch(() => null),
      ]);
      if (!mounted) return;

      if (daily) {
        const d = daily?.data || daily || {};
        setDailyLiters(d.total_liters || 0);
        setAnimalsMilked(d.count || 0);
      }
      if (weekly) {
        const w = weekly?.data || weekly || {};
        setWeeklyAverage(w.avg_daily_liters || 0);
        setTrendPercentage(w.trend_vs_previous_month?.change_percentage || 0);
      }
      if (controlData) {
        const arr: any[] = (controlData as any)?.items || controlData?.data || (controlData as any)?.results || [];
        const sick = arr.filter((a: any) =>
          a.health_status?.toLowerCase().includes('malo') ||
          a.health_status?.toLowerCase().includes('enfermo') ||
          a.healt_status?.toLowerCase().includes('malo') ||
          a.healt_status?.toLowerCase().includes('enfermo')
        ).length;
        const treatments = arr.filter((a: any) =>
          a.health_status?.toLowerCase().includes('tratamiento') ||
          a.healt_status?.toLowerCase().includes('tratamiento') ||
          (a.description?.toLowerCase() || '').includes('tratamiento')
        ).length;
        setTotalControls(arr.length);
        setSickAnimals(sick);
        setRecentTreatments(treatments);
        setHealthyPercentage(arr.length ? ((arr.length - sick) / arr.length) * 100 : 100);
      }
      setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [fincaId]);

  return {
    dailyLiters, weeklyAverage, animalsMilked, trendPercentage,
    sickAnimals, recentTreatments, totalControls, healthyPercentage, loading,
  };
}
