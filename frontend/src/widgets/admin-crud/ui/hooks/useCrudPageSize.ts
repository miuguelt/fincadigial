import { useCallback, useMemo } from 'react';
import { getPageSizeOptions } from '../crudPage.helpers';

const PAGE_SIZE_STORAGE_PREFIX = 'crud:pageSize:';

function readStoredPageSize(entityKey: string): number | null {
  try {
    const raw = window.localStorage.getItem(`${PAGE_SIZE_STORAGE_PREFIX}${entityKey}`);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 1000 ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredPageSize(entityKey: string, size: number): void {
  try {
    window.localStorage.setItem(`${PAGE_SIZE_STORAGE_PREFIX}${entityKey}`, String(size));
  } catch {
    // Modo privado o cuota llena: la preferencia simplemente no se recuerda.
  }
}

interface UseCrudPageSizeArgs {
  entityKey: string;
  config: any;
  pageSize: number;
  setLimit?: (limit: number) => void;
  setPage?: (page: number) => void;
}

/**
 * Cuántos registros por página quiere ver ESTE usuario en ESTA pantalla.
 *
 * Se recuerda entre visitas: quien trabaja con el hato completo no debería
 * volver a subir el tamaño de página cada vez que entra.
 */
export function useCrudPageSize({ entityKey, config, pageSize, setLimit, setPage }: UseCrudPageSizeArgs) {
  const storedPageSize = useMemo(() => readStoredPageSize(entityKey), [entityKey]);

  const pageSizeOptions = useMemo(() => getPageSizeOptions(config, pageSize), [config, pageSize]);

  const handlePageSizeChange = useCallback((size: number) => {
    writeStoredPageSize(entityKey, size);
    setLimit?.(size);
    setPage?.(1);
  }, [entityKey, setLimit, setPage]);

  return { storedPageSize, pageSizeOptions, handlePageSizeChange };
}
