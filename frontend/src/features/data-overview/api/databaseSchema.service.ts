import api from '@/shared/api/client';
import { normalizeSchemaModels, type SchemaModel } from '../model/databaseSchema';

export async function getDatabaseSchema(): Promise<SchemaModel[]> {
  const response = await api.get('/docs/schema', { params: { cache_bust: Date.now() } });
  return normalizeSchemaModels(response.data);
}
