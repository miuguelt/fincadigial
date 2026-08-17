import { USE_BEARER_AUTH } from './settings';

/** Encabezados comunes (JSON, CSRF y Authorization) de cada solicitud. */
export type MutableHeaders = Record<string, any>;

export const CSRF_HEADER_KEYS = ['X-CSRF-Token', 'X-CSRF-TOKEN'] as const;

const isFormDataPayload = (data: unknown): boolean =>
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
  if (!USE_BEARER_AUTH) {
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
