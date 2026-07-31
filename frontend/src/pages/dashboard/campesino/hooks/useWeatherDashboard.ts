import { useCallback, useEffect, useRef, useState } from 'react';
import { weatherService } from '@/entities/weather';
import type { FincaLocation, WeatherAlert, WeatherForecast, WeatherRecord } from '@/entities/weather';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';

/**
 * Carga clima, alertas e histórico de la finca activa.
 *
 * `location` viene del backend para poder distinguir "aún no hay lecturas" de
 * "la finca no tiene coordenadas", que es el único caso en el que Open-Meteo
 * no puede responder.
 */
export function useWeatherDashboard() {
  const { showToast } = useToast();
  const { user } = useAuth() as any;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [days, setDays] = useState(7);
  const [current, setCurrent] = useState<WeatherRecord | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [history, setHistory] = useState<WeatherRecord[]>([]);
  const [location, setLocation] = useState<FincaLocation | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const initialRefreshFinca = useRef<number | undefined>(undefined);

  // The canonical session field is `finca_id`; the aliases keep sessions
  // created by the multi-finca flow and older cached sessions compatible.
  const fincaId: number | undefined =
    user?.finca_id ??
    user?.active_finca_id ??
    user?.current_finca_id ??
    user?.finca?.id ??
    user?.fincas?.[0]?.id;
  const fincaName: string =
    user?.finca_name || user?.finca?.name || user?.fincas?.[0]?.name || 'tu finca';

  const loadData = useCallback(async () => {
    if (!fincaId) {
      setLoading(false);
      setCurrent(null);
      setAlerts([]);
      setHistory([]);
      setLocation(null);
      setForecast(null);
      return;
    }
    setLoading(true);
    try {
      const dashboard = await weatherService.getDashboard(fincaId, days);
      setCurrent(dashboard.current ?? null);
      setAlerts(dashboard.alerts || []);
      setHistory(dashboard.history || []);
      setLocation(dashboard.location ?? null);
      if (dashboard.forecast) setForecast(dashboard.forecast);
    } catch {
      showToast('Error cargando datos climáticos', 'error');
    } finally {
      setLoading(false);
    }
  }, [fincaId, days, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshNow = useCallback(async () => {
    if (!fincaId) return;
    setUpdating(true);
    try {
      const live = await weatherService.getCurrent(fincaId);
      if (live.record) setCurrent(live.record);
      if (live.forecast) setForecast(live.forecast);
      showToast('Datos climáticos actualizados', 'success');
      await loadData();
    } catch {
      showToast('Error actualizando datos', 'error');
    } finally {
      setUpdating(false);
    }
  }, [fincaId, loadData, showToast]);

  const dismissAlert = useCallback(
    async (alertId: number) => {
      if (!fincaId) return;
      try {
        await weatherService.dismissAlert(fincaId, alertId);
        showToast('Alerta descartada', 'success');
        await loadData();
      } catch {
        showToast('Error descartando alerta', 'error');
      }
    },
    [fincaId, loadData, showToast],
  );

  const hasCoordinates =
    location?.latitude != null && location?.longitude != null;

  // A dashboard load reads the persisted history. Do one live sync on entry so
  // the farmer never lands on stale data, while keeping the interval bounded.
  useEffect(() => {
    if (!fincaId || initialRefreshFinca.current === fincaId) return;
    initialRefreshFinca.current = fincaId;
    void refreshNow();
  }, [fincaId, refreshNow]);

  useEffect(() => {
    if (!fincaId || !hasCoordinates) return;
    const interval = window.setInterval(() => {
      void refreshNow();
    }, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [fincaId, hasCoordinates, refreshNow]);

  return {
    fincaId,
    fincaName,
    loading,
    updating,
    days,
    setDays,
    current,
    alerts,
    history,
    location,
    forecast,
    hasCoordinates,
    loadData,
    refreshNow,
    dismissAlert,
  };
}
