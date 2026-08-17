import { getCookie } from '@/shared/utils/cookieUtils';
import {
  AUTH_SESSION_ACTIVE_KEY,
  AUTH_STATE_KEYS,
  AUTH_STORAGE_KEY,
  SESSION_COOKIE_CANDIDATES,
  SESSION_STORAGE_KEYS,
  USE_BEARER_AUTH,
  logDebugError,
} from './settings';

/**
 * Lectura y limpieza del estado de sesión guardado en el navegador.
 */
export function hasClientSession(): boolean {
  // Enforce re-authentication after a browser restart: only consider a session valid if the app
  // explicitly marked it as active during this browser session.
  try {
    if (typeof sessionStorage !== 'undefined') {
      const active = sessionStorage.getItem(AUTH_SESSION_ACTIVE_KEY);
      if (active !== '1') return false;
    }
  } catch { /* noop */ }

  try {
    if (typeof localStorage !== 'undefined') {
      for (const key of SESSION_STORAGE_KEYS) {
        const value = localStorage.getItem(key);
        if (value && value.trim().length) return true;
      }
    }
  } catch { /* noop */ }
  try {
    if (typeof sessionStorage !== 'undefined') {
      for (const key of SESSION_STORAGE_KEYS) {
        const value = sessionStorage.getItem(key);
        if (value && value.trim().length) return true;
      }
    }
  } catch { /* noop */ }
  try {
    return SESSION_COOKIE_CANDIDATES.some((name) => {
      try { return !!getCookie(name); } catch { return false; }
    });
  } catch {
    return false;
  }
}

export const readStoredToken = (): string | null => {
  if (!USE_BEARER_AUTH) return null;
  try {
    if (typeof localStorage !== 'undefined') {
      const tok = localStorage.getItem(AUTH_STORAGE_KEY);
      return tok && tok.trim().length ? tok : null;
    }
  } catch (storageError) {
    logDebugError('[api] No se pudo leer token desde localStorage', storageError);
  }
  return null;
};

export const persistStoredToken = (token: string): void => {
  if (!USE_BEARER_AUTH) return;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_STORAGE_KEY, token); } catch { /* noop */ }
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(AUTH_STORAGE_KEY, token); } catch { /* noop */ }
};

export function clearClientTokens(): void {
  const keys = new Set([...SESSION_STORAGE_KEYS, ...AUTH_STATE_KEYS]);
  for (const key of keys) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch (storageError) {
      logDebugError('[api] No se pudo limpiar localStorage', storageError);
    }
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    } catch (storageError) {
      logDebugError('[api] No se pudo limpiar sessionStorage', storageError);
    }
  }
}
