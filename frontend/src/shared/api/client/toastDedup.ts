import { toast } from '@/shared/hooks/use-toast';
import { TOAST_DEDUP_MS } from './settings';

const toastRecent = new Map<string, number>();

/**
 * Muestra un toast a lo sumo una vez por ventana de deduplicación.
 *
 * Una ráfaga de peticiones fallidas comparte causa: mostrar un aviso por cada
 * una tapaba la pantalla en zonas sin cobertura.
 */
export const showToastOnce = (key: string, options: Parameters<typeof toast>[0]): void => {
  const now = Date.now();
  const last = toastRecent.get(key) || 0;
  if (now - last < TOAST_DEDUP_MS) return;
  toastRecent.set(key, now);
  toast(options);
};
