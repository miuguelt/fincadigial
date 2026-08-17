import { getCookie } from '@/shared/utils/cookieUtils';
import { apiFetch } from '@/shared/api/apiFetch';
import { toRelativeApiPath } from '@/shared/api/urlUtils';
import { FieldNodeService } from '../FieldNodeService';
import type { QueuedOperation } from './types';

/**
 * Envío de una operación pendiente al servidor, con el nodo de finca como ruta
 * alterna cuando hay LAN pero no internet.
 */
function buildOperationHeaders(operation: QueuedOperation): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(operation.headers || {}),
  };

  const csrfToken = getCookie('csrf_access_token') ?? undefined;
  if (csrfToken) {
    headers['X-CSRF-Token'] = headers['X-CSRF-Token'] || csrfToken;
    headers['X-CSRF-TOKEN'] = headers['X-CSRF-TOKEN'] || csrfToken;
  }

  return headers;
}

export async function sendOperation(
  operation: QueuedOperation,
  hasFieldNode: boolean
): Promise<{ status: number }> {
  const headers = buildOperationHeaders(operation);

  try {
    return await apiFetch({
      url: toRelativeApiPath(operation.url),
      method: operation.method,
      data: operation.data,
      headers,
      withCredentials: true,
      validateStatus: () => true,
      // Avoid re-enqueue loops if replay still fails
      skipOffline: true,
    } as any);
  } catch (primaryError) {
    if (!hasFieldNode) throw primaryError;

    // A device may have LAN reachability but no internet. Replay the
    // original domain mutation through the node, preserving method and
    // endpoint instead of only depositing an unapplied oplog record.
    await FieldNodeService.mutate(
      operation.method,
      toRelativeApiPath(operation.url),
      operation.data,
    );
    return { status: 200 };
  }
}

export type OperationFailure = 'auth' | 'failed' | 'retry';

/**
 * Actualiza la operación tras un intento fallido y dice qué debe hacer la cola:
 * pedir credenciales, darla por fallida o reprogramarla con backoff.
 */
export function applyOperationFailure(operation: QueuedOperation, error: any): OperationFailure {
  operation.retries++;
  operation.error = error?.message || 'Error desconocido';

  const esErrorAuth = /401|403|unauthorized|forbidden|token.*expired|csrf/i.test(error?.message || '');

  if (esErrorAuth) {
    operation.status = 'failed';
    operation.error = 'Sesión expirada - Requiring login';
    return 'auth';
  }

  if (operation.retries >= operation.maxRetries) {
    operation.status = 'failed';
    return 'failed';
  }

  const backoffMs = Math.min(5 * 60 * 1000, 1000 * (2 ** Math.min(operation.retries, 8)));
  operation.nextAttemptAt = Date.now() + backoffMs;
  operation.status = 'pending';
  return 'retry';
}
