import api from '@/shared/api/client';
import { weatherService } from '@/entities/weather';
import type { FincaLocation, WeatherAlert, WeatherRecord } from '@/entities/weather';
import type { FincaHeroProfile } from '../FincaHeroBanner.types';

export interface FincaHeroSnapshot {
  profile: FincaHeroProfile | null;
  current: WeatherRecord | null;
  alerts: WeatherAlert[];
  location: FincaLocation | null;
  weatherError: boolean;
}

/** `APIResponse` envuelve el recurso en `data`; algunos endpoints lo devuelven plano. */
function unwrapProfile(result: PromiseSettledResult<any>): FincaHeroProfile | null {
  if (result.status !== 'fulfilled') return null;
  const body = result.value.data;
  const payload = body && body.data ? body.data : body;
  return payload && typeof payload === 'object' ? (payload as FincaHeroProfile) : null;
}

/**
 * Ficha de la finca y clima actual. Se resuelven por separado porque que falle
 * uno no debe dejar el banner vacío: la ficha se lee de `fincas` y el clima de
 * `weather_records`, y cada uno tiene su propio estado de error.
 */
export async function fetchFincaHero(fincaId: number): Promise<FincaHeroSnapshot> {
  const [profileResult, weatherResult] = await Promise.allSettled([
    api.get(`/fincas/${fincaId}`),
    // 2 días: con una sola lectura al día, pedir 1 deja el banner vacío según
    // la hora a la que corrió la tarea de actualización.
    weatherService.getDashboard(fincaId, 2),
  ]);

  const profile = unwrapProfile(profileResult);

  if (weatherResult.status !== 'fulfilled') {
    return { profile, current: null, alerts: [], location: null, weatherError: true };
  }

  const weather = weatherResult.value;
  return {
    profile,
    current: weather.current || null,
    alerts: weather.alerts || [],
    location: weather.location || null,
    weatherError: false,
  };
}
