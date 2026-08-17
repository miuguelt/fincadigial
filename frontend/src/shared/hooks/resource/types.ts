export interface UseResourceOptions<P extends Record<string, any> = any> {
  autoFetch?: boolean;            // Ejecutar fetch inicial (default true)
  initialParams?: P;              // Parámetros iniciales para getAll/getPaginated
  deps?: any[];                   // Dependencias que re-disparan el fetch
  map?: <T>(items: T[]) => T[];   // Transformación opcional de la data
  cache?: boolean;                // Si true intenta reusar cache interna del servicio
  cacheTTL?: number;              // TTL para cache persistente (CacheContext)
  cacheKeyPrefix?: string;        // Prefijo opcional para la clave de caché
  filters?: Record<string, any>;  // Filtros dinámicos adicionales (ej. smart filters)
  // Opciones de tiempo real
  enableRealtime?: boolean;       // Habilita polling y refetch en foco/online
  pollIntervalMs?: number;        // Intervalo de polling (min 2000ms)
  refetchOnFocus?: boolean;       // Refrescar al recuperar foco/visibilidad (default true)
  refetchOnReconnect?: boolean;   // Refrescar al reconectar red (default true)
}

export interface UseResourceResult<T, P extends Record<string, any>> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: (params?: P) => Promise<T[]>;
  createItem: (payload: Partial<T>) => Promise<T | null>;
  updateItem: (id: number | string, payload: Partial<T>) => Promise<T | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: React.Dispatch<React.SetStateAction<T[]>>; // escape hatch
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
  refreshing?: boolean;           // Refresco suave, para no parpadear la lista
}
