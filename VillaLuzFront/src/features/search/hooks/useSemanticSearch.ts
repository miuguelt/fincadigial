import { useState, useCallback, useRef, useEffect } from 'react';
import { semanticSearchService, SearchResult, UnifiedSearchResponse } from '../api/semanticSearch.service';

interface UseSemanticSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSemanticSearch(options: UseSemanticSearchOptions = {}) {
  const { debounceMs = 200, minQueryLength = 2 } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UnifiedSearchResponse>({ animals: [], records: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    // Cancelar búsqueda anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Limpiar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Validar query
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults({ animals: [], records: [] });
      setHasSearched(false);
      return;
    }
    
    // Debounce
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await semanticSearchService.search(searchQuery);
        setResults(data);
        setHasSearched(true);
      } catch (err) {
        setError('Error al realizar la búsqueda');
        setResults({ animals: [], records: [] });
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, minQueryLength]);

  // Actualizar búsqueda cuando cambia el query
  useEffect(() => {
    search(query);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  const clear = useCallback(() => {
    setQuery('');
    setResults({ animals: [], records: [] });
    setHasSearched(false);
    setError(null);
  }, []);

  // Resultados combinados para mostrar
  const allResults: SearchResult[] = [
    ...results.animals,
    ...results.records,
  ].sort((a, b) => b.score - a.score);

  return {
    query,
    setQuery,
    results,
    allResults,
    animals: results.animals,
    records: results.records,
    loading,
    error,
    hasSearched,
    clear,
    resultCount: allResults.length,
  };
}
