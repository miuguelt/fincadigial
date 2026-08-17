import { InternalAxiosRequestConfig } from 'axios';
import { getCookie } from '@/shared/utils/cookieUtils';
import { shouldRefreshToken } from '@/shared/utils/jwtUtils';
import { toRelativeApiPath } from '../urlUtils';
import { ensureAuthReady, isPublicEndpoint, normalizePath, shouldSkipGate } from './authGate';
import { MutableHeaders, ensureJsonHeaders, setAuthHeader, setCsrfHeaders } from './headers';
import { api, refreshClient } from './instances';
import { readStoredToken } from './session';
import { DEBUG_LOG, USE_BEARER_AUTH } from './settings';
import { getPendingRefresh, performRefresh } from './tokenRefresh';

/**
 * Encabezados de salida: gate de autenticación, Authorization y CSRF según el
 * endpoint destino.
 */
const skipsAuthHeader = (config: InternalAxiosRequestConfig, path: string): boolean =>
  isPublicEndpoint(path) ||
  (config as any).skipAuth === true ||
  (config as any).disableAuth === true ||
  (config as any).__skipAuthHeader === true;

export function installRequestInterceptors(): void {
  // Interceptor de solicitud: añadir encabezado CSRF adecuado y aplicar gate
  api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      try {
        // Canonical relative path (strips nested absolute bases /api/v1/http://...)
        if (config.url) {
          config.url = toRelativeApiPath(config.url);
        }

        // Gate global: si el endpoint requiere autenticación, esperar a /auth/me
        if (!shouldSkipGate(config)) {
          await ensureAuthReady();
        }

        const path = normalizePath(config.url as any);
        const isAuthLogin = path.startsWith('auth/login');
        const isAuthRefresh = path.startsWith('auth/refresh');
        const isAuthMe = path.startsWith('auth/me');

        const pendingRefresh = getPendingRefresh();
        if (pendingRefresh && !isAuthRefresh) {
          await pendingRefresh;
        }

        const skipAuthHeader = skipsAuthHeader(config, path);

        // Log de depuración para requests a /animals
        if (path.startsWith('animals') && config.method?.toLowerCase() === 'post') {
          if (DEBUG_LOG) console.log('[API][debug] POST /animals payload:', JSON.stringify(config.data, null, 2));
        }

        const headers = (config as any).headers as MutableHeaders | undefined;
        if (headers) {
          ensureJsonHeaders(headers, config.data);

          const shouldAttachAuth = !skipAuthHeader && !isAuthLogin && !isAuthRefresh;
          // Añadir Authorization Bearer si existe token y no es login/refresh ni endpoint público/forzado
          const token = readStoredToken();
          setAuthHeader(headers, shouldAttachAuth, token);

          const hasAccessCsrf = !!getCookie('csrf_access_token');
          const hasRefreshCsrf = !!getCookie('csrf_refresh_token');
          const isProtected = (!isPublicEndpoint(path) || isAuthMe) && !skipAuthHeader;
          if (!isAuthLogin && !isAuthRefresh && !isAuthMe && isProtected) {
            if (USE_BEARER_AUTH && token && shouldRefreshToken(token)) {
              await performRefresh({ retryOnCsrfError: true });
            } else if (!hasAccessCsrf && hasRefreshCsrf) {
              await performRefresh({ retryOnCsrfError: true });
            }
          }

          // Añadir CSRF desde cookies legibles según el endpoint
          if (isAuthRefresh) {
            const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
            setCsrfHeaders(headers, csrfRefresh);
            if (DEBUG_LOG) {
              console.debug('[api][req] /auth/refresh CSRF refresh presente:', !!csrfRefresh, 'auth header:', !!headers['Authorization']);
            }
          } else if (isProtected) {
            const csrfAccess = getCookie('csrf_access_token') ?? undefined;
            setCsrfHeaders(headers, csrfAccess);
            if (DEBUG_LOG) {
              console.debug('[api][req]', path, 'CSRF access presente:', !!csrfAccess, 'auth header:', !!headers['Authorization']);
            }
          } else if (DEBUG_LOG) {
            console.debug('[api][req] endpoint público/skip gate:', path);
          }
        }
      } catch (e) {
        if (DEBUG_LOG) console.warn('[api] Error en interceptor de solicitud:', e);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Interceptor de solicitud para refreshClient: asegura CSRF en /auth/refresh y /auth/me
  refreshClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      try {
        if (config.url) {
          config.url = toRelativeApiPath(config.url);
        }

        const path = normalizePath(config.url as any);
        const skipAuthHeader = skipsAuthHeader(config, path);
        const headers = (config as any).headers as MutableHeaders | undefined;
        if (headers) {
          ensureJsonHeaders(headers, config.data);

          // Añadir Authorization si no es /auth/refresh; este endpoint usa solo cookies
          const token = readStoredToken();
          const shouldAttachAuth = !skipAuthHeader && !path.startsWith('auth/refresh');
          setAuthHeader(headers, shouldAttachAuth, token);
          if (path.startsWith('auth/refresh') && headers['Authorization']) {
            delete headers['Authorization'];
          }
          if (path.startsWith('auth/refresh')) {
            const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
            setCsrfHeaders(headers, csrfRefresh);
          } else if (path.startsWith('auth/me')) {
            const csrfAccess = getCookie('csrf_access_token') ?? undefined;
            setCsrfHeaders(headers, csrfAccess);
          }
        }
      } catch (e) {
        if (DEBUG_LOG) console.warn('[refreshClient] Error en interceptor de solicitud:', e);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
}
