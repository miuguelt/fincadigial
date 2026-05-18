/**
 * Servicio de Búsqueda Semántica (P3.4)
 */

import { apiFetch } from '@/shared/api/apiFetch';

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
  /**
   * Búsqueda semántica unificada
   */
  async search(query: string, limit: number = 20): Promise<UnifiedSearchResponse> {
    const response = await apiFetch<UnifiedSearchResponse>({
      url: `/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      method: 'GET',
    });
    return (response as any) ?? { animals: [], records: [] };
  },

  /**
   * Búsqueda específica de animales
   */
  async searchAnimals(
    query: string,
    limit: number = 20,
    includeInactive: boolean = false
  ): Promise<SearchResult[]> {
    const response = await apiFetch<{ results: SearchResult[] }>({
      url: `/search/animals?q=${encodeURIComponent(query)}&limit=${limit}&include_inactive=${includeInactive}`,
      method: 'GET',
    });
    return (response as any)?.results ?? [];
  },
};
