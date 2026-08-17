export interface DataRefreshDetail {
  resource?: string;
  endpoint?: string;
  force: true;
  local: true;
}

let lastDataRefreshAt = 0;

/** Notify mounted data views that a mutation completed without a route change. */
export function emitDataRefresh(resource?: string): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  // Una escritura puede notificar desde el interceptor y luego desde el
  // formulario. El segundo evento no debe lanzar otro ciclo de peticiones.
  if (now - lastDataRefreshAt < 75) return;
  lastDataRefreshAt = now;

  // La precarga inicial tiene una caché separada de React Query y del CRUD.
  // Invalidarla aquí evita que el dashboard vuelva a pintar un snapshot viejo.
  for (const key of ['dashboard_critical_data', 'animal_module_data', 'user_module_data']) {
    try { window.localStorage.removeItem(key); } catch { /* storage opcional */ }
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
