/**
 * Servicio de Búsqueda Unificada y Semántica (P3.4)
 */

import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/utils/apiUnwrap';

export type SearchResultType =
  | 'animal'
  | 'field'
  | 'treatment'
  | 'vaccination'
  | 'control'
  | 'task'
  | 'medication'
  | 'vaccine';

export interface SearchResult {
  id: number;
  name?: string;
  title?: string;
  description?: string;
  species?: string;
  breed?: string;
  internal_id?: string;
  score: number;
  type: SearchResultType;
  url: string;
  date?: string;
}

export interface UnifiedSearchResponse {
  animals: SearchResult[];
  fields?: SearchResult[];
  records: SearchResult[];
  supplies?: SearchResult[];
  tasks?: SearchResult[];
}

export const semanticSearchService = {
  async search(query: string, limit: number = 20, signal?: AbortSignal): Promise<UnifiedSearchResponse> {
    const response = await apiFetch({
      url: `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      method: 'GET',
      signal,
      // Search results can contain links to records changed in another session.
      // Revalidate online instead of opening a stale cached detail URL.
      skipCache: true,
    } as any);
    const unwrapped = unwrapApi<UnifiedSearchResponse>(response);
    return {
      animals: unwrapped?.animals ?? [],
      fields: unwrapped?.fields ?? [],
      records: unwrapped?.records ?? [],
      supplies: unwrapped?.supplies ?? [],
      tasks: unwrapped?.tasks ?? [],
    };
  },

  async searchAnimals(
    query: string,
    limit: number = 20,
    includeInactive: boolean = false,
    signal?: AbortSignal
  ): Promise<SearchResult[]> {
    const response = await apiFetch<{ results: SearchResult[] }>({
      url: `/search/animals?q=${encodeURIComponent(query)}&limit=${limit}&include_inactive=${includeInactive}`,
      method: 'GET',
      signal,
      skipCache: true,
    } as any);
    const data = unwrapApi<{ results: SearchResult[] }>(response);
    return data?.results ?? [];
  },
};
