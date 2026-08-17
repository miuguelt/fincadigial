/**
 * Reconciliacion entre lo que devuelve el servidor y lo que el usuario acaba de
 * hacer en pantalla. Funciones puras: la logica se repetia cuatro veces dentro
 * del refetch (paginado y no paginado, en primer plano y en segundo).
 */

const idOf = (item: any) => String(item?.id);

export interface MergeRecentArgs<T> {
  serverList: T[];
  currentData: T[];
  recentlyCreatedIds: Set<string>;
  recentlyCreatedItems: Map<string, T>;
}

/**
 * Reincorpora los items recien creados que el servidor todavia no devuelve.
 *
 * Pasa con replicas de lectura con retraso y con creaciones offline: sin esto
 * el item aparece en la lista y desaparece en el siguiente refresco.
 */
export function mergeRecentItems<T>({
  serverList,
  currentData,
  recentlyCreatedIds,
  recentlyCreatedItems,
}: MergeRecentArgs<T>): { merged: T[]; missing: T[] } {
  const serverIds = new Set(serverList.map(idOf));
  const missing: T[] = [];

  for (const recentId of Array.from(recentlyCreatedIds)) {
    if (serverIds.has(recentId)) continue;
    const localItem = recentlyCreatedItems.get(recentId) ?? currentData.find((i) => idOf(i) === recentId);
    if (localItem) missing.push(localItem);
  }

  return { merged: missing.length > 0 ? [...missing, ...serverList] : serverList, missing };
}

/** Recorta al limite de pagina sin perder los recien creados, que van primero. */
export function capToPageLimit<T>(list: T[], missingCount: number, limit: number | undefined): T[] {
  if (missingCount === 0 || !limit || list.length <= limit) return list;
  return list.slice(0, limit);
}

/** Descarta lo que ya se elimino aunque el servidor siga devolviendolo. */
export function filterDeleted<T>(list: T[], deletedIds: Set<string>): T[] {
  if (deletedIds.size === 0) return list;
  return list.filter((item) => !deletedIds.has(idOf(item)));
}

export interface ResourceMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  rawMeta?: any;
}

/** Normaliza la paginacion: el backend no siempre manda todos los campos. */
export function buildMeta(resp: any, params: any, list: unknown[]): ResourceMeta {
  return {
    page: Number(resp?.page ?? params?.page ?? 1),
    limit: Number(resp?.limit ?? params?.limit ?? list.length ?? 10),
    total: Number(resp?.total ?? list.length ?? 0),
    totalPages: resp?.totalPages,
    hasNextPage: resp?.hasNextPage,
    hasPreviousPage: resp?.hasPreviousPage,
    rawMeta: resp?.rawMeta,
  };
}
