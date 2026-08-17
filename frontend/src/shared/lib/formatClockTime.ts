/**
 * Hora del día en español de Colombia: `6:12 a. m.`
 *
 * El backend del clima envía la hora de tres formas —`"06:12"`, `"06:12:00"` y
 * una marca ISO completa— y `new Date("06:12:00")` es `Invalid Date`. Por eso
 * el banner de la finca mostraba "— · —" en amanecer y atardecer aunque el
 * dato sí venía.
 *
 * Se arma a mano en vez de con `toLocaleTimeString` para que el resultado no
 * dependa de la versión de ICU: en Node sin datos completos de locale la misma
 * llamada devuelve otro texto que en el navegador, y las pruebas dejan de
 * significar algo.
 */

/** `"06:12"`, `"06:12:00"` o `"2026-08-15T06:12:00"` → `[hora, minuto]`. */
function parseParts(value: string): [number, number] | null {
  const bare = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (bare) return [Number(bare[1]), Number(bare[2])];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return [parsed.getHours(), parsed.getMinutes()];
}

export function formatClockTime(value: string | null | undefined): string | null {
  if (!value) return null;

  const parts = parseParts(value);
  if (!parts) return null;

  const [hours, minutes] = parts;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const suffix = hours < 12 ? 'a. m.' : 'p. m.';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

export default formatClockTime;
