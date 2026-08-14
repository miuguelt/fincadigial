import { CloudRain, Droplets, Sun, Sunrise, Thermometer, Wind } from 'lucide-react';
import type { WeatherRecord } from '@/entities/weather';
import type { WeatherMetricItem } from '../FincaHeroBanner.types';

const DASH = '—';

function num(value: number | null | undefined, unit: string, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return DASH;
  return `${value.toFixed(digits)} ${unit}`;
}

function hour(value: string | null | undefined): string {
  if (!value) return DASH;
  const parsed = new Date(value.length <= 5 ? `1970-01-01T${value}:00` : value);
  if (Number.isNaN(parsed.getTime())) return DASH;
  return parsed.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/** Devuelve la primera etiqueta cuyo umbral supera el valor real. */
function classify(
  value: number | null | undefined,
  steps: Array<[number, string]>,
): string | undefined {
  if (value === null || value === undefined || !Number.isFinite(value)) return undefined;
  const match = steps.find(([limit]) => value < limit);
  return match ? match[1] : steps[steps.length - 1][1];
}

/** Escala UV de la OMS; clasifica un valor real, no lo inventa. */
export function uvRiskLabel(uv: number | null | undefined): string | undefined {
  return classify(uv, [
    [3, 'Bajo'],
    [6, 'Moderado'],
    [8, 'Alto'],
    [11, 'Muy alto'],
    [Infinity, 'Extremo'],
  ]);
}

function rainMetric(r: WeatherRecord): WeatherMetricItem {
  const hint =
    r.precipitation_mm === 0
      ? 'Sin lluvia'
      : classify(r.precipitation_mm, [
          [2.5, 'Ligera'],
          [10, 'Moderada'],
          [Infinity, 'Fuerte'],
        ]);
  return {
    key: 'rain',
    label: 'Lluvia',
    value: num(r.precipitation_mm, 'mm', 1),
    hint,
    icon: CloudRain,
    tone: 'sky',
  };
}

function humidityMetric(r: WeatherRecord): WeatherMetricItem {
  return {
    key: 'humidity',
    label: 'Humedad',
    value: num(r.humidity_percent, '%'),
    hint: 'Riesgo de hongos y garrapata',
    icon: Droplets,
    tone: 'emerald',
  };
}

function windMetric(r: WeatherRecord): WeatherMetricItem {
  return {
    key: 'wind',
    label: 'Viento',
    value: num(r.wind_speed_kmh, 'km/h'),
    hint: classify(r.wind_speed_kmh, [
      [6, 'Calma'],
      [20, 'Brisa'],
      [39, 'Moderado'],
      [Infinity, 'Fuerte'],
    ]),
    icon: Wind,
    tone: 'slate',
  };
}

function uvMetric(r: WeatherRecord): WeatherMetricItem {
  const uv = r.uv_index;
  return {
    key: 'uv',
    label: 'Índice UV',
    value: uv === null || uv === undefined ? DASH : uv.toFixed(1),
    hint: uvRiskLabel(uv),
    icon: Sun,
    tone: 'amber',
  };
}

function feelsMetric(r: WeatherRecord): WeatherMetricItem {
  return {
    key: 'feels',
    label: 'Sensación',
    value: num(r.feels_like_celsius, '°C', 1),
    hint: 'Estrés calórico del ganado',
    icon: Thermometer,
    tone: 'rose',
  };
}

function daylightMetric(r: WeatherRecord): WeatherMetricItem {
  const hasDaylight = Boolean(r.sunrise_time || r.sunset_time);
  return {
    key: 'daylight',
    label: 'Jornada',
    value: hasDaylight ? `${hour(r.sunrise_time)} · ${hour(r.sunset_time)}` : DASH,
    hint: 'Amanecer y atardecer',
    icon: Sunrise,
    tone: 'violet',
  };
}

/**
 * Convierte una lectura real de Open-Meteo en las casillas del banner.
 * Devuelve `[]` cuando no hay registro: el banner muestra el estado vacío.
 */
export function buildWeatherMetrics(record: WeatherRecord | null): WeatherMetricItem[] {
  if (!record) return [];
  return [
    rainMetric(record),
    humidityMetric(record),
    windMetric(record),
    uvMetric(record),
    feelsMetric(record),
    daylightMetric(record),
  ];
}
