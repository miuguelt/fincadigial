/** Notify mounted data views that a mutation completed without a route change. */
export function emitDataRefresh(resource?: string) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('crud:refetch', {
      detail: resource ? { resource } : undefined,
    }),
  );
}
