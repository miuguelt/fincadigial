import { forceClientLogout } from './auth-utils';

export function isTokenExpired(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const code = (data?.code || data?.error || data?.detail || data?.message || '').toString().toUpperCase();
  return status === 401 && (code.includes('TOKEN_EXPIRED') || code.includes('EXPIRED'));
}

export function extractAuthErrorDetails(err: any) {
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

  const needsClear = clientAction === 'CLEAR_AUTH_AND_RELOGIN' ||
    rawDetails?.should_clear_auth === true ||
    rawDetails?.shouldClearAuth === true;

  const needsRefresh = clientAction === 'ATTEMPT_REFRESH';

  const codeIndicatesExpiry =
    code === 'TOKEN_EXPIRED' ||
    code === 'TOKEN_EXPIRED_ERROR' ||
    code === 'JWT_ERROR' ||
    code === 'MISSING_TOKEN' ||
    code === 'UNAUTHORIZED';

  if (needsClear) {
    return { shouldForce: true, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: false };
  }

  if (needsRefresh) {
    return { shouldForce: false, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: true };
  }

  if (codeIndicatesExpiry) {
    return { shouldForce: false, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: true };
  }

  return {
    shouldForce: false,
    logoutUrl,
    loginUrl,
    details: rawDetails,
    traceId,
    shouldRefresh: false
  };
}

export function isCsrfError(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const text = (data?.code || data?.error || data?.detail || data?.message || '').toString();
  const upper = text.toUpperCase();
  return (status === 401 || status === 400 || status === 403) && upper.includes('CSRF');
}

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

