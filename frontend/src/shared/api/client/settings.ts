import { getEnvVar } from '@/shared/utils/viteEnv';

/**
 * Runtime settings for the main HTTP client.
 *
 * `shared/api/config.ts` exposes a similar object for the legacy `base-client`
 * instance, but two defaults differ (`useBearerAuth` and the minimum interval
 * between requests). Merging both would silently change the auth mode of every
 * live request, so this module keeps the values the client has always used.
 */
const envStr = (key: string, fallback = ''): string => String(getEnvVar(key, fallback) ?? fallback);

export const API_TIMEOUT = Number(envStr('VITE_API_TIMEOUT', '30000'));
export const REFRESH_TIMEOUT = Number(envStr('VITE_REFRESH_TIMEOUT', '15000'));
export const DEBUG_LOG = envStr('VITE_DEBUG_MODE', '').toLowerCase() === 'true';
export const AUTH_STORAGE_KEY = envStr('VITE_AUTH_STORAGE_KEY', 'finca_access_token');
// Best practice: prefer cookie-based auth (HttpOnly) over storing bearer tokens in web storage.
// If your backend still requires Authorization: Bearer, set VITE_USE_BEARER_AUTH=true explicitly.
export const USE_BEARER_AUTH = envStr('VITE_USE_BEARER_AUTH', '').toLowerCase() === 'true';
export const HTTP_CACHE_TTL = Number(envStr('VITE_HTTP_CACHE_TTL', '20000')); // TTL por defecto 20s
export const LOGIN_REDIRECT_PATH = envStr('VITE_LOGIN_PATH', '/login');
export const TIMEOUT_RETRY_ATTEMPTS = Number(envStr('VITE_TIMEOUT_RETRY_ATTEMPTS', '2'));
export const TIMEOUT_RETRY_BASE_MS = Number(envStr('VITE_TIMEOUT_RETRY_BASE_MS', '400'));
export const TIMEOUT_RETRY_MAX_MS = Number(envStr('VITE_TIMEOUT_RETRY_MAX_MS', '3000'));
export const TOAST_DEDUP_MS = Number(envStr('VITE_TOAST_DEDUP_MS', '3000'));
export const IDB_READ_ONLINE = envStr('VITE_IDB_READ_ONLINE', 'false').toLowerCase() === 'true';
export const IDB_READ_TIMEOUT_MS = Math.max(0, Number(envStr('VITE_IDB_READ_TIMEOUT_MS', '50')) || 0);
// Disabled by default: coalescing and endpoint backoff already control bursts.
// A global delay here made repeated user actions feel artificially sluggish.
export const REQUEST_MIN_INTERVAL_MS = Number(envStr('VITE_REQUEST_MIN_INTERVAL_MS', '0'));

export const AUTH_SESSION_ACTIVE_KEY = 'auth:session_active';

export const SESSION_STORAGE_KEYS = [AUTH_STORAGE_KEY, 'access_token'];
export const SESSION_COOKIE_CANDIDATES = [
  'access_token_cookie',
  'access_token',
  'csrf_access_token',
  'csrf_refresh_token',
];

export const AUTH_STATE_KEYS = [
  'auth:user',
  'auth:recent_ts',
  'auth:user:cache',
  'auth:auto_login_block',
  AUTH_SESSION_ACTIVE_KEY,
  'dev_user_data_session',
  'finca_auth_login_path',
];

export const logDebugError = (prefix: string, error: unknown): void => {
  if (DEBUG_LOG) console.warn(prefix, error);
};
