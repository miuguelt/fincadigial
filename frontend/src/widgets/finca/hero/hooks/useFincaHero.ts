import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { weatherService } from '@/entities/weather';
import { deriveHeroSummary } from './deriveHeroSummary';
import { fetchFincaHero } from './fetchFincaHero';
import type { FincaHeroSnapshot } from './fetchFincaHero';

const EMPTY: FincaHeroSnapshot = {
  profile: null,
  current: null,
  alerts: [],
  location: null,
  weatherError: false,
};

/**
 * Estado del banner de cabecera de la finca activa.
 *
 * Nunca inventa valores: si la finca no tiene coordenadas o aún no hay lecturas,
 * los campos quedan en `null` y la UI muestra el estado correspondiente.
 */
export function useFincaHero() {
  const { user } = useAuth() as any;
  const rawFincaId = user ? user.finca_id : null;
  const fincaId: number | null = rawFincaId ? Number(rawFincaId) : null;

  const [data, setData] = useState<FincaHeroSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!fincaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const snapshot = await fetchFincaHero(fincaId);
    if (!mountedRef.current) return;
    setData(snapshot);
    setLoading(false);
  }, [fincaId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Pide una lectura nueva a Open-Meteo y recarga el banner. */
  const refreshWeather = useCallback(async () => {
    if (!fincaId || refreshing) return;
    setRefreshing(true);
    try {
      await weatherService.getCurrent(fincaId);
      await load();
    } catch {
      if (mountedRef.current) setData((prev) => ({ ...prev, weatherError: true }));
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [fincaId, load, refreshing]);

  return {
    ...data,
    ...deriveHeroSummary(data, user ? user.finca_name : null),
    fincaId,
    loading,
    refreshing,
    refreshWeather,
  };
}
