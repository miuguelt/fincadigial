import type { WeatherRecord } from '@/entities/weather';
import { MissingCoordinates, MissingReading } from './HeroStates';
import { WeatherNow } from './WeatherNow';

interface Props {
  record: WeatherRecord | null;
  hasCoordinates: boolean;
  weatherError: boolean;
  refreshing: boolean;
  fincaName: string;
  onRefresh: () => void;
}

/**
 * Elige qué mostrar en el bloque del clima: la lectura real, el aviso de que
 * faltan coordenadas, o el aviso de que todavía no hay lecturas.
 */
export function WeatherSlot({
  record,
  hasCoordinates,
  weatherError,
  refreshing,
  fincaName,
  onRefresh,
}: Props) {
  if (record) {
    return <WeatherNow record={record} refreshing={refreshing} onRefresh={onRefresh} />;
  }
  if (!hasCoordinates) {
    return <MissingCoordinates fincaName={fincaName} />;
  }
  return <MissingReading refreshing={refreshing} onRefresh={onRefresh} failed={weatherError} />;
}
