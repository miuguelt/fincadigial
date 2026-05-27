import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import api from '@/shared/api/client';
// import type { ApiErrorCode, StandardApiErrorPayload } from './error-parser';
export { ApiFetchError } from './error-parser';

/**
 * apiFetch - Deprecated: Use apiClient (shared/api/client.ts) directly.
 * This remains for backward compatibility but utilizes the centralized interceptors
 * for error parsing, CSRF retries, and offline queueing.
 */
export async function apiFetch<T = any>(
  config: AxiosRequestConfig & {
    retryOnCsrfError?: boolean;
    __csrfRetried?: boolean;
    skipAuth?: boolean;
    __skipAuthHeader?: boolean;
    disableAuth?: boolean;
  }
): Promise<AxiosResponse<T>> {
  // api.request already handles:
  // 1. Error parsing into ApiFetchError
  // 2. Auth re-logging
  // 3. CSRF retries
  // 4. Offline queueing (non-GET)
  return api.request<T>(config);
}

export default apiFetch;
