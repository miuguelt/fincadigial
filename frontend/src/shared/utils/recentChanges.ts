/**
 * Registro efímero de cambios recientes (creados/editados) del cliente.
 *
 * Permite que cualquier lista de la aplicación resalte, de forma sutil y por
 * un tiempo corto, la fila o tarjeta del registro que el usuario acaba de
 * guardar, aunque la mutación ocurrió en otra pantalla o módulo (por ejemplo,
 * un ordeño guardado desde el panel rápido y visto después en la lista).
 *
 * Es puramente de UI y mejor-esfuerzo: nunca lanza timers, las entradas viven
 * TTL_MS y se limpian de forma perezosa al consultar.
 */

export type RecentChangeAction = 'created' | 'updated';

interface RecentChangeEntry {
  action: RecentChangeAction;
  at: number;
}

/** Ventana de resaltado: suficiente para que el usuario confirme el registro. */
const TTL_MS = 120_000;

const store = new Map<string, RecentChangeEntry>();

const entryKey = (resourceRoot: string, id: string | number): string =>
  `${resourceRoot}:${id}`;

const isValidId = (id: unknown): id is string | number =>
  (typeof id === 'number' && Number.isFinite(id)) ||
  (typeof id === 'string' && id.trim() !== '' && id !== 'undefined' && id !== 'null');

const pruneExpired = (): void => {
  const now = Date.now();
  for (const [key, entry] of Array.from(store.entries())) {
    if (now - entry.at > TTL_MS) store.delete(key);
  }
};

/** Deriva la raíz de recurso (misma convención que emitDataRefresh). */
export function rootResourceOfPath(path: string): string {
  return path.replace(/^\/+/, '').split('/').filter(Boolean)[0]?.split('?')[0].toLowerCase() ?? '';
}

/** Rutas que no representan entidades manipulables en listas. */
const NON_ENTITY_PATHS = [
  'auth', 'switch', 'export', 'exports', 'upload', 'uploads',
  'login', 'refresh', 'register', 'invitation', 'invitations',
  'trigger', 'chat', 'messages', 'notifications', 'knowledge', 'health',
];

export function isNonEntityPath(path: string): boolean {
  const segments = path
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.split('?')[0].toLowerCase());
  return segments.some((segment) => NON_ENTITY_PATHS.includes(segment));
}

/**
 * Extrae id(s) de una respuesta de mutación. Soporta sobre-envolturas típicas:
 * { data }, { data: { data } }, { result }, { item }, { record } y listas.
 */
export function extractIdsFromResponse(body: unknown): Array<string | number> {
  if (body === null || body === undefined || typeof body !== 'object') return [];
  const source = body as Record<string, any>;

  const collectSingle = (candidate: any): Array<string | number> => {
    if (!candidate || typeof candidate !== 'object') return [];
    if (Array.isArray(candidate)) {
      return candidate.map((item: any) => item?.id ?? item?.item_id ?? item?.pk)
        .filter((id: unknown) => isValidId(id));
    }
    const rawId = candidate.id ?? candidate.item_id ?? candidate.pk ?? candidate.data?.id;
    if (isValidId(rawId)) return [rawId];
    return [];
  };

  for (const key of ['data', 'data.data', 'result', 'item', 'record']) {
    const candidate = key.split('.').reduce((acc: any, part) => acc?.[part], source);
    if (candidate !== undefined && candidate !== null) {
      const ids = collectSingle(candidate);
      if (ids.length > 0) return ids;
    }
  }

  return collectSingle(source);
}

/** Registra un cambio reciente para resaltarlo en las listas. */
export function markRecentChange(
  resourceRoot: string,
  id: string | number,
  action: RecentChangeAction,
): void {
  pruneExpired();
  store.set(entryKey(resourceRoot, id), { action, at: Date.now() });
}

/** Elimina la marca de un registro (usado al eliminar). */
export function forgetRecentChange(resourceRoot: string, id: string | number): void {
  pruneExpired();
  store.delete(entryKey(resourceRoot, id));
}

/** Acción reciente registrada para un id, o null si ya no está vigente. */
export function isRecentlyChanged(
  resourceRoot: string,
  id: string | number,
): RecentChangeAction | null {
  pruneExpired();
  return store.get(entryKey(resourceRoot, id))?.action ?? null;
}

/** Mapa id → acción para resaltar de una sola pasada. */
export function buildRecentFlags(
  resourceRoot: string,
  ids: Array<string | number>,
): Record<string, RecentChangeAction> {
  pruneExpired();
  const flags: Record<string, RecentChangeAction> = {};
  for (const id of ids) {
    const action = store.get(entryKey(resourceRoot, id))?.action;
    if (action) flags[String(id)] = action;
  }
  return flags;
}

/** Expone el mapa por si se necesita auditar/limpiar en pruebas. */
export function __recentChangesStore(): Map<string, RecentChangeEntry> {
  return store;
}
