import { useCallback } from 'react';
import { getApiBaseURL } from '@/shared/utils/envConfig';

const getCurrentFincaId = (): number | string | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage?.getItem('auth:user');
    const parsed = raw ? JSON.parse(raw) : null;
    const user = parsed?.user ?? parsed;
    return user?.finca_id ?? user?.finca?.id ?? user?.active_finca_id ?? user?.current_finca_id ?? null;
  } catch {
    return null;
  }
};

// Hook para generar claves de cache consistentes y multi-tenant
export const useCacheKey = (fincaId?: number) => {
  const generateKey = useCallback((endpoint: string, params?: Record<string, any>): string => {
    const apiBaseURL = getApiBaseURL();
    // Incluir finca_id en la clave base para aislamiento multi-tenant
    const resolvedFincaId = fincaId ?? getCurrentFincaId();
    const fincaSuffix = resolvedFincaId ? `@finca:${resolvedFincaId}` : '';
    const baseKey = `${apiBaseURL}/${endpoint}${fincaSuffix}`;
    
    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }
    
    // Ordenar parámetros para consistencia
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    const paramString = JSON.stringify(sortedParams);
    return `${baseKey}:${btoa(paramString)}`;
  }, [fincaId]);

  return { generateKey };
};

// Utilidades para invalidación de cache
export const CacheUtils = {
  // Patrones comunes para invalidación
  patterns: {
    animals: 'api:animals',
    users: 'api:users',
    diseases: 'api:diseases',
    controls: 'api:control',
    fields: 'api:fields',
    medications: 'api:medications',
    treatments: 'api:treatments',
    species: 'api:species',
    breeds: 'api:breeds',
    vaccines: 'api:vaccines',
    vaccinations: 'api:vaccinations'
  },
  
  // Generar claves relacionadas para invalidación en cascada
  getRelatedKeys: (entity: string, id?: number): string[] => {
    const keys = [`api:${entity}`];
    
    if (id) {
      keys.push(`api:${entity}:${id}`);
    }
    
    // Agregar entidades relacionadas
    switch (entity) {
      case 'animals':
        keys.push('api:animalDiseases', 'api:animalFields', 'api:geneticImprovements');
        break;
      case 'diseases':
        keys.push('api:animalDiseases');
        break;
      case 'fields':
        keys.push('api:animalFields');
        break;
      case 'treatments':
        keys.push('api:treatmentMedications');
        break;
    }
    
    return keys;
  },

  // Función de utilidad para convertir claves "api:" a URLs reales
  getRealURL: (cacheKey: string): string => {
    const apiBaseURL = getApiBaseURL();
    if (cacheKey.startsWith('api:')) {
      const endpoint = cacheKey.substring(4); // Remover "api:"
      return `${apiBaseURL}/${endpoint}`;
    }
    return cacheKey; // Si no es una clave "api:", devolver como está
  }
};
