/*
 * AdminCRUDPage
 *
 * Pantalla genérica de listado + CRUD para cualquier entidad. Este archivo solo
 * compone: los datos vienen de useResource y cada responsabilidad vive en su
 * propio hook dentro de ./hooks (permisos, tamaño de página, sincronización con
 * la URL, guardado, borrado) o en su componente (tabla, tarjetas, modales).
 *
 * @example
 * ```tsx
 * <AdminCRUDPage config={crudConfig} service={animalService} initialFormData={initialData} />
 * ```
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResource } from '@/shared/hooks/useResource';
import { useToast } from '@/app/providers/ToastContext';
import { useAuth } from '@/features/auth/model/useAuth';
import { useT } from '@/shared/i18n';

// Componentes especializados
import { CRUDPagination } from './CRUDPagination';
import { CRUDToolbar } from './CRUDToolbar';
import { CRUDPageBody } from './CRUDPageBody';
import { CRUDPageModals } from './CRUDPageModals';
import { CRUDErrorState, CRUDLoadingState, CRUDOfflineBanner } from './CRUDPageStates';

// Componentes de UI
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { cn } from '@/shared/ui/cn';
import { withoutTombstones } from './crudPage.helpers';

// Utilidades
import { getTombstoneIds, clearExpired } from '@/shared/api/cache/tombstones';

// Interfaces y hooks propios
import type { CRUDConfig } from '../../../shared/types/crud';
import { useCrudFormState } from './hooks/useCrudFormState';
import { useCrudSelection } from './hooks/useCrudSelection';
import { useCrudPermissions } from './hooks/useCrudPermissions';
import { useCrudPageSize, readStoredPageSize } from './hooks/useCrudPageSize';
import { useOfflineFlag } from './hooks/useOfflineFlag';
import { useCrudUrlSync } from './hooks/useCrudUrlSync';
import { useCrudSubmit } from './hooks/useCrudSubmit';
import { useCrudDelete } from './hooks/useCrudDelete';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const isOffline = useOfflineFlag();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<T | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);

  const { showToast } = useToast();
  const t = useT();
  const { role, user } = useAuth() as any;
  const location = useLocation();
  const navigate = useNavigate();

  const {
    formData, setFormData, formErrors, setFormErrors,
    formErrorMessages, setFormErrorMessages, resetForm, updateFieldValue,
  } = useCrudFormState(initialFormData, config);

  const { canCreate, canUpdate, canDelete } = useCrudPermissions(config, role, user);

  // Clave de entidad para tombstones persistentes
  const entityKey = useMemo(() => (config.entityName || 'entity').toLowerCase(), [config.entityName]);

  useEffect(() => {
    clearExpired(entityKey);
  }, [entityKey]);

  const storedPageSizeSeed = useMemo(() => readStoredPageSize(entityKey), [entityKey]);

  const {
    data: items, loading, error, meta, setPage, setLimit,
    createItem, updateItem, deleteItem, refetch, refreshing,
  } = useResource<T, any>(service as any, {
    autoFetch: true,
    initialParams: {
      page: 1,
      limit: storedPageSizeSeed || config.defaultLimit || 50,
      fields: config.defaultFields,
      ...(config.additionalFilters || {}),
    },
    filters,
    enableRealtime: realtime === true,
    pollIntervalMs: typeof pollIntervalMs === 'number' ? pollIntervalMs : undefined,
    refetchOnFocus,
    refetchOnReconnect,
  });

  // Refrescos disparados por otras pantallas.
  useEffect(() => {
    const handleRefetch = () => { void refetch(undefined, { force: true }); };
    window.addEventListener('crud:refetch', handleRefetch);
    window.addEventListener('animal-fields:updated', handleRefetch);
    return () => {
      window.removeEventListener('crud:refetch', handleRefetch);
      window.removeEventListener('animal-fields:updated', handleRefetch);
    };
  }, [refetch]);

  const pageSize = meta?.limit || 10;
  const totalItems = meta?.total || 0;
  const totalPages = meta?.totalPages || Math.ceil(totalItems / pageSize);

  const { pageSizeOptions, handlePageSizeChange } = useCrudPageSize({
    entityKey, config, pageSize, setLimit, setPage,
  });

  // Lo eliminado hace poco se oculta aunque el backend siga devolviéndolo.
  const filteredItems = useMemo(
    () => withoutTombstones(items || [], getTombstoneIds(entityKey)),
    [items, entityKey]
  );
  const { selectedIds, toggleSelect, clearSelection, toggleSelectAll } = useCrudSelection(filteredItems);

  useEffect(() => {
    onItemsChange?.(filteredItems);
  }, [filteredItems, onItemsChange]);

  const openCreate = useCallback((prefill?: Partial<TInput>) => {
    if (!canCreate) return;
    setEditingItem(null);
    // Un evento de React llegando como "prefill" significa que vino de un onClick.
    if (prefill && typeof prefill === 'object' && !(prefill as any).nativeEvent) {
      setFormData({ ...initialFormData, ...prefill });
      setFormErrors({});
      setFormErrorMessages([]);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  }, [canCreate, initialFormData, resetForm, setFormData, setFormErrors, setFormErrorMessages]);

  const openEdit = useCallback((item: T) => {
    if (!canUpdate) return;
    setEditingItem(item);
    setFormData(mapResponseToForm ? mapResponseToForm(item) : (item as unknown as TInput));
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

  const onEditLoadError = useCallback(() => {
    showToast(t('common.errorLoading', 'No se pudo cargar el registro para edición'), 'error');
  }, [showToast, t]);

  const { searchParams, setSearchParams, searchQuery, setSearchQuery, noteModalClosed } =
    useCrudUrlSync<T>({
      canCreate, canUpdate, isModalOpen, editingItem, service,
      openCreate: () => openCreate(),
      openEdit,
      onEditLoadError,
    });

  const currentPage = useMemo(() => {
    const fromURL = parseInt((searchParams.get('page') || '').toString(), 10);
    return Number.isFinite(fromURL) && fromURL > 0 ? fromURL : (meta?.page || 1);
  }, [searchParams, meta?.page]);

  const handleModalClose = useCallback(() => {
    noteModalClosed(editingItem);
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
  }, [searchParams, setSearchParams, navigate, location.pathname, editingItem, resetForm, noteModalClosed]);

  const { saving, handleSubmit } = useCrudSubmit<T, TInput>({
    config, service, validateForm, formData, formErrorMessages,
    setFormErrors, setFormErrorMessages, editingItem, canCreate, canUpdate,
    createItem, updateItem, meta, setPage, refetch,
    onSuccess: handleModalClose, showToast, t,
  });

  const onDeleted = useCallback((deletedId: number) => {
    if (isDetailOpen && detailItem?.id === deletedId) {
      setIsDetailOpen(false);
      setDetailIndex(null);
    }
    if (isModalOpen && editingItem?.id === deletedId) {
      setIsModalOpen(false);
      setEditingItem(null);
    }
  }, [isDetailOpen, detailItem, isModalOpen, editingItem]);
  const {
    confirmOpen, setConfirmOpen, isCheckingDependencies, dependencyInfo,
    blockedInfo, dismissBlocked, openDeleteConfirm, handleConfirmDelete, resetConfirmState,
  } = useCrudDelete<T>({
    config, service, entityKey, canDelete, deleteItem,
    items: filteredItems, currentPage, setPage, refetch, onDeleted,
    onAfterDelete: config.onAfterDelete,
    showToast,
  });

  const handleUpdateCell = useCallback(async (item: T, key: string, value: any) => {
    if (!canUpdate) return;
    const updated = await updateItem(item.id, { [key]: value } as any);
    if (config.onAfterUpdate) {
      try {
        await config.onAfterUpdate(updated);
      } catch (err) {
        console.error('Error in onAfterUpdate hook:', err);
      }
    }
  }, [canUpdate, config, updateItem]);

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
          onOpenCreate={canCreate ? () => openCreate() : undefined}
          createLabel={`${t('common.create', 'Crear')} ${config.entityName.toLowerCase()}`}
          customToolbar={config.customToolbar}
          toolbarPlacement={config.toolbarPlacement}
        />
      }
    />
  );

  if (loading && !items) {
    return (
      <AppLayout
        header={header}
        className="px-2 sm:px-3 pt-0 sm:pt-1 pb-0 max-w-full min-h-0"
        contentClassName="space-y-0"
      >
        <CRUDLoadingState config={config} />
      </AppLayout>
    );
  }

  // Pantalla de error completa solo si no hay nada local que mostrar.
  if (error && (!filteredItems || filteredItems.length === 0) && !loading) {
    return (
      <AppLayout
        header={header}
        className="px-2 sm:px-3 pt-1 sm:pt-2 pb-0 max-w-full min-h-0"
        contentClassName="space-y-0"
      >
        <CRUDErrorState isOffline={isOffline} error={error} onRetry={() => refetch()} />
      </AppLayout>
    );
  }

  const empty = (filteredItems?.length || 0) === 0;

  /*
   * Estándar de pantallas de datos §1.1: con filas en pantalla, el bloque de
   * contexto (métricas, pestañas, filtros) viaja DENTRO del área con scroll
   * para no restarle alto a la tabla. Excepciones:
   *  - estado vacío: no hay alto que ganar, el encabezado se queda arriba;
   *  - `renderGrouped`: la vista agrupada gestiona su propio scroll.
   */
  const usesScrollableHeader = Boolean(config.customHeader) && !empty && !config.renderGrouped;
  const isCardsView = config.viewMode === 'cards';
  const autoHeight = (isCardsView || config.autoHeight) && !config.renderGrouped;

  const pagination = !config.hidePagination && (
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
  );

  return (
    <AppLayout
      header={header}
      className={cn(
        'px-3.5 sm:px-5 lg:px-7 xl:px-8 pt-3 sm:pt-4 max-w-full min-h-0 flex flex-col',
        autoHeight ? 'h-auto pb-6' : 'h-full pb-0'
      )}
      contentClassName={cn(
        'space-y-4 sm:space-y-5 flex flex-col',
        autoHeight ? 'h-auto' : 'flex-1 min-h-0'
      )}
    >
      {isOffline && <CRUDOfflineBanner />}

      {config.customHeader && !usesScrollableHeader && (
        <div className="flex-shrink-0">{config.customHeader}</div>
      )}

      <CRUDPageBody<T>
        config={config}
        t={t}
        items={filteredItems}
        empty={empty}
        usesScrollableHeader={usesScrollableHeader}
        isCardsView={isCardsView}
        pagination={pagination}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        openCreate={openCreate}
        openEdit={openEdit}
        openDetail={openDetail}
        openDeleteConfirm={openDeleteConfirm}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onUpdateCell={canUpdate ? handleUpdateCell : undefined}
        enhancedHover={enhancedHover}
        refreshing={refreshing}
      />

      {config.enableSelection && selectedIds.length > 0 && config.batchActions && (
        config.batchActions(selectedIds, filteredItems, clearSelection, { openCreate })
      )}

      <CRUDPageModals<T, TInput>
        config={config}
        t={t}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        isModalOpen={isModalOpen}
        onModalClose={handleModalClose}
        editingItem={editingItem}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        updateFieldValue={updateFieldValue}
        onSubmit={handleSubmit}
        saving={saving}
        additionalFormContent={additionalFormContent}
        isDetailOpen={isDetailOpen}
        setIsDetailOpen={setIsDetailOpen}
        detailItem={detailItem}
        setDetailItem={setDetailItem}
        detailIndex={detailIndex}
        setDetailIndex={setDetailIndex}
        items={filteredItems}
        openEdit={openEdit}
        customDetailContent={customDetailContent}
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        resetConfirmState={resetConfirmState}
        onConfirmDelete={handleConfirmDelete}
        isCheckingDependencies={isCheckingDependencies}
        dependencyInfo={dependencyInfo}
        blockedInfo={blockedInfo} dismissBlocked={dismissBlocked}
      />
    </AppLayout>
  );
}

export default AdminCRUDPage;
