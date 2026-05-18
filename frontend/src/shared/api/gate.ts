import { InternalAxiosRequestConfig } from 'axios';
import { refreshClient, normalizePath, isPublicEndpoint } from './base-client';
import { API_CONFIG, AUTH_SESSION_ACTIVE_KEY } from './config';

export type AuthGateState = 'unknown' | 'checking' | 'ready' | 'unauthenticated';

export let authGateState: AuthGateState = 'unknown';
let authGatePromise: Promise<void> | null = null;

export function setAuthGateState(state: AuthGateState) {
  if (API_CONFIG.debugMode) console.log(`[api][gate] Estado actualizado externamente a: ${state}`);
  authGateState = state;
}

export function shouldSkipGate(config: InternalAxiosRequestConfig): boolean {
  if ((config as any).__skipAuthGate) return true;
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'options' || method === 'head') return true;
  if (config.url && /^(https?:)?\/\//i.test(String(config.url))) return true;
  const path = normalizePath(config.url as any);
  return isPublicEndpoint(path);
}

export async function ensureAuthReady(): Promise<void> {
  if (authGateState === 'ready' || authGateState === 'unauthenticated') return;
  
  // SILENCIO: Si no hay intención de sesión (flag en LS), no disparamos errores 401 innecesarios
  const hasSessionHint = localStorage.getItem(AUTH_SESSION_ACTIVE_KEY) === '1';
  if (!hasSessionHint) {
    authGateState = 'unauthenticated';
    return;
  }

  if (authGatePromise) return authGatePromise;

  authGateState = 'checking';
  authGatePromise = (async () => {
    try {
      if (API_CONFIG.debugMode) console.log('[api][gate] Iniciando comprobación /auth/me ...');
      let resp: any;
      try {
        resp = await refreshClient.get('/auth/me', {
          headers: { 'Accept': 'application/json' },
        });
      } catch (e: any) {
        const st = e?.response?.status ?? 0;
        if (API_CONFIG.debugMode) console.warn('[api][gate] /auth/me error inicial:', st, e?.message);
        if (st === 401) {
          try {
            if (API_CONFIG.debugMode) console.log('[api][gate] 401 en /auth/me, intentando /auth/refresh ...');
            await refreshClient.post('/auth/refresh');
            if (API_CONFIG.debugMode) console.log('[api][gate] Refresh OK. Reintentando /auth/me ...');
            resp = await refreshClient.get('/auth/me', { headers: { 'Accept': 'application/json' } });
          } catch (e2: any) {
            const st2 = e2?.response?.status ?? 0;
            if (API_CONFIG.debugMode) console.warn('[api][gate] Refresh + /auth/me reintento falló:', st2, e2?.message);
            throw e2; 
          }
        } else {
          throw e;
        }
      }
      const st = resp?.status ?? 0;
      if (API_CONFIG.debugMode) console.log('[api][gate] /auth/me status:', st);
      if (st === 200) authGateState = 'ready';
      else if (st === 401) authGateState = 'unauthenticated';
      else authGateState = 'ready'; 
    } catch (e: any) {
      const st = e?.response?.status ?? 0;
      if (API_CONFIG.debugMode) console.warn('[api][gate] /auth/me error tras reintentos:', st, e?.message);
      if (st === 401) authGateState = 'unauthenticated';
      else authGateState = 'ready'; 
    } finally {
      if (API_CONFIG.debugMode) console.log('[api][gate] Finalizado. Estado =', authGateState);
      authGatePromise = null;
    }
  })();

  return authGatePromise;
}

