import { useCallback, useState } from 'react';
import type { ToastType } from '@/app/providers/ToastContext';
import { addTombstone } from '@/shared/api/cache/tombstones';

/** El backend puede seguir devolviendo lo borrado; se oculta mientras tanto. */
const TOMBSTONE_TTL_MS = 120000;
const REFETCH_DELAY_MS = 300;

export interface DependencyInfo {
  hasDependencies: boolean;
  canDelete: boolean;
  totalDependencies: number;
  message: string;
  dependencies: Array<{
    table: string;
    count: number;
    field: string;
    cascade_delete: boolean;
    message: string;
  }>;
}

interface UseCrudDeleteArgs<T extends { id: number }> {
  config: any;
  service: any;
  entityKey: string;
  canDelete: boolean;
  deleteItem: (id: number) => Promise<boolean>;
  items: T[];
  currentPage: number;
  setPage?: (page: number) => void;
  refetch: () => Promise<any>;
  onDeleted: (id: number) => void;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

/**
 * Borrado con confirmación informada.
 *
 * Antes de confirmar se consulta qué depende del registro, para que el diálogo
 * diga qué se va a arrastrar en lugar de un aviso genérico.
 */
export function useCrudDelete<T extends { id: number }>(args: UseCrudDeleteArgs<T>) {
  const {
    config, service, entityKey, canDelete, deleteItem, items,
    currentPage, setPage, refetch, onDeleted, showToast,
  } = args;

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
  const [dependencyInfo, setDependencyInfo] = useState<DependencyInfo | null>(null);

  const resetConfirmState = useCallback(() => {
    setTargetId(null);
    setDependencyInfo(null);
    setIsCheckingDependencies(false);
  }, []);

  const openDeleteConfirm = useCallback(async (id: number) => {
    if (!canDelete) return;
    setTargetId(id);
    setConfirmOpen(true);

    const shouldCheckDependencies = config.checkDependencies !== false;
    setIsCheckingDependencies(shouldCheckDependencies);
    setDependencyInfo(null);

    try {
      if (shouldCheckDependencies && service && typeof service.customRequest === 'function') {
        const resp = await service.customRequest(`${id}/dependencies`, 'GET');
        if (resp && typeof resp === 'object') {
          const info = resp.data || resp;
          setDependencyInfo({
            hasDependencies: info.hasDependencies ?? false,
            canDelete: info.canDelete ?? true,
            totalDependencies: info.totalDependencies ?? 0,
            message: info.message ?? '',
            dependencies: info.dependencies ?? [],
          });
        }
      }
    } catch (err) {
      // Sin información de dependencias el diálogo sigue siendo utilizable.
      console.error('Error fetching dependencies for deletion:', err);
      setDependencyInfo(null);
    } finally {
      setIsCheckingDependencies(false);
    }
  }, [canDelete, config.checkDependencies, service]);

  const handleConfirmDelete = useCallback(async () => {
    if (targetId == null || !canDelete) return;

    const idToDelete = targetId;
    setConfirmOpen(false);
    resetConfirmState();

    try {
      const success = await deleteItem(idToDelete);
      if (!success) return;

      showToast(`🗑️ ${config.entityName} eliminado correctamente`, 'success');
      addTombstone(entityKey, String(idToDelete), TOMBSTONE_TTL_MS);
      onDeleted(idToDelete);

      // Si la página se queda sin filas, retroceder una.
      if (items.length - 1 === 0 && currentPage > 1 && setPage) {
        setPage(currentPage - 1);
      }

      if (typeof service.clearCache === 'function') {
        try {
          await service.clearCache();
        } catch (err) {
          console.warn('[AdminCRUDPage] Error al limpiar caché del servicio:', err);
        }
      }

      setTimeout(async () => {
        try {
          await refetch();
        } catch (err) {
          console.error('Error al refrescar datos después de eliminar:', err);
        }
      }, REFETCH_DELAY_MS);
    } catch (error: any) {
      const detail = error?.response?.data?.message
        || error?.response?.data?.detail
        || error?.message;
      showToast(detail || `Error al eliminar ${config.entityName.toLowerCase()}`, 'error');
    }
  }, [
    canDelete, targetId, deleteItem, entityKey, items, currentPage, setPage,
    refetch, config.entityName, service, showToast, onDeleted, resetConfirmState,
  ]);

  return {
    confirmOpen,
    setConfirmOpen,
    isCheckingDependencies,
    dependencyInfo,
    openDeleteConfirm,
    handleConfirmDelete,
    resetConfirmState,
  };
}
