import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/model/useAuth';

export function useMarketQuery<T>(key: readonly unknown[], queryFn: () => Promise<T>, enabled = true) {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['marketplace', user?.id, user?.finca_id, ...key], queryFn,
    enabled: enabled && !!user, gcTime: 0, staleTime: 5000, retry: false,
    refetchInterval: 20000, refetchIntervalInBackground: false, refetchOnWindowFocus: true,
  });
  useEffect(() => {
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ endpoint?: string; resource?: string }>).detail;
      const path = detail?.endpoint ?? detail?.resource;
      if (!path || path.includes('market-offers')) void client.invalidateQueries({ queryKey: ['marketplace'] });
    };
    window.addEventListener('server-resource-changed', refresh);
    return () => window.removeEventListener('server-resource-changed', refresh);
  }, [client]);
  return query;
}
