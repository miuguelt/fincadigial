import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Sincroniza paginación, búsqueda, campos y orden con la URL, y arma los
 * parámetros efectivos de cada petición.
 */
export function useResourceParams<P extends Record<string, any>>(
  initialParams?: P,
  lastParamsRef?: React.MutableRefObject<P | undefined>,
  filters?: Record<string, any>
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageQP = Number(searchParams.get('page') || '') || undefined;
  const limitQP = Number(searchParams.get('limit') || '') || undefined;
  const searchQP = searchParams.get('search') || undefined;
  const fieldsQP = searchParams.get('fields') || undefined;
  const orderingQP = searchParams.get('ordering') || undefined;
  const sortByQP = searchParams.get('sort_by') || undefined;
  const sortOrderQP = (searchParams.get('sort_order') as 'asc' | 'desc' | undefined) || undefined;

  // Extraer cualquier otro parámetro de la URL que actúe como filtro (excluyendo estado interno de navegación/modales)
  const urlFilters = useMemo(() => {
    const customFilters: Record<string, any> = {};
    const excludedKeys = new Set([
      'page', 'limit', 'search', 'fields', 'ordering', 'sort_by', 'sort_order',
      'vista', 'create', 'edit', 'tab', 'detail'
    ]);
    searchParams.forEach((val, key) => {
      if (!excludedKeys.has(key) && val !== null && val !== undefined && val !== '') {
        customFilters[key] = val;
      }
    });
    return customFilters;
  }, [searchParams]);

  const urlFiltersKey = useMemo(() => {
    return JSON.stringify(Object.entries(urlFilters).sort(([a], [b]) => a[0].localeCompare(b[0])));
  }, [urlFilters]);

  const setPage = useCallback((page: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(page));
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setLimit = useCallback((limit: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('limit', String(limit));
    // reset page when limit changes
    sp.set('page', '1');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setSearch = useCallback((s: string) => {
    const sp = new URLSearchParams(searchParams);
    if (s) sp.set('search', s); else sp.delete('search');
    sp.set('page', '1');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setFields = useCallback((f: string) => {
    const sp = new URLSearchParams(searchParams);
    if (f) sp.set('fields', f); else sp.delete('fields');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  // Prioridad: query params de la URL > params del último refetch > iniciales/filtros.
  const buildEffectiveParams = useCallback((): Record<string, any> | undefined => {
    const base = { ...(initialParams as any), ...(filters || {}) };
    const last = { ...(lastParamsRef?.current as any) };
    const fromURL: Record<string, any> = { ...urlFilters };
    if (pageQP !== undefined) fromURL.page = pageQP;
    if (limitQP !== undefined) fromURL.limit = limitQP;
    if (searchQP !== undefined) fromURL.search = searchQP;
    if (fieldsQP !== undefined) fromURL.fields = fieldsQP;
    // Orden: preferir sort_by/sort_order; si no existen, usar ordering
    if (sortByQP !== undefined) fromURL.sort_by = sortByQP;
    if (sortOrderQP !== undefined) fromURL.sort_order = sortOrderQP;
    if (orderingQP !== undefined && fromURL.sort_by === undefined) {
      fromURL.ordering = orderingQP;
    }
    return { ...base, ...last, ...fromURL };
  }, [fieldsQP, initialParams, filters, limitQP, pageQP, searchQP, orderingQP, sortByQP, sortOrderQP, lastParamsRef, urlFilters]);

  return {
    pageQP, limitQP, searchQP, fieldsQP, urlFiltersKey, urlFilters,
    setPage, setLimit, setSearch, setFields,
    buildEffectiveParams
  };
}
