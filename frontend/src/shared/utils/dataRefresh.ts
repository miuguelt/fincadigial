import { clearAllServiceCaches, clearServiceCaches } from '@/shared/api/service-registry';

export interface DataRefreshDetail {
  resource?: string;
  endpoint?: string;
  force: true;
  local: true;
}

const lastDataRefreshAtByResource = new Map<string, number>();

/** Notify mounted data views that a mutation completed without a route change. */
export function emitDataRefresh(resource?: string): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  // Una escritura puede notificar desde el interceptor y luego desde el
  // formulario. El segundo evento del mismo recurso no debe lanzar otro ciclo
  // de peticiones, pero nunca se debe descartar el aviso de otro recurso.
  const rootResource = resource ? resource.replace(/^\/+/, '').split('/')[0].split('?')[0].toLowerCase() : undefined;
  const refreshKey = rootResource || '*';
  const lastRefreshAt = lastDataRefreshAtByResource.get(refreshKey) || 0;
  if (now - lastRefreshAt < 75) return;
  lastDataRefreshAtByResource.set(refreshKey, now);

  // La precarga inicial tiene una caché separada de React Query y del CRUD.
  // Invalidarla aquí evita que el dashboard vuelva a pintar un snapshot viejo.
  for (const key of ['dashboard_critical_data', 'animal_module_data', 'user_module_data']) {
    try { window.localStorage.removeItem(key); } catch { /* storage opcional */ }
  }

  // Vaciar cachés en memoria y persistentes de los servicios correspondientes
  if (rootResource) {
    void clearServiceCaches(rootResource);
    if (rootResource === 'animals') {
      void clearServiceCaches('animal-fields', 'animal-diseases', 'treatments', 'milk', 'controls', 'control');
    } else if (rootResource === 'control' || rootResource === 'controls') {
      // Un pesaje (control) muta animals.weight: las tarjetas y el detalle
      // siguen leyendo el peso desde el servicio de animals.
      void clearServiceCaches('animals', 'controls');
    } else if (rootResource === 'animal-fields') {
      void clearServiceCaches('fields', 'animals');
    }
  } else {
    void clearAllServiceCaches();
  }

  const detail: DataRefreshDetail = {
    ...(resource ? { resource, endpoint: resource } : {}),
    force: true,
    local: true,
  };

  window.dispatchEvent(
    new CustomEvent('crud:refetch', {
      detail: resource ? { resource, force: true } : { force: true },
    }),
  );

  window.dispatchEvent(new CustomEvent('server-resource-changed', { detail }));
}
