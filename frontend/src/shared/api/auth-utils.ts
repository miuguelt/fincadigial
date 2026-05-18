import { getCookie } from '@/shared/utils/cookieUtils';
import { toast } from "@/shared/hooks/use-toast";
import { 
  API_CONFIG, 
  AUTH_SESSION_ACTIVE_KEY, 
  SESSION_STORAGE_KEYS, 
  SESSION_COOKIE_CANDIDATES,
  AUTH_STATE_KEYS
} from './config';
import { AUTH_STORAGE_KEY } from '../constants/core';

const toastRecent = new Map<string, number>();

export const showToastOnce = (key: string, options: Parameters<typeof toast>[0]) => {
  const now = Date.now();
  const last = toastRecent.get(key) || 0;
  if (now - last < API_CONFIG.toastDedupMs) return;
  toastRecent.set(key, now);
  toast(options);
};

export const hasClientSession = (): boolean => {
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem(AUTH_SESSION_ACTIVE_KEY) !== '1') return false;
    }
  } catch { /* noop */ }

  try {
    const keys = [...SESSION_STORAGE_KEYS];
    for (const key of keys) {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(key)?.trim().length) return true;
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)?.trim().length) return true;
    }
  } catch { /* noop */ }

  return SESSION_COOKIE_CANDIDATES.some(name => {
    try { return !!getCookie(name); } catch { return false; }
  });
};

export const readStoredToken = (): string | null => {
  try {
    const storageKey = API_CONFIG?.authStorageKey || AUTH_STORAGE_KEY;
    // Intentar leer de múltiples fuentes para máxima resiliencia
    return localStorage.getItem(storageKey) || 
           localStorage.getItem('access_token') || 
           sessionStorage.getItem(storageKey) ||
           sessionStorage.getItem('access_token');
  } catch {
    return null;
  }
};

export const persistStoredToken = (token: string): void => {
  try {
    if (!token) return;
    const storageKey = API_CONFIG?.authStorageKey || AUTH_STORAGE_KEY;
    localStorage.setItem(storageKey, token);
    localStorage.setItem('access_token', token);
    sessionStorage.setItem(storageKey, token);
    sessionStorage.setItem('access_token', token);
  } catch { /* noop */ }
};

export const clearClientTokens = () => {
  const keys = new Set([...SESSION_STORAGE_KEYS, ...AUTH_STATE_KEYS]);
  keys.forEach(key => {
    try { localStorage.removeItem(key); } catch { /* noop */ }
    try { sessionStorage.removeItem(key); } catch { /* noop */ }
  });
};

export async function callBackendLogout(logoutUrl?: string) {
  const target = logoutUrl && /^https?:\/\//i.test(logoutUrl)
    ? logoutUrl
    : `${API_CONFIG.baseURL?.replace(/\/$/, '') || ''}${logoutUrl
      ? logoutUrl.startsWith('/') ? logoutUrl : `/${logoutUrl}`
      : '/auth/logout'}`;
  try {
    await fetch(target, { method: 'POST', credentials: 'include', headers: { 'Accept': 'application/json' } });
  } catch (err) {
    if (API_CONFIG.debugMode) console.warn('[api] Logout fetch falló:', err);
  }
}

let forceLogoutPromise: Promise<void> | null = null;

export async function forceClientLogout(reason = 'expired', options?: { logoutUrl?: string; loginUrl?: string }) {
  if (forceLogoutPromise) return forceLogoutPromise;
  forceLogoutPromise = (async () => {
    clearClientTokens();
    await callBackendLogout(options?.logoutUrl);
    if (typeof window !== 'undefined') {
      const loginPath = options?.loginUrl || API_CONFIG.loginPath || '/login';
      const loginUrl = new URL(loginPath, window.location.origin);
      loginUrl.searchParams.set('reason', reason);
      const target = loginUrl.toString();
      
      const willRedirect = window.location.pathname !== loginUrl.pathname;

      if (reason === 'expired' && !willRedirect) {
        showToastOnce('session-expired', {
          title: "Sesión expirada",
          description: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
          variant: "destructive",
        });
      }
      
      if (willRedirect) {
        window.location.assign(target);
      }
    }
  })().finally(() => { forceLogoutPromise = null; });
  return forceLogoutPromise;
}

