/**
 * Códigos WMO de Open-Meteo traducidos y agrupados.
 *
 * Vive en `entities` porque tanto la página del campesino como los widgets del
 * dashboard necesitan la misma traducción; duplicarla hacía que un código nuevo
 * se describiera distinto en cada pantalla.
 */
export const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna ligera',
  53: 'Llovizna moderada',
  55: 'Llovizna densa',
  61: 'Lluvia ligera',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  71: 'Nieve ligera',
  73: 'Nieve moderada',
  75: 'Nieve intensa',
  77: 'Granizo',
  80: 'Chubascos ligeros',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  85: 'Chubascos de nieve',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta',
  96: 'Tormenta con granizo',
  99: 'Tormenta con granizo intenso',
};

/** Familia de condición usada para elegir icono y paleta. */
export type WeatherConditionKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'unknown';

/** Texto que se muestra cuando no hay condición ni código que traducir. */
const NO_DATA = 'Sin dato';

export function getWmoDescription(code: number | null | undefined): string {
  if (code === null || code === undefined) return NO_DATA;
  return WMO_DESCRIPTIONS[code] || NO_DATA;
}

/**
 * Condición meteorológica en español.
 *
 * El backend guarda `weather_condition` en inglés (`"cloudy"`, `"storm"`) y las
 * pantallas la pintaban tal cual bajo la temperatura. Se traduce aquí; si el
 * valor no está en la tabla se prefiere el código WMO, que sí está traducido, y
 * sólo se devuelve el texto original cuando ya viene en español.
 */
const CONDITION_LABELS: Record<string, string> = {
  clear: 'Despejado',
  sunny: 'Despejado',
  partly: 'Parcialmente nublado',
  partly_cloudy: 'Parcialmente nublado',
  cloudy: 'Nublado',
  overcast: 'Nublado',
  fog: 'Niebla',
  drizzle: 'Llovizna',
  rain: 'Lluvia',
  showers: 'Chubascos',
  storm: 'Tormenta',
  thunderstorm: 'Tormenta',
  snow: 'Nieve',
  hail: 'Granizo',
};

export function describeCondition(
  condition: string | null | undefined,
  code: number | null | undefined,
): string {
  const raw = (condition || '').trim();
  const translated = CONDITION_LABELS[raw.toLowerCase()];
  if (translated) return translated;

  const fromCode = getWmoDescription(code);
  if (fromCode !== NO_DATA) return fromCode;

  return raw || NO_DATA;
}

/** Rangos WMO agrupados por familia, en el orden en que deben evaluarse. */
const KIND_RANGES: Array<{ min: number; max: number; kind: WeatherConditionKind }> = [
  { min: 0, max: 0, kind: 'clear' },
  { min: 1, max: 2, kind: 'partly' },
  { min: 3, max: 3, kind: 'cloudy' },
  { min: 45, max: 48, kind: 'fog' },
  { min: 51, max: 57, kind: 'drizzle' },
  { min: 61, max: 67, kind: 'rain' },
  { min: 71, max: 77, kind: 'snow' },
  { min: 80, max: 82, kind: 'rain' },
  { min: 85, max: 86, kind: 'snow' },
  { min: 95, max: 99, kind: 'storm' },
];

export function getWeatherKind(code: number | null | undefined): WeatherConditionKind {
  if (typeof code !== 'number') return 'unknown';
  const match = KIND_RANGES.find((range) => code >= range.min && code <= range.max);
  return match ? match.kind : 'unknown';
}
