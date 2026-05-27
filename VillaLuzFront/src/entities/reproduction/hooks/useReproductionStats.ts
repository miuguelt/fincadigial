import { useState, useEffect, useCallback } from 'react';
import { reproductionService, ReproductionSummary, AnimalReproductionHistory } from '../api/reproduction.service';

interface UseReproductionStatsOptions {
  fincaId?: number;
  animalId?: number;
  autoFetch?: boolean;
}

export function useReproductionStats(options: UseReproductionStatsOptions = {}) {
  const { fincaId, animalId, autoFetch = true } = options;
  
  const [summary, setSummary] = useState<ReproductionSummary | null>(null);
  const [animalHistory, setAnimalHistory] = useState<AnimalReproductionHistory | null>(null);
  const [pendingBirths, setPendingBirths] = useState<any[]>([]);
  const [heatAlerts, setHeatAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!fincaId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await reproductionService.getSummary();
      setSummary(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error cargando resumen reproductivo');
    } finally {
      setLoading(false);
    }
  }, [fincaId]);

  const fetchAnimalHistory = useCallback(async () => {
    if (!animalId) return;
    
    setLoading(true);
    try {
      const data = await reproductionService.getAnimalHistory(animalId);
      setAnimalHistory(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Error cargando historial');
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  const fetchPendingBirths = useCallback(async (days: number = 60) => {
    setLoading(true);
    try {
      const data = await reproductionService.getPendingBirths(days);
      setPendingBirths(data);
      return data;
    } catch (err: any) {
      console.error('Error fetching pending births:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHeatAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reproductionService.getHeatAlerts();
      setHeatAlerts(data);
      return data;
    } catch (err: any) {
      console.error('Error fetching heat alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getConceptionRate = useCallback(() => {
    if (!summary || summary.conception_rate_pct === null) return null;
    return summary.conception_rate_pct;
  }, [summary]);

  const getActivePregnancies = useCallback(() => {
    return summary?.active_pregnancies || 0;
  }, [summary]);

  const getBirthsNext30Days = useCallback(() => {
    return summary?.births_next_30_days || 0;
  }, [summary]);

  useEffect(() => {
    if (autoFetch) {
      if (fincaId) {
        fetchSummary();
        fetchPendingBirths();
        fetchHeatAlerts();
      }
      if (animalId) {
        fetchAnimalHistory();
      }
    }
  }, [autoFetch, fincaId, animalId, fetchSummary, fetchAnimalHistory, fetchPendingBirths, fetchHeatAlerts]);

  return {
    summary,
    animalHistory,
    pendingBirths,
    heatAlerts,
    loading,
    error,
    conceptionRate: getConceptionRate(),
    activePregnancies: getActivePregnancies(),
    birthsNext30Days: getBirthsNext30Days(),
    fetchSummary,
    fetchAnimalHistory,
    fetchPendingBirths,
    fetchHeatAlerts,
    refetch: () => {
      fetchSummary();
      fetchPendingBirths();
      fetchHeatAlerts();
    },
  };
}

export default useReproductionStats;
