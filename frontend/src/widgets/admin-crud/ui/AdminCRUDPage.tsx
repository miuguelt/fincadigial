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
import { useT } from '@/shared/i18n';

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
import { Plus } from 'lucide-react';

// Utilidades
import { addTombstone, getTombstoneIds, clearExpired } from '@/shared/api/cache/tombstones';
import { validateFormSections, type FieldErrors } from '@/shared/utils/formValidation';
import { formatValidationToastMessage, mapBackendFieldErrorsToLabels, buildConflictMessage } from '@/shared/utils/validationMessages';

// Interfaces
import type { CRUDConfig, CRUDFormField } from '../../../shared/types/crud';

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
  enhancedHover = false,
  additionalFormContent,
}: AdminCRUDPageProps<T, TInput>) {
  // Estados simplificados
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TInput>(initialFormData);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selección masiva
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);

    const updateFieldValue = useCallback((field: CRUDFormField<TInput>, value: any) => {
    const key = String(field.name);
    const nextData = { ...(formData as any), [key]: value } as TInput;
    const validation = validateFormSections(config.formSections || [], nextData as any);
    setFormErrors(validation.errors);
    setFormErrorMessages(validation.messages);
    setFormData(nextData);
  }, [formData, config.formSections]);
  
  // Estados para modales
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<T | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const editRequestSeqRef = useRef(0);
  const suppressEditAutoOpenRef = useRef(false);
  const lastClosedEditIdRef = useRef<number | null>(null);
  
  // Estados para confirmación
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  
  // Hooks y utilidades
  const { showToast } = useToast();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Clave de entidad para tombstones persistentes
  const entityKey = useMemo(() => (config.entityName || 'entity').toLowerCase(), [config.entityName]);
  
  // Limpiar tombstones expirados al montar
  useEffect(() => {
    clearExpired(entityKey);
  }, [entityKey]);
  
  // Configuración de recursos
  const {
    data: items,
    loading,
    error,
    meta,
    setPage,
    setLimit: _setLimit,
    setSearch,
    createItem,
    updateItem,
    deleteItem,
    refetch,
    refreshing,
  } = useResource<T, any>(service as any, {
    autoFetch: true,
    initialParams: {
      page: 1,
      limit: 10,
      fields: config.defaultFields,
      ...(config.additionalFilters || {})
    },
    enableRealtime: realtime === true,
    pollIntervalMs: typeof pollIntervalMs === 'number' ? pollIntervalMs : undefined,
    refetchOnFocus,
    refetchOnReconnect,
  });
  
  // Paginación
  const pageFromURL = parseInt((searchParams.get('page') || '').toString(), 10);
  const currentPage = Number.isFinite(pageFromURL) && pageFromURL > 0 ? pageFromURL : (meta?.page || 1);
  const pageSize = meta?.limit || 10;
  const totalItems = meta?.total || 0;
  const totalPages = meta?.totalPages || Math.ceil(totalItems / pageSize);
  
  // Filtrar items para excluir tombstones
  const filteredItems = useMemo(() => {
    const tombstoneIds = getTombstoneIds(entityKey);
    return (items || []).filter((i: T) => {
      const idStr = String((i as any).id);
      return !tombstoneIds.has(idStr);
    });
  }, [items, entityKey]);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const allIds = (filteredItems || []).map((i: T) => (i as any).id as number);
      return prev.length === allIds.length ? [] : allIds;
    });
  }, [filteredItems]);
  
  // Handlers
  const openCreate = useCallback(() => {
    setEditingItem(null);
    setFormData(JSON.parse(JSON.stringify(initialFormData)));
    setFormErrors({});
    setFormErrorMessages([]);
    setIsModalOpen(true);
  }, [initialFormData]);
  
  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    const formValues = mapResponseToForm ? mapResponseToForm(item) : (item as unknown as TInput);
    setFormData(formValues);
    setFormErrors({});
    setFormErrorMessages([]);
    setIsModalOpen(true);
  }, [mapResponseToForm]);
  
  const openDetail = useCallback((item: T) => {
    const idx = filteredItems.findIndex((i) => i.id === item.id);
    const safeIndex = idx >= 0 ? idx : 0;
    setDetailIndex(safeIndex);
    setDetailItem(filteredItems[safeIndex] || item);
    setIsDetailOpen(true);
  }, [filteredItems]);
  
  const openDeleteConfirm = useCallback((id: number) => {
    setTargetId(id);
    setConfirmOpen(true);
  }, []);
  
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
    setFormData(JSON.parse(JSON.stringify(initialFormData)));
    setFormErrors({});
    setFormErrorMessages([]);
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
  }, [initialFormData, searchParams, setSearchParams, navigate, location.pathname, editingItem]);
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

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
        const result = await updateItem(editingItem.id, formData as any);
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
      
      // Refrescar datos después de un breve delay
      setTimeout(async () => {
        try {
          await refetch();
        } catch (error) {
          console.error('Error al refrescar datos:', error);
        }
      }, 300);
    } catch (error: any) {
      let errorMessage = `${t('crud.save_error', 'Error al guardar')} ${config.entityName.toLowerCase()}`;
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      const validationErrors =
        (error as any)?.validationErrors ||
        (error as any)?.details?.validation_errors ||
        (error as any)?.details?.errors ||
        error?.response?.data?.errors;

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
  }, [formData, validateForm, editingItem, updateItem, createItem, setPage, meta, handleModalClose, refetch, config.entityName, config.formSections, t, showToast, setFormErrors, setFormErrorMessages, formErrorMessages]);
  
  const handleConfirmDelete = useCallback(async () => {
    if (targetId == null) return;
    
    const idToDelete = targetId;
    setConfirmOpen(false);
    setTargetId(null);
    
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
  }, [targetId, deleteItem, entityKey, isDetailOpen, detailItem, isModalOpen, editingItem, filteredItems, currentPage, setPage, refetch, config.entityName, showToast]);
  
  // Sincronizar búsqueda con URL
  useEffect(() => {
    const handle = setTimeout(() => {
      const sp = new URLSearchParams(searchParams);
      if (searchQuery) sp.set('search', searchQuery);
      else sp.delete('search');
      sp.set('page', '1');
      setSearchParams(sp, { replace: true });
      setSearch?.(searchQuery);
    }, 300);
    
    return () => clearTimeout(handle);
  }, [searchQuery, searchParams, setSearchParams, setSearch]);
  
  // Sincronizar estado con URL
  useEffect(() => {
    const search = (searchParams.get('search') || '').toString();
    if (search !== searchQuery) {
      setSearchQuery(search);
    }
  }, [searchParams, searchQuery]);
  
  // Auto-open create modal via ?create=1
  useEffect(() => {
    if (config.enableCreateModal !== false) {
      const c = searchParams.get('create');
      if (c && !isModalOpen) {
        openCreate();
      }
    }
  }, [searchParams, config.enableCreateModal, isModalOpen, openCreate]);
  
  // Auto-open edit modal via ?edit=ID
  useEffect(() => {
    if (config.enableEditModal !== false) {
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
  }, [searchParams, config.enableEditModal, isModalOpen, editingItem, service, openEdit, showToast, t, setSearchParams]);
  
  // Header con búsqueda y botones
  const header = (
    <PageHeader
      title={config.title}
      dense
      className="mb-0 sm:mb-0 p-0 sm:p-1"
      titleClassName="text-lg sm:text-xl"
      actions={
        <CRUDToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchPlaceholder={config.searchPlaceholder}
          onOpenCreate={config.enableCreateModal !== false ? openCreate : undefined}
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
        <div className="bg-card/95 backdrop-blur-sm border-2 border-border/50 rounded-xl shadow-2xl shadow-primary/10 overflow-hidden">
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
  
  return (
    <AppLayout
      header={header}
      className="px-2 sm:px-3 pt-0 sm:pt-0 pb-0 sm:pb-0 md:pb-0 lg:pb-0 max-w-full min-h-0 flex flex-col h-full"
      contentClassName="space-y-0 flex-1 flex flex-col min-h-0"
    >
      {config.customHeader && (
        <div className="flex-shrink-0">
          {config.customHeader}
        </div>
      )}
      
      {empty ? (
        <EmptyState
          title={config.emptyStateMessage || `${t('state.empty.title', 'Sin datos')}: ${config.entityName}`}
          description={config.emptyStateDescription || t('state.empty.description', 'Crea el primer registro para comenzar.')}
          action={config.enableCreateModal !== false && (
            <button onClick={openCreate} aria-label={`${t('common.create', 'Crear')} ${config.entityName.toLowerCase()}`}>
              <Plus className="h-4 w-4 mr-2" />
              {t('common.create', 'Crear')} {config.entityName.toLowerCase()}
            </button>
          )}
        />
      ) : config.viewMode === 'cards' ? (
        <div className="flex flex-col flex-1 min-h-0 mt-1">
          <div className="overflow-y-auto flex-1 bg-muted/30 rounded-xl border border-border/50 p-3 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
              {filteredItems.map((item) => {
                const firstCol = config.columns[0];
                const rawTitle = (item as any)[firstCol?.key];
                const titleText = String(rawTitle ?? `${config.entityName} #${item.id}`);
                return (
                  <Card
                    key={item.id}
                    className="cursor-pointer transition-all duration-200 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-md hover:shadow-lg hover:-translate-y-0.5 relative"
                    onClick={() => { config.enableDetailModal !== false && openDetail(item); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        config.enableDetailModal !== false && openDetail(item);
                      }
                    }}
                  >
                    {config.enableSelection && (
                      <div
                        className="absolute top-2 right-2 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.includes((item as any).id)}
                          onCheckedChange={() => toggleSelect((item as any).id)}
                          aria-label={`Seleccionar ${config.entityName} ${(item as any).id}`}
                        />
                      </div>
                    )}
                    {!config.renderCard && (
                      <CardHeader className="py-3 flex-shrink-0 border-b border-border/30">
                        <CardTitle className="text-sm font-semibold truncate" title={titleText}>{titleText}</CardTitle>
                      </CardHeader>
                    )}
                    <CardContent className={config.renderCard ? 'p-0 flex-1 flex flex-col min-h-0 overflow-hidden' : 'py-3 flex-1 flex flex-col min-h-0 overflow-hidden'}>
                      {config.renderCard ? (
                        config.renderCard(item)
                      ) : (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {config.columns.map((col: any) => {
                            const raw = (item as any)[col.key];
                            return (
                              <div key={String(col.key)} className="min-w-0 space-y-1">
                                <div className="text-muted-foreground font-medium text-[10px] uppercase tracking-wide">{col.label}</div>
                                <div className="truncate font-medium text-foreground" title={String(raw ?? '-')}>{String(raw ?? '-')}</div>
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
          </div>
          <CRUDPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage || ((_page: number) => {})}
            loading={loading}
          />
        </div>
      ) : (
        <div className="bg-card/95 backdrop-blur-sm border-2 border-border/50 rounded-xl shadow-2xl shadow-primary/10 overflow-hidden flex-1 flex flex-col min-h-0 mt-1">
          <CRUDTable
            items={filteredItems}
            columns={config.columns}
            config={config}
            onOpenDetail={config.enableDetailModal !== false ? openDetail : undefined}
            onOpenEdit={config.enableEditModal !== false ? openEdit : undefined}
            onOpenDelete={config.enableDelete ? openDeleteConfirm : undefined}
            enhancedHover={enhancedHover}
            refreshing={refreshing}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />

          <CRUDPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage || ((_page: number) => {})}
            loading={loading}
          />
        </div>
      )}

      {/* Batch actions bar */}
      {config.enableSelection && selectedIds.length > 0 && config.batchActions && (
        config.batchActions(selectedIds, filteredItems, clearSelection)
      )}
      
      {/* Create/Edit Modal */}
      {(config.enableCreateModal !== false || config.enableEditModal !== false) && (
        <CRUDForm
          isOpen={isModalOpen}
          onOpenChange={handleModalClose}
          title={editingItem ? `${t('common.edit', 'Editar')} ${config.entityName}: ${editingItem.id}` : `${t('common.create', 'Crear')} ${config.entityName}`}
          formData={formData}
          setFormData={setFormData as unknown as React.Dispatch<React.SetStateAction<Record<string, any>>>}
          formSections={config.formSections || []}
          fieldErrors={formErrors}
          errorMessages={formErrorMessages}
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
          onEdit={config.enableEditModal !== false ? openEdit : undefined}
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
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={config.confirmDeleteTitle || '⚠️ Confirmar eliminación'}
        description={config.confirmDeleteDescription || `¿Está seguro que desea eliminar este ${config.entityName.toLowerCase()}? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        confirmLabel={t('common.delete', 'Eliminar')}
        cancelLabel={t('common.cancel', 'Cancelar')}
        entityName={config.entityName}
      />
    </AppLayout>
  );
}

export default AdminCRUDPage;
