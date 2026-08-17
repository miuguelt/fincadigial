import { getCookie } from '@/shared/utils/cookieUtils';
import { isValidTokenFormat } from '@/shared/utils/jwtUtils';
import { extractJWT } from '@/shared/utils/tokenUtils';
import { setCsrfHeaders } from './headers';
import { refreshClient } from './instances';
import { persistStoredToken } from './session';

/**
 * Renovación del token de acceso con mutex global: varias respuestas 401
 * simultáneas comparten una sola llamada a /auth/refresh.
 */
let refreshPromise: Promise<void> | null = null;

/** Promesa de refresh en curso, o null. La usa el interceptor de solicitud. */
export const getPendingRefresh = (): Promise<void> | null => refreshPromise;

export function isCsrfError(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const text = (data?.code || data?.error || data?.detail || data?.message || '').toString();
  const upper = text.toUpperCase();
  // Algunos backends reportan 400/403 para CSRF faltante; contemplar 401/400/403 y mensajes con "CSRF"
  return (status === 401 || status === 400 || status === 403) && upper.includes('CSRF');
}

export async function performRefresh(options?: { retryOnCsrfError?: boolean }): Promise<void> {
  if (refreshPromise) return refreshPromise;
  const doRefresh = async () => {
    const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
    const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    setCsrfHeaders(headers, csrfRefresh);
    try {
      const resp = await refreshClient.post('/auth/refresh', null, { headers });
      const candidate = extractJWT(resp?.data);
      if (candidate && isValidTokenFormat(candidate)) {
        persistStoredToken(candidate);
      }
    } catch (err: any) {
      if (options?.retryOnCsrfError && isCsrfError(err)) {
        // Releer cookie y reintentar una sola vez
        const retryCsrf = getCookie('csrf_refresh_token') ?? undefined;
        const retryHeaders: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        setCsrfHeaders(retryHeaders, retryCsrf);
        const retryResp = await refreshClient.post('/auth/refresh', null, { headers: retryHeaders });
        const retryCandidate = extractJWT(retryResp?.data);
        if (retryCandidate && isValidTokenFormat(retryCandidate)) {
          persistStoredToken(retryCandidate);
        }
      } else {
        throw err;
      }
    }
  };
  refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}
