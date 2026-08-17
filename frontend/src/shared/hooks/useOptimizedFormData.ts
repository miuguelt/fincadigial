import { useCallback, useMemo } from 'react';
import { useCache, useCacheKey } from '@/app/providers/CacheContext';

/**
 * Hook optimizado para formularios que necesitan datos de múltiples entidades
 * Evita peticiones redundantes al backend usando caché inteligente
 */
export function useOptimizedFormData() {
  const { getCache } = useCache();
  const { generateKey } = useCacheKey();

  // Función para obtener datos de múltiples entidades de forma optimizada
  const getFormData = useCallback(<T>(
    entityName: string
  ): { data: T[] | null; needsFetch: boolean } => {
    const cacheKey = generateKey(entityName);
    const cachedData = getCache<T[]>(cacheKey);

    return {
      data: cachedData,
      needsFetch: !cachedData
    };
  }, [getCache, generateKey]);

  // Función para verificar si múltiples entidades están en caché
  const checkMultipleEntities = useCallback((entityNames: string[]): {
    allCached: boolean;
    missingEntities: string[];
    cachedData: Record<string, any[]>;
  } => {
    const results: Record<string, any[]> = {};
    const missing: string[] = [];

    entityNames.forEach(entityName => {
      const cacheKey = generateKey(entityName);
      const cachedData = getCache<any[]>(cacheKey);

      if (cachedData) {
        results[entityName] = cachedData;
      } else {
        missing.push(entityName);
      }
    });

    return {
      allCached: missing.length === 0,
      missingEntities: missing,
      cachedData: results
    };
  }, [getCache, generateKey]);

  return {
    getFormData,
    checkMultipleEntities
  };
}

/**
 * Hook específico para formularios que requieren datos de animales, usuarios, etc.
 */
export function useFormDataEntities() {
  const { checkMultipleEntities } = useOptimizedFormData();

  // Entidades comunes en formularios
  const commonEntities = useMemo(() => [
    'animals',
    'users',
    'diseases',
    'species',
    'breeds',
    'fields',
    'medications',
    'vaccines'
  ], []);

  const checkCommonEntities = useCallback(() => {
    return checkMultipleEntities(commonEntities);
  }, [checkMultipleEntities, commonEntities]);

  const checkSpecificEntities = useCallback((entities: string[]) => {
    return checkMultipleEntities(entities);
  }, [checkMultipleEntities]);

  return {
    checkCommonEntities,
    checkSpecificEntities,
    commonEntities
  };
}

/**
 * Hook para optimizar la carga de datos en componentes que usan múltiples hooks
 */
export function useSmartDataLoader() {
  const { getCache } = useCache();
  const { generateKey } = useCacheKey();

  // Función para determinar qué hooks necesitan hacer fetch
  const optimizeHookLoading = useCallback((hookConfigs: Array<{
    entityName: string;
    hookFunction: () => any;
    priority: 'high' | 'medium' | 'low';
  }>) => {
    const optimizedHooks: Array<{
      entityName: string;
      shouldLoad: boolean;
      priority: 'high' | 'medium' | 'low';
      hookFunction: () => any;
    }> = [];

    // Ordenar por prioridad
    const sortedConfigs = hookConfigs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    sortedConfigs.forEach(config => {
      const cacheKey = generateKey(config.entityName);
      const cachedData = getCache(cacheKey);

      optimizedHooks.push({
        ...config,
        shouldLoad: !cachedData
      });
    });

    return optimizedHooks;
  }, [getCache, generateKey]);

  return {
    optimizeHookLoading
  };
}

/**
 * Utilidades para debugging y monitoreo de caché
 */
export function useCacheDebug() {
  const { getCache } = useCache();
  const { generateKey } = useCacheKey();

  const getCacheStats = useCallback((entityNames: string[]) => {
    const stats = entityNames.map(entityName => {
      const cacheKey = generateKey(entityName);
      const cachedData = getCache(cacheKey);

      return {
        entity: entityName,
        cached: !!cachedData,
        dataSize: cachedData ? JSON.stringify(cachedData).length : 0,
        itemCount: Array.isArray(cachedData) ? cachedData.length : 0
      };
    });

    return stats;
  }, [getCache, generateKey]);

  const logCacheStats = useCallback((entityNames: string[]) => {
    const stats = getCacheStats(entityNames);
    console.group('🚀 Cache Statistics');
    stats.forEach(stat => {
      console.log(`${stat.entity}: ${stat.cached ? '✅ Cached' : '❌ Not Cached'} (${stat.itemCount} items, ${(stat.dataSize / 1024).toFixed(2)}KB)`);
    });
    console.groupEnd();
  }, [getCacheStats]);

  return {
    getCacheStats,
    logCacheStats
  };
}
