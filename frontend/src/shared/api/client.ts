import { startIndexedDBCacheCleanup } from '@/shared/api/cache/indexedDBCache';
import { installCachedGet } from './client/cachedGet';
import { api } from './client/instances';
import { installRequestInterceptors } from './client/requestInterceptor';
import { installResponseInterceptor } from './client/responseInterceptor';

/**
 * Punto de composición del cliente HTTP.
 *
 * Cada capacidad (gate de autenticación, refresh, caché, reintentos, cola
 * offline) vive en `./client/*`; aquí sólo se ensamblan en el orden en que
 * deben instalarse y se expone la superficie pública que consume la app.
 */
installRequestInterceptors();
installResponseInterceptor();
installCachedGet();

// Iniciar limpieza automática de cache IndexedDB al importar este módulo
if (typeof window !== 'undefined') {
  startIndexedDBCacheCleanup(300000); // Cada 5 minutos
}

export { refreshClient } from './client/instances';
export { invalidateHttpCache } from './client/httpCache';
export { forceLogoutFromApiError } from './client/forcedLogout';
export { unwrapApi } from '@/shared/utils/apiUnwrap';
export { api as apiClient };
export default api;

export function startServerEvents(): void {
  // Disabled to prevent duplicate connections (429) & enable clean lints
  // console.warn('startServerEvents is deprecated. Use lib/events.ts');
}

export function startWebSocket(): void {
  // Disabled: Use lib/events.ts instead
}

export function startRealtime(): void {
  // Disabled: Use lib/events.ts instead
}
