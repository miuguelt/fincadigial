import { useQuery } from '@tanstack/react-query';
import { getDatabaseSchema } from '../api/databaseSchema.service';

export function useDatabaseSchema() {
  return useQuery({
    queryKey: ['database-schema'],
    queryFn: getDatabaseSchema,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
