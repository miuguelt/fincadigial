/*
 * AdminCRUDPage
 *
 * Versión optimizada y refactorizada del componente AdminCRUDPage original.
 *
 * Mejoras implementadas:
 * - División en componentes más pequeños y especializados
 * - Optimización del rendimiento con memoización y virtualización
 * - Simplificación del manejo de estado
 * - Mejora de la experiencia de usuario con animaciones más sutiles
 * - Mejor accesibilidad y diseño responsivo
 *
 * @example
 * ```tsx
 * <AdminCRUDPage
 *   config={crudConfig}
 *   service={animalService}
 *   initialFormData={initialData}
 * />
 * ```
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useResource } from '@/shared/hooks/useResource';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { useT } from '@/shared/i18n';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { resolveEntity, roleCan } from '@/shared/lib/rbac';

// Componentes especializados
import { CRUDTable } from './CRUDTable';
import { CRUDForm } from './CRUDForm';
import { CRUDPagination } from './CRUDPagination';
import { DetailModal, ConfirmDeleteDialog } from './CRUDModals';
import { CRUDToolbar } from './CRUDToolbar';

// Componentes de UI
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { EmptyState } from '@/widgets/feedback/EmptyState';
import { ErrorState } from '@/widgets/feedback/ErrorState';
import { SkeletonTable } from '@/widgets/feedback/SkeletonTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { FloatingScrollArea } from '@/shared/ui/FloatingScrollArea';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { extractValidationErrors, getCrudErrorMessage, getPageSizeOptions, withoutTombstones } from './crudPage.helpers';

// Utilidades
import { addTombstone, getTombstoneIds, clearExpired } from '@/shared/api/cache/tombstones';
import { validateFormSections } from '@/shared/utils/formValidation';
import { formatValidationToastMessage, mapBackendFieldErrorsToLabels, buildConflictMessage } from '@/shared/utils/validationMessages';

// Interfaces
import type { CRUDConfig } from '../../../shared/types/crud';
import { useCrudFormState } from './hooks/useCrudFormState';
import { useCrudSelection } from './hooks/useCrudSelection';

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

export interface AdminCRUDPageProps<T extends { id: number }, TInput extends Record<string, any>> {
  config: CRUDConfig<T, TInput>;
  service: any; // BaseService instance
  initialFormData: TInput;
  mapResponseToForm?: (item: T) => TInput;
  validateForm?: (formData: TInput) => string | null;
  customDetailContent?: (item: T, navigateToItem?: (item: T) => void) => React.ReactNode;
  onFormDataChange?: (formData: TInput) => void;
  // Opciones de tiempo real
  realtime?: boolean;
  pollIntervalMs?: number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  // Opciones de estilo hover personalizado
  enhancedHover?: boolean;
  // Contenido adicional para el formulario
  additionalFormContent?: (formData: TInput, editingItem: T | null) => React.ReactNode;
  onItemsChange?: (items: T[]) => void;
  onOpenDetail?: (item: T) => void;
  selectedIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
  // Filtros dinámicos desde el contenedor superior
  filters?: Record<string, any>;
}

export function AdminCRUDPage<T extends { id: number }, TInput extends Record<string, any>>({
  config,
  service,
  initialFormData,
  mapResponseToForm,
  validateForm,
  customDetailContent,
  onFormDataChange: _onFormDataChange,
  realtime,
  pollIntervalMs,
  refetchOnFocus,
  refetchOnReconnect,
  enhancedHover = true,
  additionalFormContent,
  onItemsChange,
  onOpenDetail: externalOnOpenDetail,
  filters,
}: AdminCRUDPageProps<T, TInput>) {
  // Estados simplificados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    formErrorMessages,
    setFormErrorMessages,
    resetForm,
    updateFieldValue,
  } = useCrudFormState(initialFormData, config);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para modales
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<T | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const editRequestSeqRef = useRef(0);
  const suppressEditAutoOpenRef = useRef(false);
  const lastClosedEditIdRef = useRef<number | null>(null);

  // Estados para confirmación y dependencias
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);
  const [dependencyInfo, setDependencyInfo] = useState<{
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
  } | null>(null);

  // Hooks y utilidades
  const { showToast } = useToast();
  const t = useT();
  const { role, user } = useAuth() as any;
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentRole = normalizeRole(role || user?.role) || String(role || user?.role || '');
  const permissionEntity = useMemo(
    () => resolveEntity(config.permissionEntity || config.entityName),
    [config.permissionEntity, config.entityName],
  );
  const canCreate = useMemo(
    () => config.enableCreateModal !== false && roleCan(currentRole, permissionEntity, 'create'),
    [config.enableCreateModal, currentRole, permissionEntity],
  );
  const canUpdate = useMemo(
    () => config.enableEditModal !== false && roleCan(currentRole, permissionEntity, 'update'),
    [config.enableEditModal, currentRole, permissionEntity],
  );
  const canDelete = useMemo(
    () => Boolean(config.enableDelete) && roleCan(currentRole, permissionEntity, 'delete'),
    [config.enableDelete, currentRole, permissionEntity],
  );

  // Clave de entidad para tombstones persistentes
  const entityKey = useMemo(() => (config.entityName || 'entity').toLowerCase(), [config.entityName]);

  // Limpiar tombstones expirados al montar
  useEffect(() => {
    clearExpired(entityKey);
  }, [entityKey]);

  /*
   * Cuántos registros por página quiere ver ESTE usuario en ESTA pantalla.
   * Se recuerda entre visitas: quien trabaja con el hato completo no debería
   * volver a subir el tamaño de página cada vez que entra.
   */
  const storedPageSize = useMemo(() => readStoredPageSize(entityKey), [entityKey]);

  // Configuración de recursos
  const {
    data: items,
    loading,
    error,
    meta,
    setPage,
    setLimit,
    createItem,
    updateItem,
    deleteItem,
    refetch,
    refreshing,
  } = useResource<T, any>(service as any, {
    autoFetch: true,
    initialParams: {
      page: 1,
      limit: storedPageSize || config.defaultLimit || 50,
      fields: config.defaultFields,
      ...(config.additionalFilters || {})
    },
    filters: filters,
    enableRealtime: realtime === true,
    pollIntervalMs: typeof pollIntervalMs === 'number' ? pollIntervalMs : undefined,
    refetchOnFocus,
    refetchOnReconnect,
  });

  // Escuchar eventos globales de refresco para sincronización en tiempo real
  useEffect(() => {
    const handleRefetch = () => {
      refetch();
    };
    window.addEventListener('crud:refetch', handleRefetch);
    window.addEventListener('animal-fields:updated', handleRefetch);
    return () => {
      window.removeEventListener('crud:refetch', handleRefetch);
      window.removeEventListener('animal-fields:updated', handleRefetch);
    };
  }, [refetch]);

  // Paginación
  const pageFromURL = parseInt((searchParams.get('page') || '').toString(), 10);
  const currentPage = Number.isFinite(pageFromURL) && pageFromURL > 0 ? pageFromURL : (meta?.page || 1);
  const pageSize = meta?.limit || 10;
  const totalItems = meta?.total || 0;
  const totalPages = meta?.totalPages || Math.ceil(totalItems / pageSize);

  /*
   * Selector de registros por página (`null` en la config lo desactiva).
   * El tamaño vigente SIEMPRE entra en la lista: si `defaultLimit` no coincidía
   * con ninguna opción, el desplegable mostraba la primera y mentía sobre
   * cuántos registros se están viendo.
   */
  const pageSizeOptions = useMemo(() => {
    return getPageSizeOptions(config, pageSize);
  }, [config, pageSize]);

  const handlePageSizeChange = useCallback((size: number) => {
    writeStoredPageSize(entityKey, size);
    setLimit?.(size);
    setPage?.(1);
  }, [entityKey, setLimit, setPage]);

  // Filtrar items para excluir tombstones
  const filteredItems = useMemo(() => {
    return withoutTombstones(items || [], getTombstoneIds(entityKey));
  }, [items, entityKey]);
  const { selectedIds, toggleSelect, clearSelection, toggleSelectAll } = useCrudSelection(filteredItems);

  useEffect(() => {
    if (onItemsChange) {
      onItemsChange(filteredItems);
    }
  }, [filteredItems, onItemsChange]);

  // Handlers
  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setEditingItem(null);
    resetForm();
    setIsModalOpen(true);
  }, [canCreate, resetForm]);

  const openEdit = useCallback((item: T) => {
    if (!canUpdate) return;
    setEditingItem(item);
    const formValues = mapResponseToForm ? mapResponseToForm(item) : (item as unknown as TInput);
    setFormData(formValues);
    setFormErrors({});
    setFormErrorMessages([]);
    setIsModalOpen(true);
  }, [canUpdate, mapResponseToForm, setFormData, setFormErrors, setFormErrorMessages]);

  const openDetail = useCallback((item: T) => {
    if (externalOnOpenDetail) {
      externalOnOpenDetail(item);
      return;
    }
    const idx = filteredItems.findIndex((i) => i.id === item.id);
    const safeIndex = idx >= 0 ? idx : 0;
    setDetailIndex(safeIndex);
    setDetailItem(filteredItems[safeIndex] || item);
    setIsDetailOpen(true);
  }, [filteredItems, externalOnOpenDetail]);

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
            dependencies: info.dependencies ?? []
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dependencies for deletion:', err);
      setDependencyInfo(null);
    } finally {
      setIsCheckingDependencies(false);
    }
  }, [canDelete, config.checkDependencies, service]);

  const handleModalClose = useCallback(() => {
    if (editingItem?.id) {
      editRequestSeqRef.current += 1;
      suppressEditAutoOpenRef.current = true;
      lastClosedEditIdRef.current = editingItem.id;
    } else {
      suppressEditAutoOpenRef.current = false;
      lastClosedEditIdRef.current = null;
    }
    setIsModalOpen(false);
    resetForm();
    setEditingItem(null);

    const sp = new URLSearchParams(searchParams);
    let changed = false;
    if (sp.has('create')) { sp.delete('create'); changed = true; }
    if (sp.has('edit')) { sp.delete('edit'); changed = true; }
    if (changed) {
      setSearchParams(sp, { replace: true });
    } else if (location.pathname.includes('form')) {
      navigate(-1);
    }
  }, [searchParams, setSearchParams, navigate, location.pathname, editingItem, resetForm]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem?.id ? !canUpdate : !canCreate) {
      showToast('No tienes permisos para realizar esta acción.', 'error');
      return;
    }

    const validation = validateFormSections(config.formSections || [], formData as any);
    if (validation.messages.length > 0) {
      setFormErrors(validation.errors);
      setFormErrorMessages(validation.messages);
      showToast(formatValidationToastMessage(validation.messages), 'error');
      const firstKey = Object.keys(validation.errors)[0];
      if (firstKey && typeof window !== 'undefined') {
        setTimeout(() => {
          const el = document.getElementById(firstKey);
          if (el && 'focus' in el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (el as HTMLElement).focus();
          }
        }, 0);
      }
      return;
    }

    if (validateForm) {
      const validationError = validateForm(formData);
      if (validationError) {
        showToast(validationError, 'warning');
        return;
      }
    }

    setSaving(true);

    try {
      if (editingItem?.id) {
        // version_id del registro que se abrió a editar: el backend responde 409
        // si otro usuario guardó cambios mientras este formulario estaba abierto.
        const editingVersion = (editingItem as any)?.version_id;
        const payload = editingVersion !== undefined && editingVersion !== null
          ? { ...(formData as any), version_id: editingVersion }
          : (formData as any);
        const result = await updateItem(editingItem.id, payload);
        showToast(`✅ ${config.entityName} actualizado correctamente`, 'success');
        if (config.onAfterUpdate) {
          try {
            await config.onAfterUpdate(result);
          } catch (err) {
            console.error('Error in onAfterUpdate hook:', err);
          }
        }
      } else {
        const result = await createItem(formData as any);
        showToast(`✅ ${config.entityName} creado correctamente`, 'success');

        if (config.onAfterCreate) {
          try {
            await config.onAfterCreate(result);
          } catch (err) {
            console.error('Error in onAfterCreate hook:', err);
          }
        }

        // Volver a la página 1 después de crear
        if (setPage && meta?.page && meta.page > 1) {
          setPage(1);
        }
      }

      handleModalClose();

      // Invalidar caché del servicio para asegurar datos frescos
      if (typeof service.clearCache === 'function') {
        try {
          await service.clearCache();
        } catch (e) {
          console.warn('[AdminCRUDPage] Error al limpiar caché del servicio:', e);
        }
      }

      // Refrescar datos después de un breve delay
      setTimeout(async () => {
        try {
          await refetch();
        } catch (error) {
          console.error('Error al refrescar datos:', error);
        }
      }, 300);
    } catch (error: any) {
      let errorMessage = getCrudErrorMessage(error, `${t('crud.save_error', 'Error al guardar')} ${config.entityName.toLowerCase()}`);
      const validationErrors = extractValidationErrors(error);

      if (validationErrors && typeof validationErrors === 'object') {
        try {
          const mapped: Record<string, string> = {};
          const msgs: string[] = [];
          Object.entries(validationErrors).forEach(([field, msgsRaw]) => {
            const msg = Array.isArray(msgsRaw) ? msgsRaw.join(', ') : String(msgsRaw);
            mapped[String(field)] = msg;
            msgs.push(`${String(field)}: ${msg}`);
          });
          if (Object.keys(mapped).length > 0) {
            setFormErrors(mapped);
            setFormErrorMessages(msgs);
          }
        } catch {
          // ignore
        }
      }

      if (validationErrors && typeof validationErrors === 'object') {
        const mapped = mapBackendFieldErrorsToLabels(validationErrors, config.formSections || []);
        if (Object.keys(mapped.errors).length > 0) {
          setFormErrors(mapped.errors);
          setFormErrorMessages(mapped.messages);
          errorMessage = formatValidationToastMessage(mapped.messages);
        }
      } else if (
        typeof errorMessage === 'string' &&
        errorMessage.toLowerCase().includes('validaci') &&
        formErrorMessages.length > 0
      ) {
        errorMessage = formatValidationToastMessage(formErrorMessages);
      }

      const status = (error as any)?.status ?? error?.response?.status;
      if (status === 409) {
        const traceId =
          (error as any)?.traceId ||
          error?.response?.data?.error?.trace_id ||
          error?.response?.data?.error?.traceId ||
          error?.response?.data?.trace_id ||
          error?.response?.data?.traceId;
        const details =
          (error as any)?.details ??
          error?.response?.data?.error?.details ??
          error?.response?.data?.details;
        const conflict = buildConflictMessage(details, config.formSections || []);
        const suffix = traceId ? ` (Trace ID: ${traceId})` : '';
        errorMessage = `${conflict.message}${suffix}`;
        if (conflict.field) {
          try {
            setFormErrors(prev => ({ ...(prev || {}), [String(conflict.field)]: conflict.message }));
            setFormErrorMessages(prev => [conflict.message, ...(Array.isArray(prev) ? prev : [])]);
          } catch { /* noop */ }
        }
      }

      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  }, [canCreate, canUpdate, formData, validateForm, editingItem, updateItem, createItem, setPage, meta, handleModalClose, refetch, config, service, t, showToast, setFormErrors, setFormErrorMessages, formErrorMessages]);

  const handleConfirmDelete = useCallback(async () => {
    if (targetId == null || !canDelete) return;

    const idToDelete = targetId;
    setConfirmOpen(false);
    setTargetId(null);
    setDependencyInfo(null);
    setIsCheckingDependencies(false);

    try {
      const success = await deleteItem(idToDelete);

      if (success) {
        showToast(`🗑️ ${config.entityName} eliminado correctamente`, 'success');

        // Registrar tombstone para ocultar temporalmente si el backend aún lo devuelve
        addTombstone(entityKey, String(idToDelete), 120000);

        // Cerrar modales si el item eliminado estaba abierto
        if (isDetailOpen && detailItem?.id === idToDelete) {
          setIsDetailOpen(false);
          setDetailIndex(null);
        }
        if (isModalOpen && editingItem?.id === idToDelete) {
          setIsModalOpen(false);
          setEditingItem(null);
        }

        // Verificar si después de eliminar, la página actual quedará vacía
        const currentPageItems = filteredItems.length - 1;
        const willBeEmpty = currentPageItems === 0;

        if (willBeEmpty && currentPage > 1 && setPage) {
          setPage(currentPage - 1);
        }

        // Invalidar caché del servicio para asegurar datos frescos
        if (typeof service.clearCache === 'function') {
          try {
            await service.clearCache();
          } catch (e) {
            console.warn('[AdminCRUDPage] Error al limpiar caché del servicio:', e);
          }
        }

        // Refrescar después de un breve delay
        setTimeout(async () => {
          try {
            await refetch();
          } catch (error) {
            console.error('Error al refrescar datos después de eliminar:', error);
          }
        }, 300);
      }
    } catch (error: any) {
      let errorMessage = `Error al eliminar ${config.entityName.toLowerCase()}`;

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showToast(errorMessage, 'error');
    }
  }, [canDelete, targetId, deleteItem, entityKey, isDetailOpen, detailItem, isModalOpen, editingItem, filteredItems, currentPage, setPage, refetch, config.entityName, service, showToast]);

  // Sincronizar búsqueda con URL - solo cuando el usuario escribe
  useEffect(() => {
    const handle = setTimeout(() => {
      const sp = new URLSearchParams(window.location.search);
      const currentSearchInURL = sp.get('search') || '';

      // Solo actualizar si realmente cambió
      if (searchQuery === currentSearchInURL) {
        return;
      }

      if (searchQuery) sp.set('search', searchQuery);
      else sp.delete('search');
      sp.set('page', '1');
      setSearchParams(sp, { replace: true });
      // NO llamar a setSearch aquí - useResource leerá searchQP directamente de la URL
    }, 300);

    return () => clearTimeout(handle);
  }, [searchQuery, setSearchParams]);

  // Sincronizar estado con URL de forma reactiva
  useEffect(() => {
    const search = (searchParams.get('search') || '').toString();
    if (searchQuery !== search) {
      setSearchQuery(search);
    }
  }, [searchParams, searchQuery]);

  const handleUpdateCell = useCallback(async (item: T, key: string, value: any) => {
    if (!canUpdate) return;
    await updateItem(item.id, { [key]: value } as any);
  }, [canUpdate, updateItem]);

  // Auto-open create modal via ?create=1
  useEffect(() => {
    if (canCreate) {
      const c = searchParams.get('create');
      if (c && !isModalOpen) {
        openCreate();
      }
    }
  }, [searchParams, canCreate, isModalOpen, openCreate]);

  // Auto-open edit modal via ?edit=ID
  useEffect(() => {
    if (canUpdate) {
      const e = searchParams.get('edit');
      if (!e) {
        suppressEditAutoOpenRef.current = false;
        lastClosedEditIdRef.current = null;
        return;
      }
      if (suppressEditAutoOpenRef.current && e === String(lastClosedEditIdRef.current ?? '')) {
        return;
      }
      if (e) {
        const id = Number(e);
        if (!Number.isNaN(id) && (!isModalOpen || !editingItem || editingItem.id !== id)) {
          const requestSeq = editRequestSeqRef.current + 1;
          editRequestSeqRef.current = requestSeq;
          (async () => {
            try {
              const item = await service.getById(id);
              if (editRequestSeqRef.current !== requestSeq) {
                return;
              }
              const currentEdit = new URLSearchParams(window.location.search).get('edit');
              if (currentEdit !== String(id)) {
                return;
              }
              openEdit(item);
            } catch (err) {
              showToast(t('common.errorLoading', 'No se pudo cargar el registro para edición'), 'error');
              const sp = new URLSearchParams(searchParams);
              sp.delete('edit');
              setSearchParams(sp, { replace: true });
            }
          })();
        }
      }
    }
  }, [searchParams, canUpdate, isModalOpen, editingItem, service, openEdit, showToast, t, setSearchParams]);

  // Header con búsqueda y botones
  const header = (
    <PageHeader
      title={config.title}
      dense
      className="mb-0 p-0"
      titleClassName="text-base sm:text-lg lg:text-xl"
      actions={
        <CRUDToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder={config.searchPlaceholder}
          onOpenCreate={canCreate ? openCreate : undefined} createLabel={`${t('common.create', 'Crear')} ${config.entityName.toLowerCase()}`}
          customToolbar={config.customToolbar}
        />
      }
    />
  );

  // Loading state
  if (loading && !items) {
    return (
      <AppLayout
        header={header}
        className="px-2 sm:px-3 pt-0 sm:pt-1 pb-0 max-w-full min-h-0"
        contentClassName="space-y-0"
      >
        <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-lg shadow-lg overflow-hidden">
          <SkeletonTable
            columnLabels={config.columns.map((c: any) => c.label)}
            columnWidths={config.columns.map((c: any) => c.width)}
            rows={8}
          />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AppLayout
        header={header}
        className="px-2 sm:px-3 pt-1 sm:pt-2 pb-0 sm:pb-0 md:pb-0 lg:pb-0 max-w-full min-h-0"
        contentClassName="space-y-0"
      >
        <ErrorState
          message={String(error)}
          onRetry={() => window.location.reload()}
        />
      </AppLayout>
    );
  }

  // Empty state
  const empty = (filteredItems?.length || 0) === 0;

  /*
   * Estándar de pantallas de datos §1.1: con filas en pantalla, el bloque de
   * contexto (métricas, pestañas, filtros) viaja DENTRO del área con scroll
   * para no restarle alto a la tabla. Excepciones:
   *  - estado vacío: no hay alto que ganar, el encabezado se queda arriba;
   *  - `renderGrouped`: la vista agrupada gestiona su propio scroll.
   */
  const usesScrollableHeader = Boolean(config.customHeader) && !empty && !config.renderGrouped;

  return (
    <AppLayout
      header={header}
      className={cn(
        "px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 max-w-full min-h-0 flex flex-col",
        // renderGrouped (tableros) gestiona su propio scroll: necesita la altura completa.
        (config.viewMode === 'cards' || config.autoHeight) && !config.renderGrouped ? "h-auto pb-6" : "h-full pb-0"
      )}
      contentClassName={cn(
        "space-y-4 sm:space-y-5 flex flex-col",
        (config.viewMode === 'cards' || config.autoHeight) && !config.renderGrouped ? "h-auto" : "flex-1 min-h-0"
      )}
    >
      {config.customHeader && !usesScrollableHeader && (
        <div className="flex-shrink-0">
          {config.customHeader}
        </div>
      )}

      {empty ? (
        <EmptyState
          title={config.emptyStateMessage || `${t('state.empty.title', 'Sin datos')}: ${config.entityName}`}
          description={config.emptyStateDescription || t('state.empty.description', 'Crea el primer registro para comenzar.')}
          icon={config.emptyStateIcon}
          action={canCreate && (
            <button onClick={openCreate} aria-label={`${t('common.create', 'Crear')} registro desde el estado vacío`}>
              <Plus className="h-4 w-4 mr-2" />
              {t('common.create', 'Crear')} {config.entityName.toLowerCase()}
            </button>
          )}
        />
      ) : config.viewMode === 'cards' ? (
        <div className="flex flex-col flex-1 min-h-0 mt-1">
          {config.renderGrouped ? (
            <div className="flex-1 min-h-0 rounded-xl flex flex-col overflow-hidden">
              {config.renderGrouped(filteredItems)}
            </div>
          ) : (
            <FloatingScrollArea
              containerClassName="flex-1 rounded-xl"
              horizontal={false}
              className="p-2 sm:p-3 lg:p-4 pb-20 md:pb-24"
            >
              {usesScrollableHeader && config.customHeader}
              <div className={`grid ${config.cardGridClassName || 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-3 sm:gap-4 lg:gap-5 auto-rows-fr`}>
                {filteredItems.map((item) => {
                  const firstCol = config.columns[0];
                  const rawTitle = (item as any)[firstCol?.key];
                  const titleText = String(rawTitle ?? `${config.entityName} #${item.id}`);
                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:shadow-md",
                        selectedIds.includes((item as any).id) && "ring-2 ring-primary/70 shadow-primary/10"
                      )}
                      onClick={config.renderCard ? undefined : () => { config.enableDetailModal !== false && openDetail(item); }}
                      role={config.renderCard ? undefined : "button"}
                      tabIndex={config.renderCard ? undefined : 0}
                      onKeyDown={config.renderCard ? undefined : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          config.enableDetailModal !== false && openDetail(item);
                        }
                      }}
                    >
                      {config.enableSelection && (
                        <div
                          className="absolute right-3 top-3 z-30 rounded-xl border border-border/80 bg-card p-2 shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                             checked={selectedIds.includes((item as any).id)}
                            onCheckedChange={() => toggleSelect((item as any).id)}
                            aria-label={`Seleccionar ${config.entityName} ${(item as any).id}`}
                            title="Seleccionar para acciones de traslado"
                          />
                        </div>
                      )}
                      {!config.renderCard && (
                        <CardHeader className="py-3 flex-shrink-0 border-b border-border/30">
                          <CardTitle className="text-sm font-semibold fit-clamp" title={titleText}>{titleText}</CardTitle>
                        </CardHeader>
                      )}
                      <CardContent className={config.renderCard ? '!p-0 w-full min-w-0 flex-1 flex flex-col min-h-0 overflow-hidden' : 'py-2.5 px-3 flex-1 flex flex-col min-h-0 overflow-hidden'}>
                        {config.renderCard ? (
                          config.renderCard(item, (target) => {
                            if (config.enableDetailModal !== false) openDetail(target);
                          })
                        ) : (
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {config.columns.map((col: any) => {
                              const raw = (item as any)[col.key];
                              return (
                                <div key={String(col.key)} className="min-w-0 space-y-1">
                                  <div className="text-muted-foreground font-medium text-[11px] uppercase tracking-wide">{col.label}</div>
                                  <div className="fit-clamp font-medium text-foreground" title={String(raw ?? '-')}>{String(raw ?? '-')}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </FloatingScrollArea>
          )}

          {!config.hidePagination && (
            <CRUDPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage || ((_page: number) => {})}
              loading={loading}
              hasSelection={selectedIds.length > 0}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      ) : (
        <>
          <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0 mt-1">
            <CRUDTable
              headerSlot={usesScrollableHeader ? config.customHeader : undefined}
              items={filteredItems}
              columns={config.columns}
              config={config}
              onOpenDetail={config.enableDetailModal !== false ? openDetail : undefined}
              onOpenEdit={canUpdate ? openEdit : undefined}
              onOpenDelete={canDelete ? openDeleteConfirm : undefined}
              enhancedHover={enhancedHover}
              refreshing={refreshing}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onUpdateCell={canUpdate ? handleUpdateCell : undefined}
            />
          </div>

          {!config.hidePagination && (
            <CRUDPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setPage || ((_page: number) => {})}
              loading={loading}
              hasSelection={selectedIds.length > 0}
              pageSize={pageSize}
              pageSizeOptions={pageSizeOptions}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </>
      )}

      {/* Batch actions bar */}
      {config.enableSelection && selectedIds.length > 0 && config.batchActions && (
        config.batchActions(selectedIds, filteredItems, clearSelection, { openCreate })
      )}

      {/* Create/Edit Modal */}
      {(canCreate || canUpdate) && (
        <CRUDForm
          isOpen={isModalOpen}
          onOpenChange={handleModalClose}
          title={editingItem ? `${t('common.edit', 'Editar')} ${config.entityName}: ${editingItem.id}` : `${t('common.create', 'Crear')} ${config.entityName}`}
          formData={formData}
          setFormData={setFormData as unknown as React.Dispatch<React.SetStateAction<Record<string, any>>>}
          formSections={config.formSections || []}
          fieldErrors={formErrors}
          onFieldValueChange={updateFieldValue}
          onSubmit={handleSubmit}
          saving={saving}
          editingItem={editingItem}
          showEditTimestamps={config.showEditTimestamps}
          additionalFormContent={additionalFormContent as any}
        />
      )}

      {/* Detail Modal */}
      {config.enableDetailModal !== false && (
        <DetailModal
          isOpen={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={detailItem ? `Detalle del ${config.entityName}${config.showIdInDetailTitle === false ? '' : `: ${detailItem.id}`}` : `Detalle del ${config.entityName}`}
          item={detailItem}
          config={config}
          onEdit={canUpdate ? openEdit : undefined}
          customDetailContent={customDetailContent}
          showDetailTimestamps={config.showDetailTimestamps}
          showIdInDetailTitle={config.showIdInDetailTitle}
          detailIndex={detailIndex}
          setDetailIndex={setDetailIndex}
          items={filteredItems}
          setDetailItem={setDetailItem}
        />
      )}

      {/* Confirm Delete Dialog */}
      {canDelete && <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setTargetId(null);
            setDependencyInfo(null);
            setIsCheckingDependencies(false);
          }
        }}
        title={config.confirmDeleteTitle || '⚠️ Confirmar eliminación'}
        description={config.confirmDeleteDescription || `¿Está seguro que desea eliminar este ${config.entityName.toLowerCase()}? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        confirmLabel={t('common.delete', 'Eliminar')}
        cancelLabel={t('common.cancel', 'Cancelar')}
        entityName={config.entityName}
        loadingDependencies={isCheckingDependencies}
        dependencyInfo={dependencyInfo}
      />}
    </AppLayout>
  );
}

export default AdminCRUDPage;
