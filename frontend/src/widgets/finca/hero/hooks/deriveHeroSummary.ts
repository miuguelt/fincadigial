import type { FincaLocation } from '@/entities/weather';
import type { FincaHeroProfile } from '../FincaHeroBanner.types';
import { firstDefined } from '../utils/firstDefined';
import type { FincaHeroSnapshot } from './fetchFincaHero';

/**
 * Nombre a mostrar y si la finca tiene coordenadas. El clima manda sobre la
 * ficha porque es la fuente que el backend usó para consultar Open-Meteo.
 */
export function deriveHeroSummary(data: FincaHeroSnapshot, fallbackName: string | null) {
  const geo: Partial<FincaLocation> = data.location ?? {};
  const ficha: Partial<FincaHeroProfile> = data.profile ?? {};
  const latitude = firstDefined(geo.latitude, ficha.latitude);
  const longitude = firstDefined(geo.longitude, ficha.longitude);

  return {
    fincaName: firstDefined(ficha.name, fallbackName) ?? 'Mi finca',
    hasCoordinates: latitude !== null && longitude !== null,
  };
}
