import { useState, useCallback } from 'react';
import { OperationalCost, OperationalFilters } from './types';
import { operationalService } from '../api/operational.service';

export function useOperational() {
  const [costs, setCosts] = useState<OperationalCost[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCosts = useCallback(async (filters?: OperationalFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await operationalService.getAll(filters);
      setCosts(data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar costos operacionales');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async (fincaId?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = fincaId ? { finca_id: fincaId } : {};
      const data = await operationalService.getSummary(params);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar resumen operacional');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    costs,
    summary,
    loading,
    error,
    fetchCosts,
    fetchSummary,
  };
}
