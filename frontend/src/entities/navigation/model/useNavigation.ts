import { useState, useCallback } from 'react';
import { NavigationStructure, QuickAccessEndpoint } from './types';
import { navigationService } from '../api/navigation.service';

export function useNavigation() {
  const [structure, setStructure] = useState<NavigationStructure | null>(null);
  const [quickAccess, setQuickAccess] = useState<QuickAccessEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStructure = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await navigationService.getStructure();
      setStructure(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estructura de navegación');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuickAccess = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await navigationService.getQuickAccess();
      setQuickAccess(response.endpoints || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar acceso rápido');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    structure,
    quickAccess,
    loading,
    error,
    fetchStructure,
    fetchQuickAccess,
  };
}
