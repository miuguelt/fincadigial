import { getTodayColombia } from '@/shared/utils/dateUtils';

function yesterdayColombia(): string {
  const [y, m, d] = getTodayColombia().split('-').map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d));
  ref.setUTCDate(ref.getUTCDate() - 1);
  return ref.toISOString().split('T')[0];
}

/** Encabezado de grupo por fecha (labores): «Hoy», «Ayer» o fecha completa en es-CO. */
export function formatGroupDate(dateStr: string): string {
  if (dateStr === 'sin-fecha') return 'Sin fecha';
  if (dateStr === getTodayColombia()) return '📅 Hoy';
  if (dateStr === yesterdayColombia()) return '🕐 Ayer';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return '📆 ' + d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return dateStr; }
}

/** Etiqueta corta de registro (historial): «Hoy» o fecha abreviada en es-CO. */
export function formatRecordDate(value?: string): string {
  if (!value) return 'Sin fecha';
  const day = String(value).split('T')[0];
  if (day === getTodayColombia()) return 'Hoy';
  try {
    return new Date(day + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return day; }
}
