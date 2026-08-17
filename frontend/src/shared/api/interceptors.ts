import  { InternalAxiosRequestConfig, AxiosResponse, isCancel } from 'axios';
import { getCookie } from '@/shared/utils/cookieUtils';
import { shouldRefreshToken } from '@/shared/utils/jwtUtils';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { ApiFetchError, readStandardErrorPayload, formatMessageFromCode } from './error-parser';
import { API_CONFIG } from './config';
import { api, refreshClient, MutableHeaders, ensureJsonHeaders, setAuthHeader, setCsrfHeaders, normalizePath, isPublicEndpoint } from './base-client';
import { readStoredToken, hasClientSession, forceClientLogout, showToastOnce } from './auth-utils';
import { shouldSkipGate, ensureAuthReady } from './gate';
import { performRefresh, refreshPromise } from './refresh';
import { isCsrfError, shouldForceLogout } from './auth-error-handler';
import { toRelativeApiPath } from './urlUtils';
// import { readCache } from './cache-manager';

export const rateLimitBackoff = new Map<string, number>();

export const setupInterceptors = (instance: typeof api) => {
  instance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      if (config.url) {
        config.url = toRelativeApiPath(config.url);
      }

      if (!shouldSkipGate(config)) {
        await ensureAuthReady();
      }

      const path = normalizePath(config.url as any);
      const isAuthLogin = path.startsWith('auth/login');
      const isAuthRefresh = path.startsWith('auth/refresh');
      const isAuthMe = path.startsWith('auth/me');

      if (refreshPromise && !isAuthRefresh) {
        await refreshPromise;
      }

      const skipAuthHeader =
        isPublicEndpoint(path) ||
        (config as any).skipAuth === true ||
        (config as any).disableAuth === true ||
        (config as any).__skipAuthHeader === true;

      if (path.startsWith('animals') && config.method?.toLowerCase() === 'post') {
        if (API_CONFIG.debugMode) console.log('[API][debug] POST /animals payload:', JSON.stringify(config.data, null, 2));
      }

      const headers = (config as any).headers as MutableHeaders | undefined;
      if (headers) {
        ensureJsonHeaders(headers, config.data);

        const shouldAttachAuth = !skipAuthHeader && !isAuthLogin && !isAuthRefresh;
        const token = readStoredToken();
        setAuthHeader(headers, shouldAttachAuth, token);

        const hasAccessCsrf = !!getCookie('csrf_access_token');
        const hasRefreshCsrf = !!getCookie('csrf_refresh_token');
        const isProtected = (!isPublicEndpoint(path) || isAuthMe) && !skipAuthHeader;

        if (!isAuthLogin && !isAuthRefresh && !isAuthMe && isProtected) {
          if (API_CONFIG.useBearerAuth && token && shouldRefreshToken(token)) {
            await performRefresh({ retryOnCsrfError: true });
          } else if (!hasAccessCsrf && hasRefreshCsrf) {
            await performRefresh({ retryOnCsrfError: true });
          }
        }

        if (isAuthRefresh) {
          const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
          setCsrfHeaders(headers, csrfRefresh);
        } else if (isProtected) {
          const csrfAccess = getCookie('csrf_access_token') ?? undefined;
          setCsrfHeaders(headers, csrfAccess);
        }
      }
    } catch (e) {
      if (API_CONFIG.debugMode) console.warn('[api] Error en interceptor de solicitud:', e);
    }
    return config;
  },
    (error) => Promise.reject(error)
  );

  refreshClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      if (config.url) {
        config.url = toRelativeApiPath(config.url);
      }

      const path = normalizePath(config.url as any);
      const skipAuthHeader =
        isPublicEndpoint(path) ||
        (config as any).skipAuth === true ||
        (config as any).disableAuth === true ||
        (config as any).__skipAuthHeader === true;
      const headers = (config as any).headers as MutableHeaders | undefined;
      if (headers) {
        ensureJsonHeaders(headers, config.data);

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
      if (API_CONFIG.debugMode) console.warn('[refreshClient] Error en interceptor de solicitud:', e);
    }
    return config;
  },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (API_CONFIG.debugMode && response.headers) {
      const pwHeaders = {
        etag: response.headers['etag'] || response.headers['ETag'],
        lastModified: response.headers['last-modified'] || response.headers['Last-Modified'],
        cacheControl: response.headers['cache-control'] || response.headers['Cache-Control'],
      };
      const hasPWAHeaders = Object.values(pwHeaders).some(v => v !== undefined);
      if (hasPWAHeaders) {
        const path = normalizePath(response.config?.url as any);
        console.debug(`[api][PWA] ${path} headers:`, pwHeaders);
      }
    }
    return response;
  },
  async (error: any) => {
    const originalRequest = error?.config || {};
    const status = error?.response?.status;
    const path = normalizePath(originalRequest?.url as any);

    if (status === 429) {
      try {
        const delayMs = 30000;
        rateLimitBackoff.set(path, Date.now() + delayMs);
      } catch (e) {
        if (API_CONFIG.debugMode) console.warn(e);
      }
    }

    if (!originalRequest._retry) originalRequest._retry = false;

    const isAuthLogin = path.startsWith('auth/login');
    const isAuthRefresh = path.startsWith('auth/refresh');
    if (status === 401 && (isAuthLogin || isAuthRefresh)) {
      return Promise.reject(error);
    }

    if (status === 401) {
      const tokenStatus = shouldForceLogout(error);
      const hasStoredAuth = hasClientSession();
      const isAuthMeRequest = path.startsWith('auth/me');

      if (tokenStatus.shouldForce) {
        await forceClientLogout('expired', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
        return Promise.reject(error);
      }

      if (!hasStoredAuth) {
        if (!isAuthMeRequest) {
          await forceClientLogout('missing', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
        }
        return Promise.reject(error);
      }

      if (tokenStatus.shouldRefresh) {
        try {
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            await performRefresh({ retryOnCsrfError: true });
            if (originalRequest.headers) {
              delete originalRequest.headers['Authorization'];
              delete originalRequest.headers['X-CSRF-Token'];
              delete originalRequest.headers['X-CSRF-TOKEN'];
            }
            return api(originalRequest);
          } else {
            await forceClientLogout('expired');
            return Promise.reject(error);
          }
        } catch (refreshErr) {
          await forceClientLogout('expired');
          return Promise.reject(refreshErr);
        }
      }

      return Promise.reject(error);
    }

    if (isCsrfError(error) && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      const csrf = getCookie('csrf_access_token');
      if (csrf) {
        if (originalRequest.headers) {
          originalRequest.headers['X-CSRF-Token'] = csrf;
          originalRequest.headers['X-CSRF-TOKEN'] = csrf;
        }
        return api(originalRequest);
      }
    }

    const method = String(originalRequest?.method || 'get').toLowerCase();
    const codeStr = String(error?.code || '').toUpperCase();
    const msgStr = String(error?.message || '').toLowerCase();
    const isTimeoutLike = status === 408 || codeStr === 'ECONNABORTED' || codeStr === 'ETIMEDOUT' || msgStr.includes('timeout');
    const isNetworkLike = codeStr === 'ERR_NETWORK' || (!status && msgStr.includes('network'));
    const skipRetry = (originalRequest as any)?.skipTimeoutRetry === true;
    const aborted = isCancel(error) || (!!(originalRequest as any)?.signal && (originalRequest as any).signal.aborted === true);

    if (!skipRetry && !aborted && (method === 'get' || method === 'head') && (isTimeoutLike || isNetworkLike)) {
      const attempt = Number((originalRequest as any)._timeoutAttempt ?? 0) + 1;
      if (attempt <= API_CONFIG.timeoutRetryAttempts) {
        (originalRequest as any)._timeoutAttempt = attempt;
        let delay = Math.floor(API_CONFIG.timeoutRetryBaseMs * Math.pow(1.7, attempt - 1));
        if (delay > API_CONFIG.timeoutRetryMaxMs) delay = API_CONFIG.timeoutRetryMaxMs;
        delay += Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
        return api(originalRequest);
      }
    }

    if (!aborted) {
      const parsed = readStandardErrorPayload(error);
      const detailMsg = formatMessageFromCode(parsed);

      const isOfflineLike = status === 0 || isNetworkLike || !status;
      const skipOffline = (originalRequest as any)?.skipOffline === true;

      if (isOfflineLike && method !== 'get' && !skipOffline) {
        const queueUrl = toRelativeApiPath(originalRequest.url || path);

        offlineQueue.enqueue(
          method.toUpperCase() as any,
          queueUrl,
          originalRequest.data,
          originalRequest.headers as Record<string, string>
        );

        showToastOnce('offline-queued', {
          title: "Modo Offline",
          description: "Sin conexión. Tu cambio se ha guardado localmente y se sincronizará automáticamente al volver el internet.",
          variant: "default",
        });

        return {
          data: { ...(originalRequest.data || {}), __offlineQueued: true },
          status: 202,
          statusText: 'Accepted (Queued)',
          headers: {},
          config: originalRequest
        } as AxiosResponse;
      }

      if (status === 403) {
        showToastOnce('forbidden', { title: "Acceso denegado", description: "No tienes permisos.", variant: "destructive" });
      } else if (status >= 500) {
        showToastOnce('server-error', { title: "Error del servidor", description: "Intenta más tarde.", variant: "destructive" });
      } else if (isOfflineLike) {
        showToastOnce('network-error', { title: "Error", description: detailMsg || "Error de red.", variant: "destructive" });
      } else if (detailMsg && status !== 401 && status !== 400 && status !== 404 && status !== 422) {
        showToastOnce(`error-${status}`, { title: "Error", description: String(detailMsg), variant: "destructive" });
      }

      const validationErrors = parsed.validationErrors ||
        (parsed.code === 'VALIDATION_ERROR' ? (parsed.details?.validation_errors || parsed.details?.errors) : undefined);

      throw new ApiFetchError(detailMsg, {
        status,
        code: parsed.code,
        details: parsed.details,
        traceId: parsed.traceId,
        original: error,
        validationErrors,
      });
    }

    return Promise.reject(error);
  }
);
};
