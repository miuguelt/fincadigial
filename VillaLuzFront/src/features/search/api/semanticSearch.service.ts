/**
 * Servicio de Búsqueda Semántica (P3.4)
 */

import { apiFetch } from '@/shared/api/apiFetch';
import { unwrapApi } from '@/shared/utils/apiUnwrap';

export type SearchResultType = 'animal' | 'treatment' | 'vaccination' | 'control';

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
  records: SearchResult[];
}

export const semanticSearchService = {
  async search(query: string, limit: number = 20): Promise<UnifiedSearchResponse> {
    const response = await apiFetch({
      url: `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      method: 'GET',
    });
    return unwrapApi<UnifiedSearchResponse>(response) ?? { animals: [], records: [] };
  },

  async searchAnimals(
    query: string,
    limit: number = 20,
    includeInactive: boolean = false
  ): Promise<SearchResult[]> {
    const response = await apiFetch<{ results: SearchResult[] }>({
      url: `/search/animals?q=${encodeURIComponent(query)}&limit=${limit}&include_inactive=${includeInactive}`,
      method: 'GET',
    });
    const data = unwrapApi<{ results: SearchResult[] }>(response);
    return data?.results ?? [];
  },
};
