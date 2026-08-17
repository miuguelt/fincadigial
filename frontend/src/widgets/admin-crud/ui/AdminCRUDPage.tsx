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
import { CRUDTable } from './CRUDTable';
import { CRUDForm } from './CRUDForm';
import { CRUDPagination } from './CRUDPagination';
import { DetailModal, ConfirmDeleteDialog } from './CRUDModals';
import { CRUDToolbar } from './CRUDToolbar';
import { CRUDCardGrid } from './CRUDCardGrid';

// Componentes de UI
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { EmptyState } from '@/widgets/feedback/EmptyState';
import { ErrorState } from '@/widgets/feedback/ErrorState';
import { SkeletonTable } from '@/widgets/feedback/SkeletonTable';
import { FloatingScrollArea } from '@/shared/ui/FloatingScrollArea';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { withoutTombstones } from './crudPage.helpers';

// Utilidades
import { getTombstoneIds, clearExpired } from '@/shared/api/cache/tombstones';

// Interfaces y hooks propios
import type { CRUDConfig } from '../../../shared/types/crud';
import { useCrudFormState } from './hooks/useCrudFormState';
import { useCrudSelection } from './hooks/useCrudSelection';
import { useCrudPermissions } from './hooks/useCrudPermissions';
import { useCrudPageSize } from './hooks/useCrudPageSize';
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
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

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

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clave de entidad para tombstones persistentes
  const entityKey = useMemo(() => (config.entityName || 'entity').toLowerCase(), [config.entityName]);

  useEffect(() => {
    clearExpired(entityKey);
  }, [entityKey]);

  const storedPageSizeSeed = useMemo(() => {
    try {
      const raw = window.localStorage.getItem(`crud:pageSize:${entityKey}`);
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 && parsed <= 1000 ? parsed : null;
    } catch {
      return null;
    }
  }, [entityKey]);

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
    const handleRefetch = () => { refetch(); };
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
    openDeleteConfirm, handleConfirmDelete, resetConfirmState,
  } = useCrudDelete<T>({
    config, service, entityKey, canDelete, deleteItem,
    items: filteredItems, currentPage, setPage, refetch, onDeleted, showToast,
  });

  const handleUpdateCell = useCallback(async (item: T, key: string, value: any) => {
    if (!canUpdate) return;
    await updateItem(item.id, { [key]: value } as any);
  }, [canUpdate, updateItem]);

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

  // Pantalla de error completa solo si no hay nada local que mostrar.
  if (error && (!filteredItems || filteredItems.length === 0) && !loading) {
    return (
      <AppLayout
        header={header}
        className="px-2 sm:px-3 pt-1 sm:pt-2 pb-0 max-w-full min-h-0"
        contentClassName="space-y-0"
      >
        {isOffline ? (
          <EmptyState
            title="Sin conexión al servidor"
            description="Actualmente no hay señal de internet y no se encontraron registros previos guardados en este dispositivo. Conéctese una vez para precargar la base de datos de la finca."
            action={
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                Reintentar conexión
              </button>
            }
          />
        ) : (
          <ErrorState message={String(error)} onRetry={() => refetch()} />
        )}
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
        'px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 max-w-full min-h-0 flex flex-col',
        autoHeight ? 'h-auto pb-6' : 'h-full pb-0'
      )}
      contentClassName={cn(
        'space-y-4 sm:space-y-5 flex flex-col',
        autoHeight ? 'h-auto' : 'flex-1 min-h-0'
      )}
    >
      {isOffline && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm rounded-lg shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span>
              <strong>Modo de campo (Sin internet):</strong> Operando con datos guardados localmente. Los registros nuevos o modificaciones se guardarán en este dispositivo y se sincronizarán al recuperar cobertura.
            </span>
          </div>
        </div>
      )}

      {config.customHeader && !usesScrollableHeader && (
        <div className="flex-shrink-0">{config.customHeader}</div>
      )}

      {empty ? (
        <EmptyState
          title={config.emptyStateMessage || `${t('state.empty.title', 'Sin datos')}: ${config.entityName}`}
          description={config.emptyStateDescription || t('state.empty.description', 'Crea el primer registro para comenzar.')}
          icon={config.emptyStateIcon}
          action={canCreate && (
            <button onClick={() => openCreate()} aria-label={`${t('common.create', 'Crear')} registro desde el estado vacío`}>
              <Plus className="h-4 w-4 mr-2" />
              {t('common.create', 'Crear')} {config.entityName.toLowerCase()}
            </button>
          )}
        />
      ) : isCardsView ? (
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
              <CRUDCardGrid<T>
                items={filteredItems}
                config={config}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onOpenDetail={openDetail}
              />
            </FloatingScrollArea>
          )}
          {pagination}
        </div>
      ) : (
        <>
          <div className="bg-card/95 backdrop-blur-sm border border-border/30 rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0 mt-1">
            <CRUDTable
              headerSlot={usesScrollableHeader ? config.customHeader : undefined}
              items={filteredItems}
              columns={config.columns}
              config={{
                ...config,
                customActions: config.customActions
                  ? (item: T) => config.customActions!(item, { openCreate })
                  : undefined,
              }}
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
          {pagination}
        </>
      )}

      {config.enableSelection && selectedIds.length > 0 && config.batchActions && (
        config.batchActions(selectedIds, filteredItems, clearSelection, { openCreate })
      )}

      {(canCreate || canUpdate) && (
        <CRUDForm
          isOpen={isModalOpen}
          onOpenChange={handleModalClose}
          title={editingItem
            ? `${t('common.edit', 'Editar')} ${config.entityName}: ${editingItem.id}`
            : `${t('common.create', 'Crear')} ${config.entityName}`}
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

      {config.enableDetailModal !== false && (
        <DetailModal
          isOpen={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={detailItem
            ? `Detalle del ${config.entityName}${config.showIdInDetailTitle === false ? '' : `: ${detailItem.id}`}`
            : `Detalle del ${config.entityName}`}
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

      {canDelete && (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open);
            if (!open) resetConfirmState();
          }}
          title={config.confirmDeleteTitle || '⚠️ Confirmar eliminación'}
          description={config.confirmDeleteDescription || `¿Está seguro que desea eliminar este ${config.entityName.toLowerCase()}? Esta acción no se puede deshacer.`}
          onConfirm={handleConfirmDelete}
          confirmLabel={t('common.delete', 'Eliminar')}
          cancelLabel={t('common.cancel', 'Cancelar')}
          entityName={config.entityName}
          loadingDependencies={isCheckingDependencies}
          dependencyInfo={dependencyInfo}
        />
      )}
    </AppLayout>
  );
}

export default AdminCRUDPage;
