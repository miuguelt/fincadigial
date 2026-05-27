import { getCookie } from '@/shared/utils/cookieUtils';
import { extractJWT } from '@/shared/utils/tokenUtils';
import { isValidTokenFormat } from '@/shared/utils/jwtUtils';
// import { API_CONFIG } from './config';
import { refreshClient, setCsrfHeaders } from './base-client';
import { isCsrfError } from './auth-error-handler';
import { persistStoredToken } from './auth-utils';

export let refreshPromise: Promise<void> | null = null;

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

