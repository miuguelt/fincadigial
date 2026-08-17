/**
 * Identidad local (dispositivo y finca) y mapeo de URL a entidad del protocolo
 * de sincronización.
 */

/** Último cursor recibido de /sync/pull, para pedir sólo lo nuevo. */
const PULL_CURSOR_KEY_PREFIX = 'villaluz_sync_pull_cursor';

export const getDeviceId = (): string => {
  let id = localStorage.getItem('villaluz_device_id');
  if (!id) {
    id = `dev-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('villaluz_device_id', id);
  }
  return id;
};

export function getFincaId(): number {
  try {
    return parseInt(localStorage.getItem('villaluz_finca_id') || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function getPullCursorKey(fincaId: number, deviceId: string): string {
  return `${PULL_CURSOR_KEY_PREFIX}:${fincaId}:${deviceId}`;
}

export function inferEntityFromUrl(url: string): { entityType: string; entityId?: string } {
  const parts = url.split('/');
  // Buscar la parte después de /api/v1/ o similar
  const apiIndex = parts.findIndex(p => p === 'v1' || p === 'api');
  const entityPart = apiIndex !== -1 ? parts[apiIndex + 1] : parts[parts.length - 2] || 'unknown';

  // Si el último componente es un número o UUID, es el entityId
  const lastPart = parts[parts.length - 1];
  const isId = lastPart && (
    !isNaN(Number(lastPart)) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastPart)
  );

  return {
    entityType: entityPart.replace(/-/g, '_'),
    entityId: isId ? lastPart : undefined
  };
}

export function inferOperation(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST': return 'create';
    case 'PUT': return 'update';
    case 'PATCH': return 'patch';
    case 'DELETE': return 'delete';
    default: return 'unknown';
  }
}
