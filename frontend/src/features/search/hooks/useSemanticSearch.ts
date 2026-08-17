import { useState, useCallback, useRef, useEffect } from 'react';
import { semanticSearchService, SearchResult, UnifiedSearchResponse } from '../api/semanticSearch.service';

export type SearchCategory = 'all' | 'animals' | 'fields' | 'records' | 'supplies' | 'tasks';

interface UseSemanticSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSemanticSearch(options: UseSemanticSearchOptions = {}) {
  const { debounceMs = 120, minQueryLength = 1 } = options;

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<UnifiedSearchResponse>({
    animals: [],
    fields: [],
    records: [],
    supplies: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(async (searchQuery: string) => {
    // Cancelar búsqueda anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Limpiar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Validar query
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < minQueryLength) {
      setResults({ animals: [], fields: [], records: [], supplies: [], tasks: [] });
      setHasSearched(false);
      setLoading(false);
      setError(null);
      return;
    }

    // Debounce rápido en tiempo real
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const data = await semanticSearchService.search(trimmed, 25, controller.signal);
        // Si no fue cancelado
        if (!controller.signal.aborted) {
          setResults(data);
          setHasSearched(true);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return;
        }
        if (!controller.signal.aborted) {
          setError('No se pudo consultar el servidor de la finca');
          setResults({ animals: [], fields: [], records: [], supplies: [], tasks: [] });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);
  }, [debounceMs, minQueryLength]);

  // Actualizar búsqueda cuando cambia el query
  useEffect(() => {
    executeSearch(query);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, executeSearch]);

  const clear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setQuery('');
    setActiveCategory('all');
    setResults({ animals: [], fields: [], records: [], supplies: [], tasks: [] });
    setHasSearched(false);
    setError(null);
    setLoading(false);
  }, []);

  const retry = useCallback(() => {
    executeSearch(query);
  }, [query, executeSearch]);

  // Resultados combinados para mostrar
  const allResults: SearchResult[] = [
    ...(results.animals || []),
    ...(results.fields || []),
    ...(results.records || []),
    ...(results.supplies || []),
    ...(results.tasks || []),
  ].sort((a, b) => b.score - a.score);

  // Resultados filtrados según la categoría seleccionada
  const filteredResults: SearchResult[] = activeCategory === 'all'
    ? allResults
    : activeCategory === 'animals'
      ? (results.animals || [])
      : activeCategory === 'fields'
        ? (results.fields || [])
        : activeCategory === 'records'
          ? (results.records || [])
          : activeCategory === 'supplies'
            ? (results.supplies || [])
            : (results.tasks || []);

  return {
    query,
    setQuery,
    activeCategory,
    setActiveCategory,
    results,
    allResults,
    filteredResults,
    animals: results.animals || [],
    fields: results.fields || [],
    records: results.records || [],
    supplies: results.supplies || [],
    tasks: results.tasks || [],
    loading,
    error,
    hasSearched,
    clear,
    retry,
    resultCount: allResults.length,
  };
}
