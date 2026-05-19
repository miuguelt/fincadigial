import { useState, useCallback } from 'react';
import { FincaFilters } from './types';
import { fincaService, Finca as FincaFromService } from '../api/finca.service';

export function useFincas() {
  const [fincas, setFincas] = useState<FincaFromService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFincas = useCallback(async (_filters?: FincaFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fincaService.getAll();
      setFincas(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar fincas');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFincaById = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fincaService.getById(id);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Error al cargar finca');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fincas,
    loading,
    error,
    fetchFincas,
    fetchFincaById,
  };
}
