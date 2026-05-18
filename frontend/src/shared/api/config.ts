import { getEnvVar } from '@/shared/utils/viteEnv';
import { getApiBaseURL } from '@/shared/utils/envConfig';
import { 
  AUTH_STORAGE_KEY, 
  AUTH_SESSION_ACTIVE_KEY, 
  DEFAULT_API_TIMEOUT, 
  DEFAULT_TOAST_DEDUP_MS 
} from '../constants/core';

const envStr = (key: string, fallback = ''): string => String(getEnvVar(key, fallback) ?? fallback);

export const API_CONFIG = {
  baseURL: getApiBaseURL(),
  timeout: Number(envStr('VITE_API_TIMEOUT', String(DEFAULT_API_TIMEOUT))),
  refreshTimeout: Number(envStr('VITE_REFRESH_TIMEOUT', '15000')),
  debugMode: envStr('VITE_DEBUG_MODE', '').toLowerCase() === 'true',
  authStorageKey: envStr('VITE_AUTH_STORAGE_KEY', AUTH_STORAGE_KEY),
  useBearerAuth: envStr('VITE_USE_BEARER_AUTH', 'true').toLowerCase() === 'true',
  httpCacheTTL: Number(envStr('VITE_HTTP_CACHE_TTL', '20000')),
  loginPath: envStr('VITE_LOGIN_PATH', '/login'),
  toastDedupMs: Number(envStr('VITE_TOAST_DEDUP_MS', String(DEFAULT_TOAST_DEDUP_MS))),
  idbReadOnline: envStr('VITE_IDB_READ_ONLINE', 'false').toLowerCase() === 'true',
  idbReadTimeoutMs: Math.max(0, Number(envStr('VITE_IDB_READ_TIMEOUT_MS', '50')) || 0),
  timeoutRetryAttempts: Number(envStr('VITE_TIMEOUT_RETRY_ATTEMPTS', '2')),
  timeoutRetryBaseMs: Number(envStr('VITE_TIMEOUT_RETRY_BASE_MS', '400')),
  timeoutRetryMaxMs: Number(envStr('VITE_TIMEOUT_RETRY_MAX_MS', '3000')),
  requestMinIntervalMs: Number(envStr('VITE_REQUEST_MIN_INTERVAL_MS', '500')),
};

export { AUTH_SESSION_ACTIVE_KEY };

export const AUTH_STATE_KEYS = [
  'auth:user',
  'auth:recent_ts',
  'auth:user:cache',
  'auth:auto_login_block',
  AUTH_SESSION_ACTIVE_KEY,
  'dev_user_data_session',
  'finca_auth_login_path',
];

export const SESSION_STORAGE_KEYS = [API_CONFIG.authStorageKey, 'access_token'];
export const SESSION_COOKIE_CANDIDATES = ['access_token_cookie', 'access_token', 'csrf_access_token', 'csrf_refresh_token'];

