import axios, { AxiosResponse } from 'axios';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { ApiFetchError, formatMessageFromCode, readStandardErrorPayload } from '../error-parser';
import { toRelativeApiPath } from '../urlUtils';
import { api } from './instances';
import {
  DEBUG_LOG,
  TIMEOUT_RETRY_ATTEMPTS,
  TIMEOUT_RETRY_BASE_MS,
  TIMEOUT_RETRY_MAX_MS,
} from './settings';
import { showToastOnce } from './toastDedup';

/**
 * Fallos de transporte: tiempos de espera agotados, caídas de red y el
 * encolado offline de las escrituras que no lograron salir.
 */
export type TransportDiagnosis = {
  method: string;
  status?: number;
  isTimeoutLike: boolean;
  isNetworkLike: boolean;
  aborted: boolean;
  skipRetry: boolean;
};

export function classifyTransportError(error: any, originalRequest: any): TransportDiagnosis {
  const status = error?.response?.status;
  const method = String(originalRequest?.method || 'get').toLowerCase();
  const codeStr = String(error?.code || '').toUpperCase();
  const msgStr = String(error?.message || '').toLowerCase();
  return {
    method,
    status,
    isTimeoutLike: status === 408 || codeStr === 'ECONNABORTED' || codeStr === 'ETIMEDOUT' || msgStr.includes('timeout'),
    isNetworkLike: codeStr === 'ERR_NETWORK' || (!status && msgStr.includes('network')),
    aborted: axios.isCancel(error) || (!!originalRequest?.signal && originalRequest.signal.aborted === true),
    skipRetry: originalRequest?.skipTimeoutRetry === true,
  };
}

/**
 * Reintenta lecturas con backoff exponencial cuando el fallo parece de red.
 * Devuelve null si esta petición no debe reintentarse.
 */
export async function retryTransportError(
  originalRequest: any,
  diagnosis: TransportDiagnosis
): Promise<Promise<AxiosResponse> | null> {
  const { method, isTimeoutLike, isNetworkLike, aborted, skipRetry } = diagnosis;
  if (skipRetry || aborted) return null;
  if (method !== 'get' && method !== 'head') return null;
  if (!isTimeoutLike && !isNetworkLike) return null;

  const attempt = Number(originalRequest._timeoutAttempt ?? 0) + 1;
  if (attempt > TIMEOUT_RETRY_ATTEMPTS) return null;

  originalRequest._timeoutAttempt = attempt;
  let delay = Math.floor(TIMEOUT_RETRY_BASE_MS * Math.pow(1.7, attempt - 1));
  if (delay > TIMEOUT_RETRY_MAX_MS) delay = TIMEOUT_RETRY_MAX_MS;
  delay += Math.floor(Math.random() * 100);
  await new Promise((r) => setTimeout(r, delay));
  return api(originalRequest);
}

/** Guarda la escritura en la cola offline y responde 202 a quien la disparó. */
function enqueueOffline(originalRequest: any, path: string, method: string): AxiosResponse {
  if (DEBUG_LOG) console.log(`[api][offline] Automically enqueuing ${method} ${path}`);

  // Store ONLY a canonical relative path — never absolute URLs.
  // Absolute + baseURL re-join caused nested 404s like:
  // /api/v1/http://localhost:8092/api/v1/location/report
  const queueUrl = toRelativeApiPath(originalRequest.url || path);

  offlineQueue.enqueue(
    method.toUpperCase() as any,
    queueUrl,
    originalRequest.data,
    originalRequest.headers as Record<string, string>
  );

  // Notify user
  showToastOnce('offline-queued', {
    title: "Modo sin conexión",
    description: "Tu cambio se guardó localmente y se sincronizará automáticamente cuando vuelva la conexión.",
    variant: "default",
  });

  // Return a special response that indicates it was queued
  return {
    data: { ...(originalRequest.data || {}), __offlineQueued: true },
    status: 202,
    statusText: 'Accepted (Queued)',
    headers: {},
    config: originalRequest
  } as AxiosResponse;
}

function notifyFailure(status: number | undefined, isOfflineLike: boolean, detailMsg?: string): void {
  if (status === 403) {
    showToastOnce('forbidden', {
      title: "Acceso denegado",
      description: "No tienes permisos para realizar esta acción.",
      variant: "destructive",
    });
  } else if (status && status >= 500) {
    showToastOnce('server-error', {
      title: "Error del servidor",
      description: "Error del servidor. Por favor intenta más tarde.",
      variant: "destructive",
    });
  } else if (isOfflineLike) {
    showToastOnce('network-error', {
      title: "Error",
      description: detailMsg || "Ocurrió un error de red. Verifica tu conexión.",
      variant: "destructive",
    });
  } else if (detailMsg) {
    showToastOnce(`error-${status}`, {
      title: "Error",
      description: String(detailMsg),
      variant: "destructive",
    });
  }
}

/**
 * Último tramo del error: encola si era una escritura sin red, avisa al usuario
 * y convierte el fallo en ApiFetchError.
 */
export function handleTerminalFailure(
  error: any,
  originalRequest: any,
  path: string,
  diagnosis: TransportDiagnosis
): AxiosResponse {
  const { method, status, isNetworkLike } = diagnosis;
  const parsed = readStandardErrorPayload(error);
  const detailMsg = formatMessageFromCode(parsed);

  // Automatic Offline Queueing for non-GET requests
  const isOfflineLike = status === 0 || isNetworkLike || !status;
  const skipOffline = originalRequest?.skipOffline === true;

  if (isOfflineLike && method !== 'get' && !skipOffline) {
    return enqueueOffline(originalRequest, path, method);
  }

  // Quien pide `skipErrorToast` muestra el motivo por su cuenta (por ejemplo el
  // diálogo que explica un bloqueo por integridad referencial).
  if (originalRequest?.skipErrorToast !== true) {
    notifyFailure(status, isOfflineLike, detailMsg);
  }

  // Re-throw as ApiFetchError
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
