import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from './config';

// Asegurar credenciales en todas las llamadas axios (cookies/CSRF)
axios.defaults.withCredentials = true;

// Cliente principal con credenciales habilitadas (cookies)
export const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: true,
});

// Cliente para refresh (sin Authorization explícito)
export const refreshClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.refreshTimeout,
  withCredentials: true,
});

export type MutableHeaders = Record<string, any>;
export const CSRF_HEADER_KEYS = ['X-CSRF-Token', 'X-CSRF-TOKEN'] as const;

export const isFormDataPayload = (data: unknown): boolean =>
  typeof FormData !== 'undefined' && data instanceof FormData;

export const ensureJsonHeaders = (headers: MutableHeaders, data: unknown): void => {
  headers['Accept'] = 'application/json';
  if (!isFormDataPayload(data)) {
    headers['Content-Type'] = 'application/json';
  }
};

export const setCsrfHeaders = (headers: MutableHeaders, token?: string): void => {
  if (!token) return;
  for (const key of CSRF_HEADER_KEYS) {
    headers[key] = token;
  }
};

export const setAuthHeader = (headers: MutableHeaders, shouldAttach: boolean, token?: string | null): void => {
  if (!API_CONFIG.useBearerAuth) {
    if (headers['Authorization']) delete headers['Authorization'];
    return;
  }
  if (shouldAttach && token) {
    headers['Authorization'] = `Bearer ${token}`;
    return;
  }
  if (!shouldAttach && headers['Authorization']) {
    delete headers['Authorization'];
  }
};

export function normalizePath(url?: string): string {
  if (!url) return '';
  try {
    let u = String(url).trim();
    const q = u.indexOf('?');
    if (q >= 0) u = u.slice(0, q);
    const h = u.indexOf('#');
    if (h >= 0) u = u.slice(0, h);
    u = u.replace(/^https?:\/\/.+?(\/api\/v\d+\/)/i, '');
    u = u.replace(/^\/?/, '');
    return u.toLowerCase();
  } catch {
    return '';
  }
}

export function isPublicEndpoint(path: string): boolean {
  if (!path) return true;
  if (path.startsWith('auth/me')) return false;
  if (path.startsWith('auth/logout')) return false;
  if (path.startsWith('auth/')) return true;
  if (path === 'health' || path.endsWith('/health')) return true;
  if (path === 'users/public' || path.endsWith('/users/public')) return true;
  return false;
}

