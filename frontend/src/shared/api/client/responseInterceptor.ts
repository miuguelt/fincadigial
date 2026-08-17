import { AxiosResponse } from 'axios';
import { getCookie } from '@/shared/utils/cookieUtils';
import { isValidTokenFormat } from '@/shared/utils/jwtUtils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';
import { normalizePath } from './authGate';
import { invalidateHttpCache } from './httpCache';
import { api } from './instances';
import { registerRateLimitBackoff } from './rateLimit';
import { persistStoredToken } from './session';
import { DEBUG_LOG } from './settings';
import { isCsrfError } from './tokenRefresh';
import {
  classifyTransportError,
  handleTerminalFailure,
  retryTransportError,
} from './transportFailure';
import { handleUnauthorized } from './unauthorizedFlow';

/** Registra en depuración los encabezados PWA que devuelve el backend. */
function logPwaHeaders(response: AxiosResponse): void {
  if (!DEBUG_LOG || !response.headers) return;
  const pwHeaders = {
    etag: response.headers['etag'] || response.headers['ETag'],
    lastModified: response.headers['last-modified'] || response.headers['Last-Modified'],
    cacheControl: response.headers['cache-control'] || response.headers['Cache-Control'],
    cacheStrategy: response.headers['x-cache-strategy'] || response.headers['X-Cache-Strategy'],
    totalCount: response.headers['x-total-count'] || response.headers['X-Total-Count'],
    hasMore: response.headers['x-has-more'] || response.headers['X-Has-More'],
  };

  // Log solo si hay headers PWA presentes
  const hasPWAHeaders = Object.values(pwHeaders).some(v => v !== undefined);
  if (hasPWAHeaders) {
    const path = normalizePath(response.config?.url as any);
    console.debug(`[api][PWA] ${path} headers:`, pwHeaders);
  }
}

function onFulfilled(response: AxiosResponse): AxiosResponse {
  const method = String(response.config?.method || '').toUpperCase();
  const path = normalizePath(response.config?.url as any);

  // Toda escritura exitosa invalida el cache HTTP y notifica a las dos
  // capas de UI, incluso cuando el módulo llamó a `api` directamente.
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    void invalidateHttpCache().finally(() => {
      emitDataRefresh(path || undefined);
    });
  }

  // Leer y exponer headers PWA relevantes
  logPwaHeaders(response);

  // Confiar en cookies HttpOnly; devolver respuesta
  // Si es un cambio de finca, persistir el nuevo token recibido
  try {
    if (path.includes('multi-finca/switch')) {
      const token = response.data?.data?.access_token || response.data?.access_token;
      if (token && isValidTokenFormat(token)) {
        persistStoredToken(token);
        if (DEBUG_LOG) console.log('[api][switch] Nuevo token de finca persistido:', token);
      }
    }
  } catch (e) {
    if (DEBUG_LOG) console.warn('[api] Error persistiendo token de cambio de finca:', e);
  }

  return response;
}

/** Reintento único cuando el backend rechaza por CSRF y la cookie ya cambió. */
function retryAfterCsrfError(error: any, originalRequest: any): Promise<AxiosResponse> | null {
  if (!isCsrfError(error) || originalRequest._csrfRetry) return null;
  originalRequest._csrfRetry = true;
  const csrf = getCookie('csrf_access_token');
  if (!csrf) return null;

  if (DEBUG_LOG) console.log('[api] CSRF error detectado, reintentando con nueva cookie');
  if (originalRequest.headers) {
    originalRequest.headers['X-CSRF-Token'] = csrf;
    originalRequest.headers['X-CSRF-TOKEN'] = csrf;
  }
  return api(originalRequest);
}

async function onRejected(error: any): Promise<AxiosResponse> {
  const originalRequest = error?.config || {};
  const status = error?.response?.status;
  const path = normalizePath(originalRequest?.url as any);

  if (status === 429) {
    registerRateLimitBackoff(error, path);
  }

  // Evitar recursión
  if (!originalRequest._retry) originalRequest._retry = false;

  // No intentar refresh en login o en el propio refresh
  const isAuthLogin = path.startsWith('auth/login');
  const isAuthRefresh = path.startsWith('auth/refresh');
  if (status === 401 && (isAuthLogin || isAuthRefresh)) {
    if (DEBUG_LOG) console.log('[api] 401 en ruta de auth sin refresh:', path);
    return Promise.reject(error);
  }

  if (status === 401) {
    return handleUnauthorized(error, originalRequest, path);
  }

  const csrfRetry = retryAfterCsrfError(error, originalRequest);
  if (csrfRetry) return csrfRetry;

  const diagnosis = classifyTransportError(error, originalRequest);
  const transportRetry = await retryTransportError(originalRequest, diagnosis);
  if (transportRetry) return transportRetry;

  if (!diagnosis.aborted) {
    return handleTerminalFailure(error, originalRequest, path, diagnosis);
  }

  return Promise.reject(error);
}

/** Interceptor de respuesta: refresh, ETags, reintentos y política de errores. */
export function installResponseInterceptor(): void {
  api.interceptors.response.use(onFulfilled, onRejected);
}
