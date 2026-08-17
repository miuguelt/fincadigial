// ﻿import type { BaseService } from '@/shared/api/base-service';

export interface UseResourceOptions<P extends Record<string, any> = any> {
  autoFetch?: boolean;
  initialParams?: P;
  deps?: any[];
  map?: <T>(items: T[]) => T[];
  cache?: boolean;
  cacheTTL?: number;
  cacheKeyPrefix?: string;
  enableRealtime?: boolean;
  pollIntervalMs?: number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export interface UseResourceResult<T, P extends Record<string, any>> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: (params?: P) => Promise<T[]>;
  createItem: (payload: Partial<T>) => Promise<T | null>;
  updateItem: (id: number | string, payload: Partial<T>) => Promise<T | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    rawMeta?: any;
  } | null;
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
  setSearch?: (s: string) => void;
  setFields?: (f: string) => void;
  refreshing?: boolean;
}
