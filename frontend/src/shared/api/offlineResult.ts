/**
 * Distingue una escritura confirmada por el servidor de una que el cliente
 * encoló por falta de red.
 *
 * El interceptor de respuesta responde 202 con `__offlineQueued` cuando guarda
 * la operación en la cola offline. Anunciarla como registrada rompería la regla
 * de consistencia: encolar no es persistir.
 */
export const wasQueuedOffline = (response: unknown): boolean => {
  const candidate = response as { status?: number; data?: { __offlineQueued?: boolean } } | null | undefined;
  return candidate?.status === 202 && candidate?.data?.__offlineQueued === true;
};
