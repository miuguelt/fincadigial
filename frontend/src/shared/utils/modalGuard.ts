/**
 * DevBrain Modal Guard
 *
 * Previene el fenómeno de "click-through" (colisión de eventos de mouse)
 * que ocurre cuando un modal se cierra y el evento `pointerup`/`click` de liberación
 * del mouse alcanza elementos interactivos en el fondo (filas de tabla, tarjetas, botones).
 */

const DIALOG_CLOSING_TIMESTAMP_KEY = '__vl_last_dialog_close_time__';
const DEFAULT_COOLDOWN_MS = 250;

/**
 * Registra el instante de cierre de un modal.
 */
export function markDialogClosing(): void {
  if (typeof window === 'undefined') return;
  (window as any)[DIALOG_CLOSING_TIMESTAMP_KEY] = Date.now();
}

/**
 * Determina si un diálogo se ha cerrado recientemente (dentro de la ventana de cooldown).
 * Útil para proteger manejadores de clic en filas, tarjetas o enlaces disparadores.
 *
 * @param cooldownMs Tiempo en milisegundos de gracia (por defecto 250ms).
 */
export function isDialogClosingRecently(cooldownMs: number = DEFAULT_COOLDOWN_MS): boolean {
  if (typeof window === 'undefined') return false;
  const lastClose = Number((window as any)[DIALOG_CLOSING_TIMESTAMP_KEY] || 0);
  if (!lastClose) return false;
  const elapsed = Date.now() - lastClose;
  return elapsed >= 0 && elapsed < cooldownMs;
}
