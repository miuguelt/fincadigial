import { getDefaultLimitByDevice } from '@/shared/utils/viewportUtils';

/**
 * Normaliza los parámetros de listado que acepta la API.
 *
 * Cada pantalla los escribe a su manera (`per_page` o `limit`, `q` o `search`,
 * `sortBy` o `sort_by`); el backend solo entiende una. Vive fuera de
 * `BaseService` porque es una función pura, sin estado ni caché.
 */
export function buildListParams(opts: Record<string, any> = {}): Record<string, any> {
  const {
    page,
    limit,
    per_page,
    search,
    q,
    sort_by,
    sortBy,
    sort_order,
    order,
    include_relations,
    cache_bust,
    fields,
    export: exportFlag,
    ...rest
  } = opts;

  let defaultLimit = 10;
  try {
    if (typeof window !== 'undefined') {
      defaultLimit = getDefaultLimitByDevice();
    }
  } catch { /* Browser capability detection falls back to the default limit. */ }

  return {
    page: page ?? rest.page ?? 1,
    limit: limit ?? per_page ?? rest.limit ?? defaultLimit,
    search: search ?? q,
    sort_by: sort_by ?? sortBy,
    sort_order: sort_order ?? order,
    include_relations,
    cache_bust,
    fields,
    export: exportFlag,
    ...rest,
  };
}
