import { logDebugError } from './settings';

/**
 * Backoff por endpoint cuando el servidor responde 429.
 *
 * Mientras el backoff esté activo, el GET con caché sirve el dato guardado en
 * vez de insistir contra un servidor que ya rechazó la ráfaga.
 */
const rateLimitBackoff = new Map<string, number>();

/** Momento (epoch ms) hasta el que este endpoint está en backoff; 0 si no lo está. */
export const getRateLimitBackoffUntil = (path: string): number => rateLimitBackoff.get(path) || 0;

const toInt = (v: any): number | undefined => {
  if (v == null) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const n = parseInt(String(s), 10);
  return Number.isNaN(n) ? undefined : n;
};

/**
 * El backend puede reportar la espera en `retry_after_seconds` o `retry_after`,
 * como número o como texto. Se consulta el segundo campo sólo cuando el primero
 * no viene, igual que antes de extraer este módulo.
 */
const readRetryAfterSeconds = (primary: any, fallback: any): number | undefined => {
  if (typeof primary === 'number') return primary;
  if (typeof primary === 'string') return toInt(primary);
  if (typeof fallback === 'number') return fallback;
  if (typeof fallback === 'string') return toInt(fallback);
  return undefined;
};

/** Notifica el 429 a la aplicación y registra el backoff del endpoint. */
export function registerRateLimitBackoff(error: any, path: string): void {
  const status = error?.response?.status;
  try {
    const detail = {
      event: 'RATE_LIMIT_EXCEEDED',
      endpoint: path,
      status,
      message: error?.response?.data?.message || error?.message || 'Demasiadas solicitudes',
      timestamp: new Date().toISOString(),
    };
    const data = error?.response?.data ?? {};
    const d0 = (data?.error && data?.error?.details) ? data.error.details : undefined;
    const d1 = (!d0 && data?.details) ? data.details : d0 ?? data?.details;
    const bodyRetryAfterSeconds = d1?.retry_after_seconds;
    const bodyRetryAfter = d1?.retry_after;
    if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
      const waitCandidate = bodyRetryAfterSeconds ?? bodyRetryAfter;
      let waitSeconds: number | undefined;
      if (typeof waitCandidate === 'number' && Number.isFinite(waitCandidate) && waitCandidate > 0) {
        waitSeconds = waitCandidate;
      } else if (typeof waitCandidate === 'string') {
        const n = parseInt(waitCandidate, 10);
        waitSeconds = Number.isNaN(n) ? undefined : n;
      }
      const evtDetail = { ...detail, waitSeconds };
      window.dispatchEvent(new CustomEvent('rate-limit-exceeded', { detail: evtDetail }));
    }
    try {
      const headers = error?.response?.headers ?? {} as Record<string, any>;
      const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
      const rlReset = headers['ratelimit-reset'] ?? headers['RateLimit-Reset'];
      let delayMs = 30000; // 30s por defecto
      const bodySecs = readRetryAfterSeconds(bodyRetryAfterSeconds, bodyRetryAfter);
      const headerSecs = toInt(retryAfter);
      if (bodySecs != null) {
        delayMs = Math.max(bodySecs * 1000, 5000);
      } else if (headerSecs != null) {
        delayMs = Math.max(headerSecs * 1000, 5000);
      } else {
        const resetSecs = toInt(rlReset);
        if (resetSecs != null) {
          const nowSecs = Math.floor(Date.now() / 1000);
          delayMs = Math.max((resetSecs - nowSecs) * 1000, 5000);
        }
      }
      try {
        rateLimitBackoff.set(path, Date.now() + delayMs);
      } catch (backoffError) {
        logDebugError('[api] No se pudo registrar backoff de rate limit', backoffError);
      }
    } catch (rlError) {
      logDebugError('[api] No se pudo procesar cabeceras de rate limit', rlError);
    }
  } catch (notifyError) {
    logDebugError('[api] No se pudo despachar evento de rate limit', notifyError);
  }
}
