import { baseURL } from './instances';
import { clearClientTokens } from './session';
import { DEBUG_LOG, LOGIN_REDIRECT_PATH, logDebugError } from './settings';
import { showToastOnce } from './toastDedup';

/**
 * Política de cierre de sesión forzado a partir de la respuesta del backend.
 */
let forceLogoutPromise: Promise<void> | null = null;

function extractAuthErrorDetails(err: any) {
  const payload = err?.response?.data;
  const details = payload?.error?.details ?? payload?.error?.detail ?? payload?.details ?? payload?.detail ?? {};
  const code = (payload?.error?.code || payload?.code || payload?.error || '').toString().toUpperCase();
  const exceptionClass = (details?.exception_class || details?.exceptionClass || '').toString();
  const clientAction = (details?.client_action || details?.clientAction || '').toString();
  const logoutUrl = details?.logout_url || details?.logoutUrl;
  const loginUrl = details?.login_url || details?.loginUrl;
  const traceId = payload?.error?.trace_id || payload?.error?.traceId;
  return { code, exceptionClass, clientAction, logoutUrl, loginUrl, rawDetails: details, traceId };
}

export function shouldForceLogout(err: any): {
  shouldForce: boolean;
  logoutUrl?: string;
  loginUrl?: string;
  details?: any;
  traceId?: string;
  shouldRefresh?: boolean;
} {
  const { code, clientAction, logoutUrl, loginUrl, rawDetails, traceId } = extractAuthErrorDetails(err);

  // Logic based on Guide:
  // 1. Explicit instruction to clear auth
  const needsClear = clientAction === 'CLEAR_AUTH_AND_RELOGIN' ||
    rawDetails?.should_clear_auth === true ||
    rawDetails?.shouldClearAuth === true;

  // 2. Explicit instruction to refresh
  const needsRefresh = clientAction === 'ATTEMPT_REFRESH';

  // 3. Fallbacks based on error codes (heuristics)
  const codeIndicatesExpiry =
    code === 'TOKEN_EXPIRED' ||
    code === 'TOKEN_EXPIRED_ERROR' ||
    code === 'JWT_ERROR' ||
    code === 'MISSING_TOKEN' ||
    code === 'UNAUTHORIZED';

  // Decision priority:
  // 1. Explicit clear -> Force Logout
  if (needsClear) {
    return { shouldForce: true, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: false };
  }

  // 2. Explicit refresh -> Do NOT force logout, signal refresh
  if (needsRefresh) {
    return { shouldForce: false, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: true };
  }

  // 3. Code indicates expiry -> Default to refresh attempt (unless already retried, logic handled in interceptor)
  // If it's just a generic 401 without specific instruction, we try to be helpful and refresh.
  if (codeIndicatesExpiry) {
    return { shouldForce: false, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: true };
  }

  // 4. Other 401s (e.g. invalid permissions/scope but valid token?) -> Propagate error, don't force logout immediately.
  return {
    shouldForce: false,
    logoutUrl,
    loginUrl,
    details: rawDetails,
    traceId,
    shouldRefresh: false
  };
}

async function callBackendLogout(logoutUrl?: string) {
  const target = logoutUrl && /^https?:\/\//i.test(logoutUrl)
    ? logoutUrl
    : `${baseURL?.replace(/\/$/, '') || ''}${logoutUrl
      ? logoutUrl.startsWith('/') ? logoutUrl : `/${logoutUrl}`
      : '/auth/logout'}`;
  try {
    await fetch(target, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
  } catch (err) {
    if (DEBUG_LOG) console.warn('[api] Logout fetch falló:', err);
  }
}

function redirectToLogin(reason: string, loginUrlOverride?: string): void {
  const loginPath = loginUrlOverride || LOGIN_REDIRECT_PATH || '/login';
  try {
    const loginUrl = new URL(loginPath, window.location.origin);
    loginUrl.searchParams.set('reason', reason);
    const target = loginUrl.toString();
    const current = new URL(window.location.href);
    const samePath = current.pathname === loginUrl.pathname;
    const sameSearch = current.search === loginUrl.search;

    if (reason === 'expired' && (!samePath || !sameSearch)) {
      showToastOnce('session-expired', {
        title: "Sesión expirada",
        description: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
        variant: "destructive",
      });
    }

    if (samePath) {
      if (!sameSearch) {
        // Only query differs; update it without triggering a reload
        window.history.replaceState(window.history.state, '', target);
      }
      // Already on target URL – avoid forcing another reload loop
      return;
    }

    window.location.assign(target);
  } catch (urlError) {
    logDebugError('[api] No se pudo construir URL de login', urlError);
    const hasQuery = loginPath.includes('?');
    const separator = hasQuery ? '&' : '?';
    const target = `${loginPath}${separator}reason=${encodeURIComponent(reason)}`;
    const currentPathWithQuery = `${window.location.pathname}${window.location.search}`;
    if (reason === 'expired' && currentPathWithQuery !== target) {
      showToastOnce('session-expired', {
        title: "Sesión expirada",
        description: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
        variant: "destructive",
      });
    }
    if (currentPathWithQuery === target) {
      window.history.replaceState(window.history.state, '', target);
      return;
    }
    window.location.assign(target);
  }
}

export async function forceClientLogout(
  reason = 'expired',
  options?: { logoutUrl?: string; loginUrl?: string }
): Promise<void> {
  if (forceLogoutPromise) return forceLogoutPromise;
  forceLogoutPromise = (async () => {
    clearClientTokens();
    await callBackendLogout(options?.logoutUrl);
    if (typeof window !== 'undefined') {
      redirectToLogin(reason, options?.loginUrl);
    }
  })().finally(() => {
    // En tests o entornos sin navegación, permitir reintentos manuales
    if (typeof window === 'undefined') {
      forceLogoutPromise = null;
    }
  });
  return forceLogoutPromise;
}

/**
 * Permite que apiFetch() aplique la política estándar basada en
 * data.error.code/details.
 */
export async function forceLogoutFromApiError(
  code?: string,
  details?: any
): Promise<void> {
  const clientAction = (details?.client_action || details?.clientAction || '').toString();
  const shouldClear =
    clientAction === 'CLEAR_AUTH_AND_RELOGIN' ||
    details?.should_clear_auth === true ||
    details?.shouldClearAuth === true;

  if (!shouldClear) return;

  const reason = String(code || 'expired').toLowerCase().includes('missing') ? 'missing' : 'expired';
  const logoutUrl = details?.logout_url || details?.logoutUrl;
  const loginUrl = details?.login_url || details?.loginUrl;
  await forceClientLogout(reason, { logoutUrl, loginUrl });
}
