import { AxiosResponse } from 'axios';
import { getCookie } from '@/shared/utils/cookieUtils';
import { forceClientLogout, shouldForceLogout } from './forcedLogout';
import { api } from './instances';
import { hasClientSession } from './session';
import { DEBUG_LOG } from './settings';
import { performRefresh } from './tokenRefresh';

/**
 * Política de respuesta 401: refrescar, reintentar una vez o cerrar sesión.
 *
 * Siempre termina devolviendo la respuesta del reintento o propagando el error;
 * nunca deja la decisión a quien la llama.
 */
export async function handleUnauthorized(
  error: any,
  originalRequest: any,
  path: string
): Promise<AxiosResponse> {
  const tokenStatus = shouldForceLogout(error);
  const hasStoredAuth = hasClientSession();
  const isAuthMeRequest = path.startsWith('auth/me');

  // 1. Si el backend explícitamente pide logout
  if (tokenStatus.shouldForce) {
    if (DEBUG_LOG) console.warn('[api] 401 Forzando logout por error explícito:', tokenStatus.details);
    await forceClientLogout('expired', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
    return Promise.reject(error);
  }

  // 2. Si no hay sesión local (cookies/storage) y da 401, no tiene sentido refrescar.
  if (!hasStoredAuth && !isAuthMeRequest) {
    if (DEBUG_LOG) console.warn('[api] 401 sin sesión local. Forzando logout.');
    await forceClientLogout('missing', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
    return Promise.reject(error);
  }

  // 3. Intentar refresh si se sugiere o si parece expirado
  if (tokenStatus.shouldRefresh) {
    try {
      if (DEBUG_LOG) {
        const hasAccess = !!getCookie('csrf_access_token');
        const hasRefresh = !!getCookie('csrf_refresh_token');
        console.log('[api][resp] 401 detectado. Intentando refresh. Cookies:', { access: hasAccess, refresh: hasRefresh }, 'Retry:', !!originalRequest._retry);
      }

      // Evitar bucles infinitos: solo un reintento
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        await performRefresh({ retryOnCsrfError: true });
        if (DEBUG_LOG) console.log('[api] Refresh exitoso. Reintentando request original:', path);
        // Reset authorization header to force re-reading from storage/cookies in request interceptor
        if (originalRequest.headers) {
          delete originalRequest.headers['Authorization'];
          delete originalRequest.headers['X-CSRF-Token'];
          delete originalRequest.headers['X-CSRF-TOKEN'];
        }
        return api(originalRequest);
      }

      // Si ya reintentamos y sigue 401 -> Logout
      if (DEBUG_LOG) console.warn('[api] 401 tras reintento (refresh fallido o token inválido). Forzando logout.');
      await forceClientLogout('expired');
      return Promise.reject(error);
    } catch (refreshErr) {
      if (DEBUG_LOG) console.error('[api] Falló el refresh automático tras 401:', refreshErr);
      // Si falla el refresh (ej. refresh token expirado también), logout.
      await forceClientLogout('expired');
      return Promise.reject(refreshErr);
    }
  }

  // 4. Si es 401 pero no hay instrucción de refresh ni logout, devolver el error tal cual
  // (Puede ser falta de permisos, scope, etc. que no se arregla con refresh)
  if (DEBUG_LOG) console.warn('[api] 401 recibido sin instrucción de refresh ni logout. Propagando error.');
  return Promise.reject(error);
}
