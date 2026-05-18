/*
 * ⚠️ ARCHIVO LEGACY — NO USAR — DEPRECATED
 * Este archivo fue reemplazado por: widgets/admin-crud/ui/AdminCRUDPage.tsx
 * NO importar desde esta ruta. Todos los imports deben usar '@/widgets/admin-crud'
 * Fecha de deprecación: 2026-05-17
 * Mantenido solo como referencia histórica. Eliminar cuando se confirme migración completa.
 *
 * AdminCRUDPage
 *
 * Contrato de configuración (CRUDConfig):
 * - columns: Array de columnas con { key, label, sortable?, filterable?, width?, render? }
 *   - width es number (nuevo contrato) y se mapea internamente a clase Tailwind "w-{n}".
 *   - sortable (por defecto true) permite ordenamiento client-side con persistencia en URL (?sort=key&dir=asc|desc).
 * - formSections: Estructura del formulario de creación/edición.
 * - customToolbar/customFilters: Elementos opcionales para la barra de acciones.
 * - enableCreateModal/enableEditModal/enableDelete/enableDetailModal: Opciones de capacidades.
 *
 * Soporta:
 * - Búsqueda client-side con debounce (300ms) sincronizada a query params (?q=...).
 * - Ordenamiento client-side con persistencia en URL (?sort y ?dir) y aria-sort en encabezados.
 * - Paginación (delegada a useResource con ?page, ?limit) con controles accesibles.
 * - Confirmación accesible al eliminar mediante ConfirmDialog.
 * - Skeletons de carga para la tabla respetando el patrón visual.
 * - i18n con useT para textos comunes y toasts de feedback en crear/editar/eliminar.
 *
 * Expectativas del servicio (useResource):
 * - No se cambian contratos ni signaturas. Sorting y búsqueda son client-side por defecto.
 *
 * ========================================
 * 🎨 SISTEMA DE EFECTOS VISUALES POR COLOR
 * ========================================
 *
 * Para una experiencia de usuario clara y sin confusiones:
 *
 * 🔵 AZUL (Hover):
 *    - Cuándo: Al pasar el mouse sobre CUALQUIER elemento de la tabla
 *    - Efecto: Borde azul izquierdo (6px) + sombra azul suave + ring azul
 *    - Propósito: Indicar interactividad
 *
 * 🟢 VERDE (Inserción manual):
 *    - Cuándo: SOLO cuando el usuario crea manualmente un nuevo elemento (createItem)
 *    - NO aparece al: listar, refrescar, cambiar página, cargar inicialmente
 *    - Efecto: Borde verde intenso (8px) + animación dramática + brillo + confetti
 *    - Duración: 1.5 segundos
 *    - Control: isUserInsertedRef.current debe ser true
 *
 * 🔴 ROJO (Eliminación):
 *    - Cuándo: Al eliminar un elemento (deleteItem)
 *    - Efecto: Borde rojo intenso (8px) + shake + compresión + slide out + tachado
 *    - Duración: Variable según animación
 *
 * 🟡 AMARILLO (Actualización):
 *    - Cuándo: Al actualizar un elemento existente (updateItem)
 *    - Efecto: Borde amarillo/ámbar (6px) + pulso suave
 *    - Duración: 1 segundo
 *
 * ⚪ SIN EFECTO (Listado normal):
 *    - Cuándo: Al listar elementos existentes, refrescar datos, cambiar página
 *    - Efecto: Ninguno (aparecen normales sin colores)
 *    - Propósito: No confundir al usuario con elementos que ya existían
 *
 * ========================================
 */
import { EmptyState } from '@/widgets/feedback/EmptyState';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader2, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useResource } from '@/shared/hooks/useResource';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { AppLayout } from '@/widgets/layout/AppLayout';
import { PageHeader } from '@/widgets/layout/PageHeader';
import { Toolbar } from '@/shared/ui/common/Toolbar';
// Revert: eliminar paginación unificada para volver a estilo anterior
import { ErrorState } from '@/widgets/feedback/ErrorState';
import { useToast } from '@/app/providers/ToastContext';
import { useT } from '@/shared/i18n';
import { ConfirmDialog } from '@/shared/ui/common/ConfirmDialog';
import { checkDependencies } from '@/features/diagnostics/api/dependencyCheck.service';
import { SkeletonTable } from '@/widgets/feedback/SkeletonTable';
import { LoadingOverlay } from '@/widgets/feedback/LoadingOverlay';
import { Combobox } from '@/shared/ui/combobox';
import { addTombstone, getTombstoneIds, clearExpired } from '@/shared/api/cache/tombstones';
import { globalSearch, createSearchCache } from '@/shared/utils/globalSearch';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { validateFormSections, type FieldErrors } from '@/shared/utils/formValidation';
import { formatValidationToastMessage, mapBackendFieldErrorsToLabels, buildConflictMessage } from '@/shared/utils/validationMessages';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { isDevMode } from '@/shared/utils/viteEnv';

const isDevEnv = isDevMode();

// Interfaces para configuración del componente
export interface CRUDColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number; // width numérico -> clase Tailwind "w-{n}"
  render?: (value: any, item: T, index: number) => React.ReactNode;
}

export interface CRUDFormField<T> {
  name: keyof T;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'searchable-select' | 'number' | 'date' | 'checkbox' | 'multiselect';
  required?: boolean;
  helperText?: string;
  options?: Array<{ value: string | number; label: string }>
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  colSpan?: number; // Para grid layout
  // Nuevos: estados y reglas UX
  loading?: boolean; // para selects con búsqueda
  emptyMessage?: string; // mensaje al no encontrar resultados
  excludeSelf?: boolean; // excluir el propio registro (útil para father_id/mother_id)
  // Búsqueda remota
  searchDebounceMs?: number;
  onSearchChange?: (query: string) => void;
}
export interface CRUDFormSection<T> {
  title: string;
  fields: CRUDFormField<T>[];
  gridCols?: number;
}

export interface CRUDConfig<T, TInput> {
  title: string;
  entityName: string;
  columns: CRUDColumn<T>[];
  formSections: CRUDFormSection<TInput>[];
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  enableDetailModal?: boolean;
  enableCreateModal?: boolean;
  enableEditModal?: boolean;
  enableDelete?: boolean;
  customActions?: (item: T) => React.ReactNode;
  customFilters?: React.ReactNode;
  customToolbar?: React.ReactNode;
  customHeader?: React.ReactNode;
  // Optimización: limitar campos devueltos por el backend
  defaultFields?: string;
  // Filtros adicionales para inicializar useResource
  additionalFilters?: Record<string, any>;
  // Nuevas opciones para controlar modales y confirmaciones
  showEditTimestamps?: boolean;          // Mostrar/ocultar created_at/updated_at en el modal de edición (default: true)
  showDetailTimestamps?: boolean;        // Mostrar/ocultar created_at/updated_at en el modal de detalle (default: true)
  confirmDeleteTitle?: string;           // Título personalizado del diálogo de confirmación de borrado
  confirmDeleteDescription?: string;     // Descripción personalizada del diálogo de confirmación de borrado
  showIdInDetailTitle?: boolean;         // Mostrar u ocultar el ID en el título del modal de detalle (default: true)
  preDeleteCheck?: (id: number) => Promise<{
    hasDependencies: boolean;
    message?: string;
    detailedMessage?: string;
    dependencies?: Array<{ entity: string; count: number; samples?: string[] }>;
  }>; // Chequeo previo antes de eliminar
  // Vista alternativa en tarjetas
  viewMode?: 'table' | 'cards';
  // Contenido interno opcional para cada tarjeta
  renderCard?: (item: T) => React.ReactNode;
  customDetailContent?: (item: T, options: { onEdit?: () => void, onOpenSupplies?: () => void }) => React.ReactNode;
  // Callbacks para refrescar datos después de operaciones
  onAfterCreate?: (createdItem: T) => void | Promise<void>;  // Llamado después de crear
  onAfterUpdate?: (updatedItem: T) => void | Promise<void>;  // Llamado después de actualizar
  onAfterDelete?: (deletedId: number) => void | Promise<void>; // Llamado después de eliminar
}

interface AdminCRUDPageProps<T extends { id: number }, TInput extends Record<string, any>> {
  config: CRUDConfig<T, TInput>;
  service: any; // BaseService instance
  initialFormData: TInput | (() => TInput);
  mapResponseToForm?: (item: T) => TInput;
  validateForm?: (formData: TInput) => string | null;
  customDetailContent?: (item: T, options: { onEdit?: () => void, onOpenSupplies?: () => void }) => React.ReactNode;
  onFormDataChange?: (formData: TInput) => void;
  // Opciones de tiempo real
  realtime?: boolean;
  pollIntervalMs?: number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
  cache?: boolean;
  cacheTTL?: number;
  cacheKeyPrefix?: string;
  forceFreshOnMount?: boolean;
  // Opciones de estilo hover personalizado
  enhancedHover?: boolean; // Habilitar hover mejorado con borde azul y fondo azul suave
  // Contenido adicional personalizado en el formulario de creación/edición
  additionalFormContent?: (formData: TInput, editingItem: T | null) => React.ReactNode;
}

export function AdminCRUDPage<T extends { id: number }, TInput extends Record<string, any>>({
  config,
  service,
  initialFormData,
  mapResponseToForm,
  validateForm,
  customDetailContent,
  onFormDataChange,
  realtime,
  pollIntervalMs,
  refetchOnFocus,
  refetchOnReconnect,
  cache,
  cacheTTL,
  cacheKeyPrefix,
  forceFreshOnMount,
  enhancedHover = false,
  additionalFormContent,
}: AdminCRUDPageProps<T, TInput>) {
  const resolveInitialFormData = () => {
    const baseData = typeof initialFormData === 'function' ? initialFormData() : initialFormData;
    return JSON.parse(JSON.stringify(baseData));
  };

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { showToast } = useToast();
  const t = useT();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // actualizar para poder escribir en la URL
  const [searchParams, setSearchParams] = useSearchParams();

  // Detail modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<T | null>(null);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const detailRequestSeqRef = useRef(0);
  const suppressDetailAutoOpenRef = useRef(false);
  const lastClosedDetailIdRef = useRef<number | null>(null);
  const editRequestSeqRef = useRef(0);
  const suppressEditAutoOpenRef = useRef(false);
  const lastClosedEditIdRef = useRef<number | null>(null);

  // Loading overlay state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Procesando...');
  const deleteProcessingTimeoutRef = useRef<number | null>(null);

  // Límite inicial fijo estándar para consistencia y mejor UX
  // Valores comunes: 10, 20, 50, 100
  const initialLimit = 10;

  const {
    data: items,
    loading,
    error,
    meta,
    setPage,
    setLimit,
    setSearch,
    createItem,
    updateItem,
    deleteItem,
    refetch,
    refreshing,
  } = useResource<T, any>(service as any, {
    autoFetch: true,
    initialParams: { page: 1, limit: initialLimit, fields: config.defaultFields },
    enableRealtime: realtime === true,
    pollIntervalMs: typeof pollIntervalMs === 'number' ? pollIntervalMs : undefined,
    refetchOnFocus,
    refetchOnReconnect,
    cache,
    cacheTTL,
    cacheKeyPrefix,
  });

  useEffect(() => {
    if (forceFreshOnMount) {
      void refetch({ cache_bust: Date.now() } as any);
    }
  }, [forceFreshOnMount, refetch]);
  // Estado para controlar la primera carga y evitar parpadeo
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [displayItems, setDisplayItems] = useState<T[]>([]);
  const [, setIsTransitioning] = useState(false);
  const [deletingItems, setDeletingItems] = useState<Set<number | string>>(new Set());
  const [newItems, setNewItems] = useState<Set<number | string>>(new Set());
  const [updatedItems, setUpdatedItems] = useState<Set<number | string>>(new Set());

  // Ref para guardar el snapshot anterior de displayItems sin causar re-renders
  const previousDisplayItemsRef = useRef<T[]>([]);
  // Ref para rastrear si la inserción fue iniciada por el usuario (no por refrescos automáticos)
  const isUserInsertedRef = useRef<boolean>(false);
  // Ref para guardar el ID del item recién creado y evitar efectos duplicados
  const justCreatedItemIdRef = useRef<number | string | null>(null);

  // Efecto para manejar la transición suave entre datos y scroll automático
  // IMPORTANTE: Este efecto SOLO muestra animación verde cuando isUserInsertedRef.current === true
  // Esto previene que aparezcan efectos verdes al:
  //  - Listar elementos existentes (carga inicial)
  //  - Refrescar datos (polling/realtime)
  //  - Cambiar de página
  //  - Volver a la vista después de navegar
  useEffect(() => {
    // Si ha terminado de cargar por primera vez (con o sin datos)
    if (!loading && isFirstLoad) {
      console.log('[AdminCRUDPage] Initial load completed - Clearing isFirstLoad');
      setIsFirstLoad(false);
    }

    if (items && items.length > 0) {
      if (isFirstLoad) {
        // Primera carga con datos
        setDisplayItems(items);
        previousDisplayItemsRef.current = items;
      } else {
        // Solo detectar items nuevos si fue una inserción manual del usuario (createItem)
        if (isUserInsertedRef.current && justCreatedItemIdRef.current) {
          console.log('[AdminCRUDPage] Inserción manual detectada - Buscando item específico:', justCreatedItemIdRef.current);

          // Buscar SOLO el item específico que acabamos de crear
          const createdItem = items.find(item => String(item.id) === String(justCreatedItemIdRef.current));

          if (createdItem && createdItem.id) {
            console.log('[AdminCRUDPage] 🟢 Item creado encontrado - Aplicando efecto verde a:', createdItem.id);
            const newIds = new Set<number | string>([createdItem.id]);
            setNewItems(newIds);

            // Limpiar después de la animación (1000ms de animación + 500ms extra)
            setTimeout(() => {
              console.log('[AdminCRUDPage] Limpiando efecto verde');
              setNewItems(new Set());
              justCreatedItemIdRef.current = null; // Limpiar el ID guardado
            }, 1500);

            // Scroll automático al item nuevo después de que se renderice
            setTimeout(() => {
              const newRow = document.querySelector(`tr[data-item-id="${createdItem.id}"]`);
              if (newRow) {
                newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 200);

            // Resetear la flag SOLO después de aplicar el efecto exitosamente
            isUserInsertedRef.current = false;
            console.log('[AdminCRUDPage] ✅ Efecto verde aplicado - Flag reseteada');
          }
        }

        // Actualizar displayItems inmediatamente sin demora
        setDisplayItems(items);
        previousDisplayItemsRef.current = items;
        setIsTransitioning(false);
      }
    } else if (!loading && !error) {
      // No hay datos pero no está cargando ni hay error
      setDisplayItems([]);
      previousDisplayItemsRef.current = [];
    }
  }, [items, loading, error, isFirstLoad]);

  // Mantener datos anteriores durante refresco para evitar parpadeo
  // PERO: displayItems siempre tiene prioridad (porque puede contener actualizaciones optimistas)
  const currentItems = useMemo(
    () => (displayItems.length > 0 ? displayItems : (items || [])),
    [displayItems, items]
  );

  // No mostrar skeleton durante refrescos suaves
  const showSkeleton = loading && isFirstLoad && !refreshing;

  // Form state
  const [formData, _setFormData] = useState<TInput>(() => resolveInitialFormData());
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);
  const setFormData = (data: TInput) => {
    _setFormData(data);
    if (onFormDataChange) {
      onFormDataChange(data);
    }
  };

  const updateFieldValue = (field: CRUDFormField<TInput>, value: any) => {
    const key = String(field.name);
    const nextData = { ...(formData as any), [key]: value } as TInput;
    const validation = validateFormSections(config.formSections || [], nextData as any);
    setFormErrors(validation.errors);
    setFormErrorMessages(validation.messages);
    setFormData(nextData);
  };

  const formatAutoLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const renderAutoValue = (value: any) => {
    if (value == null || value === '') return '-';
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : '-';
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const tableColumns = useMemo(() => {
    const baseColumns = (config.columns || []) as CRUDColumn<T>[];
    const knownKeys = new Set(baseColumns.map((col) => String(col.key)));
    const autoKeys = new Set<string>();
    const sourceItems = currentItems || [];

    sourceItems.forEach((item) => {
      Object.keys(item || {}).forEach((key) => {
        if (!knownKeys.has(key)) autoKeys.add(key);
      });
    });

    const autoColumns: CRUDColumn<T>[] = Array.from(autoKeys).map((key) => ({
      key: key as keyof T,
      label: formatAutoLabel(key),
      sortable: true,
      render: (value: any) => renderAutoValue(value),
    }));

    return [...baseColumns, ...autoColumns];
  }, [config.columns, currentItems]);


  // leer query inicial desde ?search (sincronizado con useResource)
  const initialSearch = (searchParams.get('search') || '').toString();
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const lastSyncedSearchRef = useRef<string>(initialSearch);

  // Priorizar la página desde la URL para evitar resets a 1
  const pageFromURL = parseInt((searchParams.get('page') || '').toString(), 10);
  const currentPage = Number.isFinite(pageFromURL) && pageFromURL > 0 ? pageFromURL : (meta?.page || 1);
  const pageSize = meta?.limit || 10;
  const totalItems = meta?.total || 0;
  const totalPages = meta?.totalPages || Math.ceil(totalItems / pageSize);

  // Sorting state with persistence in URL
  const sortFromURL = searchParams.get('sort');
  const dirFromURL = (searchParams.get('dir') as 'asc' | 'desc' | null) || null;
  const [sortKey, setSortKey] = useState<keyof T | null>(sortFromURL ? (sortFromURL as keyof T) : null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | 'none'>(dirFromURL === 'asc' || dirFromURL === 'desc' ? dirFromURL : 'none');
  const [tombstoneVersion, setTombstoneVersion] = useState(0);

  // Clave de entidad para tombstones persistentes
  const entityKey = useMemo(() => (config.entityName || 'entity').toLowerCase(), [config.entityName]);
  useEffect(() => {
    clearExpired(entityKey);
  }, [entityKey]);
  // No memoizamos los IDs de tombstones para evitar valores obsoletos tras múltiples eliminaciones

  // Filter items to exclude only tombstones; keep deleting items visible to show effect
  const filteredItems = useMemo(() => {
    // Usar tombstoneVersion para forzar el recomputo cuando cambie,
    // incluso si su valor no se utiliza directamente en el filtrado.
    void tombstoneVersion;
    const tombstoneIds = getTombstoneIds(entityKey);
    const filtered = (currentItems || []).filter((i: T) => {
      const idStr = String((i as any).id);
      // No ocultar elementos en proceso de eliminación para que se vea el borde rojo
      const isTombstone = tombstoneIds.has(idStr);
      if (isTombstone) {
        console.log('[AdminCRUDPage] 🪦 Item filtrado por tombstone:', idStr);
      }
      return !isTombstone;
    });
    const originalLength = currentItems?.length ?? 0;
    if (isDevEnv && (filtered.length !== originalLength || tombstoneIds.size > 0)) {
      console.debug(
        '[AdminCRUDPage] Filtrado completo - Items originales:',
        originalLength,
        'Filtrados:',
        filtered.length,
        'Tombstones:',
        Array.from(tombstoneIds)
      );
    }
    return filtered;
  }, [currentItems, entityKey, tombstoneVersion]);

  // Cache para búsqueda global optimizada
  const searchCacheRef = useRef(createSearchCache<T>());

  // Búsqueda: aplicar globalSearch client-side para asegurar que encuentre todos los campos
  const searchedItems = useMemo(() => {
    const effectiveQuery = ((searchParams.get('search') || searchQuery) || '').toString().trim();
    if (!effectiveQuery) return filteredItems;

    console.log('[AdminCRUDPage] Búsqueda activa:', {
      query: effectiveQuery,
      itemsDisponibles: filteredItems.length,
      endpoint: (service as any).endpoint || 'unknown'
    });

    // Aplicar globalSearch client-side para búsqueda en TODOS los campos
    // Esto asegura que números de 4 cifras como "1098" se busquen tanto en fechas como en identification
    const clientResults = globalSearch(filteredItems, effectiveQuery, {
      matchAll: false, // Modo OR: basta con que aparezca en cualquier campo
      maxDepth: 3,
      cache: searchCacheRef.current
    });

    console.log('[AdminCRUDPage] Resultados de globalSearch client-side:', {
      query: effectiveQuery,
      resultados: clientResults.length,
      muestraResultados: clientResults.slice(0, 3).map(item => ({
        id: (item as any).id,
        identification: (item as any).identification,
        fullname: (item as any).fullname
      }))
    });

    return clientResults;
  }, [filteredItems, searchQuery, searchParams, service]);

  // Ordenamiento client-side con persistencia (aplicado a searchedItems)
  const visibleItems = useMemo(() => {
    if (!sortKey || sortDir === 'none') return searchedItems;
    const arr = [...searchedItems];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];

      if (av == null && bv == null) return 0;
      if (av == null) return sortDir === 'asc' ? -1 : 1;
      if (bv == null) return sortDir === 'asc' ? 1 : -1;

      const aNum = typeof av === 'number' ? av : Number(av);
      const bNum = typeof bv === 'number' ? bv : Number(bv);
      const bothNumeric = !Number.isNaN(aNum) && !Number.isNaN(bNum);

      let cmp = 0;
      if (bothNumeric) {
        cmp = aNum - bNum;
      } else {
        cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [searchedItems, sortKey, sortDir]);

  // Actualizar detailItem cuando los datos cambien
  useEffect(() => {
    if (isDetailOpen && detailItem && visibleItems) {
      const updatedItem = visibleItems.find(item => item.id === detailItem.id);
      if (updatedItem) {
        setDetailItem(updatedItem);
      }
    }
  }, [items, isDetailOpen, detailItem, visibleItems]);

  // Log de debugging para paginación (DEBE estar después de visibleItems)
  useEffect(() => {
    console.log('[AdminCRUDPage.Pagination] Estado de paginación:', {
      meta,
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      calculatedPages: Math.ceil(totalItems / pageSize),
      metaTotalPages: meta?.totalPages,
      itemsShown: visibleItems?.length || 0
    });
  }, [meta, currentPage, pageSize, totalItems, totalPages, visibleItems]);

  // Dynamic height calculation refs - optimizado para reducir parpadeo
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [wrapperMaxHeight, setWrapperMaxHeight] = useState<number | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate dynamic table height con debounce y optimización
  useEffect(() => {
    if (loading) return;

    const measureAndSet = () => {
      const wrapperEl = tableWrapperRef.current;
      const tableEl = tableRef.current;
      const footerEl = footerRef.current;
      if (!wrapperEl || !tableEl) return;

      const winH = window.innerHeight;
      const top = wrapperEl.getBoundingClientRect().top;
      const footerH = footerEl ? footerEl.getBoundingClientRect().height : 56;
      const safety = 24;
      const available = Math.max(0, winH - top - footerH - safety);

      const theadEl = tableEl.querySelector('thead') as HTMLElement | null;
      const theadH = theadEl ? theadEl.getBoundingClientRect().height : 32;

      const sampleRow = tableEl.querySelector('tbody tr') as HTMLElement | null;
      const rowH = sampleRow ? sampleRow.getBoundingClientRect().height : 36;

      const rowsThatFit = Math.max(3, Math.floor((available - theadH) / Math.max(1, rowH)));

      // Solo actualizar si hay un cambio significativo para evitar re-renders innecesios
      if (rowsThatFit && Math.abs(rowsThatFit - (meta?.limit || 10)) > 1 && setLimit) {
        setLimit(rowsThatFit);
      }
      const newMaxHeight = Math.max(0, available - 1);
      setWrapperMaxHeight(newMaxHeight);
      // Set CSS custom property directly on the element to avoid inline style attribute
      if (wrapperEl) {
        wrapperEl.style.setProperty('--dynamic-max-height', `${newMaxHeight}px`);
      }
    };

    // Medición inicial
    measureAndSet();

    // Manejo de resize con debounce para mejor rendimiento
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(measureAndSet, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [loading, items?.length, meta?.limit, setLimit]);

  // Handlers
  const openCreate = () => {
    setEditingItem(null);
    // Crear una copia profunda de initialFormData para evitar referencias compartidas
    // Esto asegura que cada creación tenga un objeto completamente nuevo
    setFormData(resolveInitialFormData());
    setFormErrors({});
    setFormErrorMessages([]);
    setIsModalOpen(true);
  };

  const openEdit = (item: T) => {
    setEditingItem(item);
    const formValues = mapResponseToForm ? mapResponseToForm(item) : (item as unknown as TInput);
    setFormData(formValues);
    setFormErrors({});
    setFormErrorMessages([]);
    setIsModalOpen(true);
  };

  const openDetail = (item: T) => {
    const idx = visibleItems.findIndex((i) => i.id === item.id);
    const safeIndex = idx >= 0 ? idx : 0;
    setDetailIndex(safeIndex);
    setDetailItem(visibleItems[safeIndex] || item);
    setIsDetailOpen(true);
    const sp = new URLSearchParams(searchParams);
    sp.set('detail', String(item.id));
    setSearchParams(sp, { replace: true });
  };

  const handleNextDetail = () => {
    if (!visibleItems?.length || detailIndex === null) return;
    const nextIndex = (detailIndex + 1) % visibleItems.length;
    setDetailIndex(nextIndex);
    setDetailItem(visibleItems[nextIndex]);
  };

  const handlePrevDetail = () => {
    if (!visibleItems?.length || detailIndex === null) return;
    const prevIndex = (detailIndex - 1 + visibleItems.length) % visibleItems.length;
    setDetailIndex(prevIndex);
    setDetailItem(visibleItems[prevIndex]);
  };

  const closeDetailModal = () => {
    detailRequestSeqRef.current += 1;
    suppressDetailAutoOpenRef.current = true;
    lastClosedDetailIdRef.current = detailItem?.id ?? null;
    setIsDetailOpen(false);
    setDetailIndex(null);
    setDetailItem(null);
    const sp = new URLSearchParams(searchParams);
    if (sp.has('detail')) {
      sp.delete('detail');
      setSearchParams(sp, { replace: true });
    }
  };

  const toggleSort = (key: keyof T) => {
    const nextDir: 'asc' | 'desc' | 'none' =
      sortKey !== key ? 'asc' : sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? 'none' : 'asc';

    setSortKey(nextDir === 'none' ? null : key);
    setSortDir(nextDir);

    const sp = new URLSearchParams(searchParams);
    if (nextDir === 'none') {
      sp.delete('sort');
      sp.delete('dir');
      sp.delete('ordering');
      sp.delete('sort_by');
      sp.delete('sort_order');
    } else {
      sp.set('sort', String(key));
      sp.set('dir', nextDir);
      // Sincronizar también con params que consume el backend
      sp.set('sort_by', String(key));
      sp.set('sort_order', nextDir);
      // Mantener compatibilidad con backends que usan 'ordering' tipo '-field'
      sp.set('ordering', nextDir === 'desc' ? `-${String(key)}` : String(key));
    }
    setSearchParams(sp, { replace: true });
  };

  // Debounce de búsqueda y sync con URL (?search=) y useResource
  useEffect(() => {
    const handle = setTimeout(() => {
      if (lastSyncedSearchRef.current === searchQuery) return;
      const sp = new URLSearchParams(searchParams);
      if (searchQuery) sp.set('search', searchQuery);
      else sp.delete('search');
      // Resetear a página 1 cuando se busca
      sp.set('page', '1');
      setSearchParams(sp, { replace: true });
      lastSyncedSearchRef.current = searchQuery;
      // Notificar a useResource para que refetch con el nuevo parámetro search
      // El backend debe manejar correctamente números como identificaciones
      setSearch?.(searchQuery);

      // Limpiar caché de búsqueda cuando cambia el query
      searchCacheRef.current.clear();
    }, 500);
    return () => clearTimeout(handle);
  }, [searchQuery, searchParams, setSearchParams, setSearch]);

  // Maintain state in sync if navigate with back/forward
  useEffect(() => {
    const search = (searchParams.get('search') || '').toString();
    if (search !== lastSyncedSearchRef.current) {
      lastSyncedSearchRef.current = search;
      setSearchQuery(search);
    }
    // Leer orden desde múltiples fuentes de la URL
    const s = searchParams.get('sort');
    const d = searchParams.get('dir') as 'asc' | 'desc' | null;
    const ordering = searchParams.get('ordering');
    const sortBy = searchParams.get('sort_by');
    const sortOrder = searchParams.get('sort_order') as 'asc' | 'desc' | null;

    let keyFromURL: string | null = s || sortBy || null;
    let dirFromURL: 'asc' | 'desc' | 'none' = d === 'asc' || d === 'desc' ? d : (sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'none');

    // Compatibilidad con 'ordering' tipo '-field'
    if (!keyFromURL && ordering) {
      if (ordering.startsWith('-')) {
        keyFromURL = ordering.slice(1);
        dirFromURL = 'desc';
      } else {
        keyFromURL = ordering;
        dirFromURL = 'asc';
      }
    }

    setSortKey(keyFromURL ? (keyFromURL as keyof T) : null);
    setSortDir(dirFromURL);
  }, [searchParams]);

  // Auto-open create modal via ?create=1
  useEffect(() => {
    if (config.enableCreateModal !== false) {
      const c = searchParams.get('create');
      if (c && !isModalOpen) {
        openCreate();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, config.enableCreateModal]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, config.enableEditModal]);

  // Auto-open detail modal via ?detail=ID
  useEffect(() => {
    if (config.enableDetailModal !== false) {
      const d = searchParams.get('detail');
      if (!d) {
        suppressDetailAutoOpenRef.current = false;
        lastClosedDetailIdRef.current = null;
        return;
      }
      if (suppressDetailAutoOpenRef.current && d === String(lastClosedDetailIdRef.current ?? '')) {
        return;
      }
      if (d) {
        const id = Number(d);
        if (!Number.isNaN(id) && (!isDetailOpen || !detailItem || detailItem.id !== id)) {
          const requestSeq = detailRequestSeqRef.current + 1;
          detailRequestSeqRef.current = requestSeq;
          (async () => {
            try {
              const item = await service.getById(id);
              if (detailRequestSeqRef.current !== requestSeq) {
                return;
              }
              const currentDetail = new URLSearchParams(window.location.search).get('detail');
              if (currentDetail !== String(id)) {
                return;
              }
              openDetail(item);
            } catch (err) {
              showToast(t('common.errorLoading', 'No se pudo cargar el registro para detalle'), 'error');
              const sp = new URLSearchParams(searchParams);
              sp.delete('detail');
              setSearchParams(sp, { replace: true });
            }
          })();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, config.enableDetailModal]);

  const handlePageChange = (page: number) => {
    console.log('[AdminCRUDPage.handlePageChange] Cambio de página solicitado:', {
      requestedPage: page,
      currentPage,
      totalPages,
      totalItems,
      pageSize,
      isValid: page >= 1 && page <= totalPages && page !== currentPage,
      hasSetPage: typeof setPage === 'function'
    });

    if (page >= 1 && page <= totalPages && page !== currentPage) {
      if (!setPage) {
        console.error('[AdminCRUDPage.handlePageChange] setPage no está disponible');
        return;
      }
      console.log('[AdminCRUDPage.handlePageChange] ✅ Llamando setPage(' + page + ')');
      setPage(page);
    } else {
      console.warn('[AdminCRUDPage.handlePageChange] ❌ Cambio de página bloqueado:', {
        reason: page < 1 ? 'página < 1' :
          page > totalPages ? 'página > totalPages' :
            page === currentPage ? 'ya estás en esta página' : 'condición desconocida'
      });
    }
  };

  const handleModalClose = () => {
    if (editingItem?.id) {
      editRequestSeqRef.current += 1;
      suppressEditAutoOpenRef.current = true;
      lastClosedEditIdRef.current = editingItem.id;
    } else {
      suppressEditAutoOpenRef.current = false;
      lastClosedEditIdRef.current = null;
    }
    setIsModalOpen(false);

    // CRÍTICO: Reiniciar formData a valores iniciales para evitar datos residuales
    // Esto previene que valores de ediciones/creaciones previas se mantengan en el formulario
    // Usar copia profunda para evitar referencias compartidas
    setFormData(resolveInitialFormData());
    setFormErrors({});
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    // Validation
    if (validateForm) {
      const validationError = validateForm(formData);
      if (validationError) {
        showToast(validationError, 'warning');
        return;
      }
    }

    setSaving(true);
    setIsProcessing(true);
    setProcessingMessage(editingItem ? `Actualizando ${config.entityName.toLowerCase()}...` : `Creando ${config.entityName.toLowerCase()}...`);

    try {
      let itemId: number | undefined;

      if (editingItem?.id) {
        const updatedItem = await updateItem(editingItem.id, formData as any);
        showToast(`✅ ${config.entityName} actualizado correctamente`, 'success');
        itemId = editingItem.id;

        // Reflejar inmediatamente en la vista (sin esperar refetch)
        if (updatedItem) {
          setDisplayItems((prev) => {
            const next = prev.map((row: any) =>
              String(row?.id) === String(itemId) ? { ...row, ...(updatedItem as any) } : row
            );
            previousDisplayItemsRef.current = next as any;
            return next as any;
          });
        }

        // Marcar item como actualizado para mostrar efecto visual amarillo
        setUpdatedItems(prev => new Set(prev).add(itemId!));
        // Limpiar después de una animación más larga para mejor visibilidad
        setTimeout(() => {
          setUpdatedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId!);
            return newSet;
          });
        }, 2000); // Aumentado de 1000ms a 2000ms

        // Llamar callback después de actualizar
        if (config.onAfterUpdate && updatedItem) {
          try {
            await config.onAfterUpdate(updatedItem);
          } catch (err) {
            console.error('[AdminCRUDPage] Error en callback onAfterUpdate:', err);
          }
        }
      } else {
        // ✅ MARCAR que esta es una inserción manual del usuario
        // Esta flag activa el efecto verde SOLO para este item específico
        // NO se activará para:
        //  - Elementos listados normalmente
        //  - Refrescos automáticos (realtime)
        //  - Cambios de página

        const createdItem = await createItem(formData as any);
        itemId = createdItem?.id;

        // Guardar el ID del item recién creado ANTES de activar la flag
        if (itemId) {
          justCreatedItemIdRef.current = itemId;
          isUserInsertedRef.current = true;
          console.log('[AdminCRUDPage] ✅ Item creado manualmente - ID guardado:', itemId);
        }

        showToast(`✅ ${config.entityName} creado correctamente`, 'success');

        // Volver a la página 1 después de crear para ver el nuevo registro
        // IMPORTANTE: Hacer esto ANTES de cerrar el modal para que se refleje en el refetch
        if (setPage && meta?.page && meta.page > 1) {
          setPage(1);
        }

        // Llamar callback después de crear
        if (config.onAfterCreate && createdItem) {
          try {
            await config.onAfterCreate(createdItem);
          } catch (err) {
            console.error('[AdminCRUDPage] Error en callback onAfterCreate:', err);
          }
        }
      }

      // Asegurar visibilidad del nuevo registro: ir a página 1 si no estamos allí
      // Usar await para dar tiempo a que los query params se actualicen
      if (typeof setPage === 'function' && currentPage && currentPage !== 1) {
        try {
          setPage(1);
          // Pequeña espera para que el cambio de página se refleje en la URL
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch { /* noop */ }
      }

      // Ocultar loading overlay primero con transición suave
      setTimeout(() => setIsProcessing(false), 200);

      // CERRAR MODAL con delay para que el usuario vea el loading desaparecer
      setTimeout(() => {
        handleModalClose();
      }, 400);

      // Refrescar datos DESPUÉS de cerrar modal - delay para apreciar animaciones de color
      setTimeout(async () => {
        try {
          const freshData = await refetch();

          // Verificar que el item creado/actualizado esté presente en la vista
          const itemExists = (freshData || []).some((item: any) => String(item?.id) === String(itemId));

          if (itemExists) {
            console.log('[AdminCRUDPage] Refetch exitoso - item confirmado en la vista:', {
              action: editingItem ? 'update' : 'create',
              itemId,
              currentDataLength: freshData?.length,
              itemIds: freshData?.map((i: any) => i?.id)
            });
          } else if (!editingItem) {
            // Solo loggear warning para creaciones (updates pueden estar en otra página)
            console.warn('[AdminCRUDPage] Item creado pero NO aparece en la vista después del refetch:', {
              itemId,
              currentDataLength: freshData?.length,
              currentPage,
              pageSize,
              itemIds: freshData?.map((i: any) => i?.id),
              message: 'El item debería aparecer gracias al merge inteligente de useResource. Si ve este mensaje, revise la lógica de merge.'
            });
          }
        } catch (error: any) {
          // Solo loggear errores reales (no cancelaciones)
          if (error?.code !== 'ERR_CANCELED' && !String(error?.message || '').toLowerCase().includes('cancel')) {
            console.error('[AdminCRUDPage] Error al refrescar datos después de CRUD:', {
              action: editingItem ? 'update' : 'create',
              itemId,
              error: {
                message: error?.message,
                code: error?.code,
                response: error?.response?.data,
                status: error?.response?.status
              }
            });
          }
        }
      }, 800); // 800ms para dar tiempo a que página cambie, modal se cierre y se vean los efectos de color
    } catch (error: any) {
      // Extraer mensaje de error detallado del backend
      let errorMessage = `${t('crud.save_error', 'Error al guardar')} ${config.entityName.toLowerCase()}`;

      // Intentar extraer el mensaje de validación del backend
      if (error?.response?.data) {
        const data = error.response.data;

        // Caso 1: Error de validación con mensaje directo
        if (data.message) {
          errorMessage = data.message;
        }
        // Caso 2: Error con detalles de validación
        else if (data.detail) {
          if (typeof data.detail === 'string') {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((d: any) => d.msg || d.message || String(d)).join(', ');
          }
        }
        // Caso 3: Errores de validación por campo
        else if (data.errors) {
          if (typeof data.errors === 'object') {
            errorMessage = Object.entries(data.errors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
          }
        }
      }
      // Caso 4: Mensaje directo en el error
      else if (error?.message) {
        errorMessage = error.message;
      }

      // Estandar: VALIDATION_ERROR -> renderizar errores por campo desde error.details.validation_errors
      const validationErrors =
        (error as any)?.validationErrors ||
        (error as any)?.details?.validation_errors ||
        (error as any)?.details?.errors ||
        error?.response?.data?.errors;

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
      // NO cerrar el modal para permitir correcciones
      // Ocultar overlay en caso de error
      setTimeout(() => setIsProcessing(false), 300);
    } finally {
      setSaving(false);
    }
  };

  const totalFromMeta = typeof meta?.total === 'number' ? meta.total : null;
  const hasServerData = (typeof totalFromMeta === 'number' ? totalFromMeta > 0 : false) || ((items?.length || 0) > 0);
  const empty = !hasServerData && (visibleItems?.length || 0) === 0;
  const isSearchActive = Boolean(((searchParams.get('search') || searchQuery) || '').toString().trim());
  const noResults = hasServerData && (visibleItems?.length || 0) === 0;

  // Mapa de etiquetas para llaves foráneas basado en opciones de selects de formulario
  const fkLabelMap = useMemo(() => {
    const map: Record<string, Map<string, string>> = {};
    try {
      (config.formSections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
          if ((field.type === 'select' || field.type === 'searchable-select') && field.options && field.options.length) {
            const m = new Map<string, string>();
            field.options.forEach((opt) => {
              m.set(String(opt.value), opt.label);
            });
            map[String(field.name)] = m;
          }
        });
      });
    } catch (e) {
      console.warn('[AdminCRUDPage] Error construyendo mapa de etiquetas', e);
    }
    return map;
  }, [config.formSections]);

  // Header with search and create button
  const header = (
    <PageHeader
      title={config.title}
      dense
      className="mb-0 sm:mb-0 p-0 sm:p-1"
      titleClassName="text-lg sm:text-xl"
      actions={(
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
            <Input
              placeholder={config.searchPlaceholder || `${t('common.search', 'Buscar...')} ${config.entityName.toLowerCase()}s...`}
              value={searchQuery}
              onChange={(e) => {
                // Solo actualizar el estado local; el refetch se dispara por el debounce
                setSearchQuery(e.target.value);
              }}
              className="pl-7 w-44 sm:w-56 h-7 text-xs sm:text-sm"
            />
          </div>
          <Button
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              const sp = new URLSearchParams(searchParams);
              if (searchQuery) sp.set('search', searchQuery); else sp.delete('search');
              sp.set('page', '1');
              setSearchParams(sp, { replace: true });
              lastSyncedSearchRef.current = searchQuery;
              setSearch?.(searchQuery);
            }}
            aria-label={t('common.search', 'Buscar')}
          >
            <Search className="h-4 w-4" />
          </Button>
          {config.enableCreateModal !== false && (
            <Button size="sm" className="h-7 w-7 p-0" onClick={openCreate} aria-label={`${t('common.create', 'Crear')} ${config.entityName.toLowerCase()}`}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {config.customToolbar}
        </div>
      )}
    />
  );

  // Confirmación accesible al eliminar con verificación de dependencias
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [dependencyCheckResult, setDependencyCheckResult] = useState<{
    hasDependencies: boolean;
    message?: string;
    detailedMessage?: string;
    dependencies?: Array<{ entity: string; count: number; samples?: string[] }>;
  } | null>(null);
  const [checkingDependencies, setCheckingDependencies] = useState(false);
  const isConfirmingDelete = useRef(false);

  const runDependencyCheck = async (id: number) => {
    try {
      if (typeof config.preDeleteCheck === 'function') {
        return await config.preDeleteCheck(id);
      }

      const entityType = (config.entityName || entityKey).toLowerCase();
      return await checkDependencies(entityType, id);
    } catch (error) {
      console.warn('[runDependencyCheck] Error al verificar dependencias:', {
        entity: config.entityName,
        id,
        error
      });
      showToast(
        'No se pudo verificar la integridad referencial. Se permitira eliminar, pero revise dependencias.',
        'warning'
      );
      return { hasDependencies: false };
    }
  };

  const openDeleteConfirm = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // IMPORTANTE: Limpiar estados previos ANTES de setear nuevos valores
    setDependencyCheckResult(null);
    setCheckingDependencies(true);
    setTargetId(id);
    setConfirmOpen(true);

    console.log('[openDeleteConfirm] Verificando dependencias para ID:', id);

    // Verificar dependencias de forma asincrona
    try {
      const depResult = await runDependencyCheck(id);
      console.log('[openDeleteConfirm] Resultado de verificacion de dependencias:', {
        id,
        hasDependencies: depResult?.hasDependencies,
        message: depResult?.message,
        dependencies: depResult?.dependencies
      });
      setDependencyCheckResult(depResult);
    } catch (error) {
      console.error('[openDeleteConfirm] Error al verificar dependencias:', {
        id,
        error
      });
      setDependencyCheckResult(null);
    } finally {
      setCheckingDependencies(false);
    }
  };

  const cascadeDeleteDependencies = async (id: number) => {
    const entityLower = (config.entityName || entityKey).toLowerCase();
    setProcessingMessage('Eliminando dependencias relacionadas...');
    setIsProcessing(true);
    try {
      if (entityLower.includes('tratamient')) {
        let page = 1;
        const limit = 100;
        while (true) {
          const resp = await treatmentMedicationService.getPaginated({ treatment_id: id, limit, page, fields: 'id' });
          const arr = Array.isArray(resp?.data) ? resp.data : [];
          if (!arr.length) break;
          for (const item of arr) {
            await treatmentMedicationService.delete(String((item as any).id));
          }
          page += 1;
        }
        page = 1;
        while (true) {
          const resp = await treatmentVaccinesService.getPaginated({ treatment_id: id, limit, page, fields: 'id' });
          const arr = Array.isArray(resp?.data) ? resp.data : [];
          if (!arr.length) break;
          for (const item of arr) {
            await treatmentVaccinesService.delete(String((item as any).id));
          }
          page += 1;
        }
      } else if (entityLower.includes('medicament')) {
        let page = 1;
        const limit = 100;
        while (true) {
          const resp = await treatmentMedicationService.getPaginated({ medication_id: id, limit, page, fields: 'id' });
          const arr = Array.isArray(resp?.data) ? resp.data : [];
          if (!arr.length) break;
          for (const item of arr) {
            await treatmentMedicationService.delete(String((item as any).id));
          }
          page += 1;
        }
      } else if (entityLower.includes('vacun') || entityLower.includes('vaccine')) {
        let page = 1;
        const limit = 100;
        while (true) {
          const resp = await treatmentVaccinesService.getPaginated({ vaccine_id: id, limit, page, fields: 'id' });
          const arr = Array.isArray(resp?.data) ? resp.data : [];
          if (!arr.length) break;
          for (const item of arr) {
            await treatmentVaccinesService.delete(String((item as any).id));
          }
          page += 1;
        }
      }
      setDependencyCheckResult(null);
      setConfirmOpen(false);
      setTargetId(id);
      await handleConfirmDelete();
    } catch (e: any) {
      showToast('Error eliminando dependencias relacionadas. Intente de nuevo.', 'error');
    } finally {
      setTimeout(() => setIsProcessing(false), 200);
    }
  };

  const handleConfirmDelete = async () => {
    if (targetId == null) return;

    // Capturar el targetId localmente para evitar que se resetee por operaciones posteriores
    const idToDelete = targetId;

    console.log('[handleConfirmDelete] Ejecutando, dependencyCheckResult:', {
      targetId: idToDelete,
      hasDependencies: dependencyCheckResult?.hasDependencies,
      fullResult: dependencyCheckResult
    });

    // Si hay dependencias, NO eliminar y mostrar mensaje
    if (dependencyCheckResult?.hasDependencies) {
      console.warn('[handleConfirmDelete] BLOQUEADO: Item tiene dependencias, NO se eliminará');
      showToast(
        dependencyCheckResult.message ||
        `⚠️ No se puede eliminar este ${config.entityName.toLowerCase()} porque tiene registros relacionados.`,
        'warning'
      );
      setConfirmOpen(false);
      setTargetId(null);
      setDependencyCheckResult(null);
      return;
    }

    console.log('[handleConfirmDelete] Procediendo con eliminación (sin dependencias)');

    setDeletingId(idToDelete);
    setConfirmOpen(false); // Cerrar el diálogo
    setDependencyCheckResult(null); // Limpiar resultado
    // Limpiar targetId INMEDIATAMENTE para permitir abrir nuevos diálogos
    setTargetId(null);

    // Marcar item como "deleting" para animación de fade-out (efecto rojo)
    setDeletingItems(prev => {
      const newSet = new Set(prev);
      newSet.add(String(idToDelete));
      console.log('[AdminCRUDPage] ➕ Agregando item a deletingItems:', String(idToDelete), 'Set completo:', Array.from(newSet));
      return newSet;
    });

    // Mostrar loading overlay solo si la operación tarda un poco,
    // para que primero se vea claramente el efecto rojo de eliminación.
    if (deleteProcessingTimeoutRef.current) {
      clearTimeout(deleteProcessingTimeoutRef.current);
      deleteProcessingTimeoutRef.current = null;
    }
    deleteProcessingTimeoutRef.current = window.setTimeout(() => {
      setProcessingMessage(`Eliminando ${config.entityName.toLowerCase()}...`);
      setIsProcessing(true);
    }, 350);

    try {
      const success = await deleteItem(idToDelete);

      if (success) {
        showToast(`🗑️ ${config.entityName} eliminado correctamente`, 'success');

        // Esperar para que se vea claramente la animación de eliminación (borde rojo)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Remover del estado local inmediatamente para evitar vista obsoleta
        setDisplayItems(prev => {
          const next = prev.filter((item) => String(item.id) !== String(idToDelete));
          previousDisplayItemsRef.current = next;
          return next;
        });

        // Registrar tombstone extendido para ocultar temporalmente si el backend aún lo devuelve
        // 120 segundos (2 minutos) para dar tiempo a que el backend propague la eliminación
        addTombstone(entityKey, String(idToDelete), 120000);
        setTombstoneVersion((v) => v + 1);

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
        const currentPageItems = displayItems.length - 1; // -1 porque ya lo eliminamos
        const willBeEmpty = currentPageItems === 0;
        const pageFromURL = parseInt((searchParams.get('page') || '').toString(), 10);
        const currentPage = Number.isFinite(pageFromURL) && pageFromURL > 0 ? pageFromURL : (meta?.page || 1);

        // Si la página actual quedará vacía y no es la primera página, ir a la página anterior y SALIR para evitar race condition
        if (willBeEmpty && currentPage > 1 && setPage) {
          console.log('[AdminCRUDPage] 📄 Página vacía tras eliminación - Navegando a página anterior:', currentPage - 1);
          setPage(currentPage - 1);

          // IMPORTANTE: Al cambiar de página, useResource disparará un refetch automático por el cambio en query params.
          // SI hacemos un refetch manual aquí (await refetch()), capturará los query params actuales (página vieja)
          // antes de que se actualicen, cancelando el refetch de la nueva página.
          // POR ESO: Salimos aquí y dejamos que el efecto de cambio de página maneje la recarga.

          // Limpiar estado de borrado
          setDeletingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(idToDelete));
            return newSet;
          });

          setTimeout(() => setIsProcessing(false), 200);
          return;
        }

        // Dar tiempo adicional a la animación y al backend para sincronizar
        await new Promise(resolve => setTimeout(resolve, 100));

        // Refrescar después del delay (SOLO si no se cambió de página)
        try {
          const freshData = await refetch();

          if (Array.isArray(freshData)) {
            setDisplayItems(freshData as T[]);
            previousDisplayItemsRef.current = freshData as T[];
          }

          // Verificar si el elemento fue correctamente eliminado
          // IMPORTANTE: usar freshData (respuesta directa del refetch) en lugar de items (puede estar desactualizado)
          const itemStillExists = (freshData || []).some((i: any) => String(i?.id) === String(idToDelete));

          if (!itemStillExists) {
            // Éxito: el item ya no existe en el backend
            console.log('[AdminCRUDPage] Item eliminado y confirmado por el servidor:', {
              id: idToDelete,
              itemsInView: (freshData || []).map((i: any) => i?.id)
            });
          } else {
            // El backend aún devuelve el item - intentar un segundo refetch después de 500ms
            console.warn('[AdminCRUDPage] Item eliminado localmente pero aún aparece en respuesta del servidor, reintentando...:', {
              id: idToDelete,
              serverItems: (freshData || []).map((i: any) => ({ id: i?.id })),
              message: 'El servidor aún devuelve este item. Reintentando refetch...'
            });

            // Segundo intento después de 500ms adicionales
            await new Promise(resolve => setTimeout(resolve, 500));
            const freshData2 = await refetch();
            if (Array.isArray(freshData2)) {
              setDisplayItems(freshData2 as T[]);
              previousDisplayItemsRef.current = freshData2 as T[];
            }
            const stillExists2 = (freshData2 || []).some((i: any) => String(i?.id) === String(idToDelete));

            if (stillExists2) {
              console.warn('[AdminCRUDPage] Item aún aparece después del segundo intento. Puede ser un problema del backend:', {
                id: idToDelete,
                serverItems: (freshData2 || []).map((i: any) => ({ id: i?.id }))
              });
            } else {
              console.log('[AdminCRUDPage] Item eliminado confirmado en segundo intento');
            }
          }

          // Siempre quitar del estado deleting después del refetch (exitoso o no)
          setDeletingItems(prev => {
            const newSet = new Set(prev);
            const deleted = newSet.delete(String(idToDelete));
            console.log('[AdminCRUDPage] ➖ Removiendo item de deletingItems:', String(idToDelete), 'Exitoso:', deleted, 'Set resultante:', Array.from(newSet));
            return newSet;
          });
        } catch (error: any) {
          if (error?.code !== 'ERR_CANCELED' && !String(error?.message || '').toLowerCase().includes('cancel')) {
            console.error('[AdminCRUDPage] Error al refrescar datos después de eliminar:', {
              id: idToDelete,
              error: {
                message: error?.message,
                code: error?.code,
                response: error?.response?.data,
                status: error?.response?.status
              }
            });
          }
          // Quitar de deletingItems incluso si el refetch falla
          setDeletingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(idToDelete));
            return newSet;
          });
        }
      } else {
        showToast(`Error al eliminar ${config.entityName.toLowerCase()}`, 'error');
        // Quitar de deletingItems si falló
        setDeletingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(idToDelete));
          return newSet;
        });
      }
    } catch (error: any) {
      // Extraer código de estado y mensaje de error
      const status = error?.response?.status;
      let errorMessage = `Error al eliminar ${config.entityName.toLowerCase()}`;
      let shouldRefetch = false;

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Detectar errores de dependencia (lanzados por el frontend o backend)
      const isDependencyError =
        (error as any)?.isDependencyError ||
        (typeof errorMessage === 'string' && (
          errorMessage.toLowerCase().includes('dependencia') ||
          errorMessage.toLowerCase().includes('relacionado') ||
          errorMessage.toLowerCase().includes('foreign key') ||
          errorMessage.toLowerCase().includes('constraint')
        ));

      // Manejo específico de error 404 (elemento ya eliminado)
      if (status === 404) {
        errorMessage = `⚠️ Este ${config.entityName.toLowerCase()} ya fue eliminado previamente. La vista se actualizará automáticamente.`;
        shouldRefetch = true;

        // Esperar para mostrar el efecto de eliminación antes de ocultar con tombstone
        await new Promise(resolve => setTimeout(resolve, 100));
        addTombstone(entityKey, String(idToDelete), 120000);
        setTombstoneVersion((v) => v + 1);

        // Cerrar modales si el item ya no existe
        if (isDetailOpen && detailItem?.id === idToDelete) {
          setIsDetailOpen(false);
          setDetailIndex(null);
        }
        if (isModalOpen && editingItem?.id === idToDelete) {
          setIsModalOpen(false);
          setEditingItem(null);
        }

        // Verificar paginación (igual que en caso de éxito)
        const currentPageItems = displayItems.length;
        const willBeEmpty = currentPageItems === 1;
        const pageFromURL = parseInt((searchParams.get('page') || '').toString(), 10);
        const currentPage = Number.isFinite(pageFromURL) && pageFromURL > 0 ? pageFromURL : (meta?.page || 1);

        if (willBeEmpty && currentPage > 1 && setPage) {
          setPage(currentPage - 1);
        }
      }
      // Mensaje especial si hay relaciones (409 Conflict, error de dependencias, etc.)
      else if (status === 409 || isDependencyError) {
        // Si ya tenemos un mensaje específico (del backend), lo usamos. Si es genérico, ponemos el explicativo.
        errorMessage = (error?.message && error?.message !== 'Error al eliminar')
          ? error.message
          : `⚠️ No se puede eliminar este ${config.entityName.toLowerCase()} porque tiene registros relacionados.\n\nSugerencia: Considere cambiar su estado a "Inactivo" en lugar de eliminarlo para mantener la trazabilidad histórica.`;
      }
      // Error de integridad típico: "Column 'breeds_id' cannot be null" (MySQL 1048 / SQLAlchemy)
      else if (
        (status === 400 || status === 422 || status === 500) &&
        (
          errorMessage.toLowerCase().includes("cannot be null") ||
          errorMessage.toLowerCase().includes("breeds_id") ||
          errorMessage.toLowerCase().includes("foreign key constraint")
        )
      ) {
        errorMessage = `⚠️ No se puede eliminar este registro porque otros elementos dependen de él (Integridad).\n\nRecomendación: Reasigne los registros hijos o simplemente desactive este elemento.`;
      }
      // Manejo de errores de red o servidor
      else if (status === 500) {
        // Extraer trace ID si está disponible para ayudar con debugging
        const traceId = error?.response?.data?.trace_id;
        errorMessage = `⚠️ Error del servidor al eliminar ${config.entityName.toLowerCase()}. ${traceId ? `(ID: ${traceId})` : ''} Por favor contacte al administrador del sistema.`;
        console.error('[AdminCRUDPage] Error 500 del servidor:', {
          entityName: config.entityName,
          targetId: idToDelete,
          traceId,
          errorData: error?.response?.data
        });
        shouldRefetch = false; // No refetch en error 500 para evitar loops
      } else if (status === 403) {
        errorMessage = `⚠️ No tiene permisos para eliminar este ${config.entityName.toLowerCase()}.`;
      } else if (!status) {
        errorMessage = `⚠️ Error de conexión al eliminar ${config.entityName.toLowerCase()}. Verifique su conexión a internet.`;
      }

      showToast(errorMessage, 'error');

      // Quitar de deletingItems si hay error
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(String(idToDelete));
        return newSet;
      });

      // Refrescar datos si es necesario (404, 500, etc.)
      if (shouldRefetch) {
        // El error del backend ya se procesó, refrescar inmediatamente SIN delays
        try {
          await refetch();
          console.log('[AdminCRUDPage] Refetch exitoso después de error de eliminación');
        } catch (refetchError: any) {
          if (refetchError?.code !== 'ERR_CANCELED' && !String(refetchError?.message || '').toLowerCase().includes('cancel')) {
            console.error('[AdminCRUDPage] Error al refrescar datos después del error:', {
              originalError: errorMessage,
              refetchError: {
                message: refetchError?.message,
                code: refetchError?.code,
                status: refetchError?.response?.status
              }
            });
          }
        }
      }
    } finally {
      setDeletingId(null);
      if (deleteProcessingTimeoutRef.current) {
        clearTimeout(deleteProcessingTimeoutRef.current);
        deleteProcessingTimeoutRef.current = null;
      }
      // NO resetear targetId aquí - ya se reseteó al inicio para permitir abrir nuevos diálogos
      // Ocultar loading overlay con delay para mejor UX
      setTimeout(() => setIsProcessing(false), 150);
    }
  };

  if (showSkeleton) {
    return (
      <AppLayout
        header={header}
        className="px-2 sm:px-3 pt-0 sm:pt-1 pb-0 max-w-full min-h-0"
        contentClassName="space-y-0"
      >
        <div className="bg-card/95 backdrop-blur-sm border-2 border-border/50 rounded-xl shadow-2xl shadow-primary/10 overflow-hidden">
          <SkeletonTable
            columnLabels={tableColumns.map((c) => c.label)}
            columnWidths={tableColumns.map((c) => c.width)}
            rows={8}
          />
        </div>
      </AppLayout>
    );
  }

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

  return (
    <AppLayout
      header={header}
      className="h-full flex flex-col !p-0 !pb-0 !max-w-none overflow-hidden"
      contentClassName="space-y-0 flex-1 flex flex-col min-h-0"
    >
      <div className="flex-shrink-0 px-4 py-2 border-b border-border/40 bg-background/50 backdrop-blur-sm z-10">
        <Toolbar />
      </div>

      {empty ? (
        <EmptyState
          title={config.emptyStateMessage || `${t('state.empty.title', 'Sin datos')}: ${config.entityName}`}
          description={config.emptyStateDescription || t('state.empty.description', 'Crea el primer registro para comenzar.')}
          action={config.enableCreateModal !== false && (
            <Button onClick={openCreate} aria-label={`${t('common.create', 'Crear')} ${config.entityName.toLowerCase()}`}><strong><Plus className="h-4 w-4 mr-2" />{t('common.create', 'Crear')} {config.entityName.toLowerCase()}</strong></Button>
          )}
        />
      ) : (
        <div className="bg-surface border border-border rounded-xl shadow-lg overflow-hidden flex-1 flex flex-col min-h-0 mt-1">
          <div
            ref={tableWrapperRef}
            className={cn(
              'overflow-x-auto overflow-y-auto flex-1 transition-colors',
              config.viewMode === 'cards'
                ? 'bg-surface-secondary'
                : 'bg-surface'
            )}
          >
            {config.viewMode === 'cards' ? (
              <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 xl:gap-5">
                {noResults ? (
                  <div className="col-span-full rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center">
                    <div className="text-sm font-semibold text-foreground">
                      {isSearchActive ? 'Sin resultados para tu búsqueda.' : 'No hay resultados para la página actual.'}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {isSearchActive ? 'Prueba con otros términos o limpia la búsqueda.' : 'Intenta volver a la página 1 o ajustar filtros.'}
                    </div>
                    {isSearchActive && (
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                          Limpiar búsqueda
                        </Button>
                      </div>
                    )}
                    {!isSearchActive && setPage && (
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => setPage(1)}>
                          Ir a página 1
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  visibleItems.map((item) => {
                  const isDeleting = deletingItems.has(String(item.id!));
                  const isNew = newItems.has(item.id!);
                  const isUpdated = updatedItems.has(item.id!);
                  const firstCol = tableColumns[0];
                  const rawTitle = (item as any)[firstCol?.key];
                  const mappedTitle = fkLabelMap[String(firstCol?.key)]?.get(String(rawTitle));
                  const titleText = mappedTitle ?? String(rawTitle ?? `${config.entityName} #${item.id}`);
                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 flex flex-col overflow-hidden rounded-2xl',
                        'border border-border bg-surface shadow-md hover:shadow-lg',
                        enhancedHover ? 'hover:border-ghost-primary-strong hover:bg-ghost-primary hover:-translate-y-0.5' : '',
                        isDeleting && 'ring-2 ring-ghost-danger-strong bg-ghost-danger',
                        isNew && 'ring-2 ring-ghost-success-strong bg-ghost-success',
                        isUpdated && 'ring-2 ring-ghost-warning-strong bg-ghost-warning',
                        'text-text-primary'
                      )}
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
                      {/* Solo mostrar CardHeader si NO hay renderCard personalizado */}
                      {!config.renderCard && (
                        <CardHeader className="py-3 flex-shrink-0 border-b border-border/30">
                          <CardTitle className="text-sm font-semibold truncate" title={titleText}>{titleText}</CardTitle>
                        </CardHeader>
                      )}
                      <CardContent className={config.renderCard ? "p-0 !p-0 pb-4 sm:pb-5 flex-1 flex flex-col min-h-0 overflow-hidden" : "py-3 flex-1 flex flex-col min-h-0 overflow-hidden"}>
                        {config.renderCard ? (
                          config.renderCard(item)
                        ) : (
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {tableColumns.map((col) => {
                              const raw = (item as any)[col.key];
                              const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                              return (
                                <div key={String(col.key)} className="min-w-0 space-y-1">
                                  <div className="text-muted-foreground font-medium text-[10px] uppercase tracking-wide">{col.label}</div>
                                  <div className="truncate font-medium text-foreground" title={String(mapped ?? raw ?? '-')}>{String(mapped ?? raw ?? '-')}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {(config.enableDetailModal !== false || config.enableEditModal !== false || config.enableDelete || config.customActions) && (
                          <div className="mt-4 pt-3 pb-3 sm:pb-4 border-t border-border/30 w-full flex-shrink-0 flex flex-nowrap items-center justify-center gap-3 px-3 sm:px-4" onClick={(e) => e.stopPropagation()}>
                            {config.enableDetailModal !== false && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 flex-shrink-0 rounded-lg border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200"
                                onClick={() => openDetail(item)}
                                aria-label={`${t('common.view', 'Ver')} ${config.entityName.toLowerCase()} ${item.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {config.enableEditModal !== false && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 flex-shrink-0 rounded-lg border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200"
                                onClick={() => openEdit(item)}
                                aria-label={`${t('common.edit', 'Editar')} ${config.entityName.toLowerCase()} ${item.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {config.enableDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 w-9 p-0 flex-shrink-0 rounded-lg border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
                                onClick={(e) => openDeleteConfirm(item.id, e)}
                                disabled={deletingId === item.id}
                                aria-label={`${t('common.delete', 'Eliminar')} ${config.entityName.toLowerCase()} ${item.id}`}
                              >
                                {deletingId === item.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {config.customActions && config.customActions(item)}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                  })
                )}
              </div>
            ) : (
              <table
                ref={tableRef}
                className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm shadow-sm rounded-lg overflow-hidden"
              >
                <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/60 border-b border-border/50">
                  <tr className="h-10">
                    {tableColumns.map((col) => {
                      const colSortValue: 'ascending' | 'descending' | undefined =
                        sortKey === col.key
                          ? (sortDir === 'asc' ? 'ascending' : 'descending')
                          : undefined;
                      return (
                        <th
                          key={String(col.key)}
                          className={`px-2 sm:px-3 py-2 text-left text-[10px] sm:text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col.width ? `w-${col.width}` : ''} ${col.sortable === false ? '' : 'cursor-pointer select-none hover:text-foreground transition-colors'} truncate`}
                          onClick={col.sortable === false ? undefined : () => toggleSort(col.key)}
                          {...(colSortValue ? { 'aria-sort': colSortValue } : {})}
                          role="columnheader"
                          tabIndex={col.sortable === false ? undefined : 0}
                          onKeyDown={col.sortable === false ? undefined : (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleSort(col.key);
                            }
                          }}
                          title={col.sortable === false ? undefined : t('table.sort_hint', 'Ordenar')}
                        >
                          {col.label}
                        </th>
                      );
                    })}
                    {(config.enableDelete || config.customActions) && (
                      <th className="px-1 sm:px-2 py-1 text-left text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <span className="hidden sm:inline">{t('common.actions', 'Acciones')}</span>
                        <span className="sm:hidden">Acc.</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody
                  className={cn(
                    "divide-y divide-border/60 bg-card",
                    !refreshing && !loading ? "animate-fade-in-up" : ""
                  )}
                >
                  {noResults ? (
                    <tr>
                      <td
                        colSpan={tableColumns.length + ((config.enableDelete || config.customActions) ? 1 : 0)}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        <div className="text-foreground font-semibold">
                          {isSearchActive ? 'Sin resultados para tu búsqueda.' : 'No hay resultados para la página actual.'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {isSearchActive ? 'Prueba con otros términos o limpia la búsqueda.' : 'Intenta volver a la página 1 o ajustar filtros.'}
                        </div>
                        {isSearchActive && (
                          <div className="mt-3">
                            <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                              Limpiar búsqueda
                            </Button>
                          </div>
                        )}
                        {!isSearchActive && setPage && (
                          <div className="mt-3">
                            <Button variant="outline" size="sm" onClick={() => setPage(1)}>
                              Ir a página 1
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item, index: number) => {
                    // Determinar qué efectos visuales aplicar a este item
                    const isDeleting = deletingItems.has(String(item.id!));  // 🔴 Rojo al eliminar
                    const isNew = newItems.has(item.id!);                    // 🟢 Verde al insertar (SOLO si isUserInsertedRef.current fue true)
                    const isUpdated = updatedItems.has(item.id!);            // 🟡 Amarillo al actualizar

                    if (isDeleting) {
                      console.log('[AdminCRUDPage] 🔴 Renderizando item en estado DELETING:', item.id, 'deletingItems:', Array.from(deletingItems));
                    }

                    return (
                      <tr
                        key={item.id}
                        data-item-id={item.id}
                        className={cn(
                          "h-10 md:h-12 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50",
                          "transition-all duration-300 relative overflow-visible",
                          // 🔵 Hover: AZUL con bordes y sombras - aparece al pasar el mouse sobre CUALQUIER elemento
                          enhancedHover ? cn(
                            "hover:bg-gradient-to-r hover:from-blue-50/70 hover:via-blue-100/60 hover:to-blue-50/70",
                            "dark:hover:from-blue-950/40 dark:hover:via-blue-900/35 dark:hover:to-blue-950/40",
                            "hover:border-l-[6px] hover:border-r-2 hover:border-blue-500 dark:hover:border-blue-400",
                            "hover:shadow-[0_3px_12px_rgba(59,130,246,0.4),inset_0_1px_2px_rgba(255,255,255,0.15),0_0_0_1px_rgba(59,130,246,0.3)]",
                            "dark:hover:shadow-[0_3px_12px_rgba(59,130,246,0.3),inset_0_1px_2px_rgba(255,255,255,0.08),0_0_0_1px_rgba(59,130,246,0.25)]",
                            "hover:scale-[1.008] hover:z-10",
                            "hover:ring-1 hover:ring-blue-400/50 dark:hover:ring-blue-500/40"
                          ) : "hover:bg-muted/40",
                          // 🔴 ROJO: Efecto de eliminación - shake + compresión + slide out + borde rojo grueso
                          isDeleting && cn(
                            "animate-item-deleting z-20",
                            "bg-gradient-to-r from-red-100 via-red-200/90 to-red-100",
                            "dark:from-red-950/60 dark:via-red-900/80 dark:to-red-950/60",
                            "border-l-8 border-red-600 dark:border-red-500",
                            "shadow-[0_0_25px_rgba(220,38,38,0.6),inset_0_0_15px_rgba(220,38,38,0.15)]",
                            "ring-4 ring-red-500/70 dark:ring-red-600/70",
                            // Línea de tachado atravesando el elemento
                            "after:absolute after:inset-0 after:z-30 after:pointer-events-none",
                            "after:bg-gradient-to-r after:from-transparent after:via-red-600/80 after:to-transparent",
                            "after:h-[2px] after:top-1/2 after:-translate-y-1/2",
                            "after:animate-[slideIn_0.3s_ease-out]"
                          ),
                          // 🟢 VERDE: Efecto de creación SOLO cuando el usuario inserta manualmente
                          // NO aparece al: listar, refrescar, cambiar página, o cargar inicialmente
                          isNew && cn(
                            "animate-item-created z-30",
                            "bg-gradient-to-r from-emerald-100 via-green-200/95 to-emerald-100",
                            "dark:from-emerald-950/60 dark:via-emerald-900/80 dark:to-emerald-950/60",
                            "border-l-8 border-green-600 dark:border-green-500",
                            "shadow-[0_0_35px_rgba(16,185,129,0.7),inset_0_0_25px_rgba(16,185,129,0.2),0_0_60px_rgba(16,185,129,0.4)]",
                            "ring-4 ring-green-500/80 dark:ring-green-600/80",
                            // Efecto shine mejorado que cruza el elemento
                            "before:absolute before:inset-0 before:z-10 before:pointer-events-none",
                            "before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
                            "before:animate-shine before:bg-[length:200%_100%]",
                            "before:shadow-[0_0_20px_rgba(255,255,255,0.8)]",
                            // Partículas/confetti en las esquinas
                            "after:absolute after:top-0 after:right-4 after:w-2 after:h-2 after:rounded-full",
                            "after:bg-green-500 after:animate-confetti after:shadow-[0_0_10px_rgba(34,197,94,0.8)]",
                            "after:opacity-0"
                          ),
                          // 🟡 AMARILLO: Efecto de actualización - pulso de color amarillo/naranja
                          isUpdated && !isNew && !isDeleting && cn(
                            "animate-item-updated z-25",
                            "border-l-6 border-amber-500 dark:border-amber-400",
                            "shadow-[0_0_20px_rgba(245,158,11,0.5)]",
                            "ring-2 ring-amber-400/60 dark:ring-amber-500/60"
                          )
                        )}
                        onClick={() => { config.enableDetailModal !== false && openDetail(item); }}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); config.enableDetailModal !== false && openDetail(item); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          const target = e.target as HTMLElement | null;
                          const isTypingTarget = !!target?.closest(
                            'input, textarea, select, [contenteditable="true"]'
                          );
                          if (isTypingTarget) {
                            return;
                          }
                          if (e.key === 'Enter' || e.key === ' ' || (e as any).keyCode === 13) {
                            e.preventDefault();
                            config.enableDetailModal !== false && openDetail(item);
                          }
                        }}
                      >
                        {tableColumns.map((col) => (
                          <td
                            key={String(col.key)}
                            className={`px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-sm ${col.width ? `w-${col.width}` : ''} truncate max-w-[120px] sm:max-w-[180px] md:max-w-[240px]`}
                            title={col.render ? undefined : (fkLabelMap[String(col.key)]?.get(String((item as any)[col.key])) ?? String((item as any)[col.key] ?? ''))}
                          >
                            {col.render
                              ? col.render((item as any)[col.key], item, index)
                              : (() => {
                                const raw = (item as any)[col.key];
                                const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                                return mapped ?? String(raw ?? '-');
                              })()}
                          </td>
                        ))}
                        {(config.enableDetailModal !== false || config.enableEditModal !== false || config.enableDelete || config.customActions) && (
                          <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-xs font-medium" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} >
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                              {config.enableDetailModal !== false && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); openDetail(item); }}
                                  aria-label={`${t('common.view', 'Ver')} ${config.entityName.toLowerCase()} ${item.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {config.enableEditModal !== false && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200 rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                                  aria-label={`${t('common.edit', 'Editar')} ${config.entityName.toLowerCase()} ${item.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {config.enableDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 rounded-lg"
                                  onClick={(e) => openDeleteConfirm(item.id, e)}
                                  disabled={deletingId === item.id}
                                  aria-label={`${t('common.delete', 'Eliminar')} ${config.entityName.toLowerCase()} ${item.id}`}
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              {config.customActions && config.customActions(item)}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination footer (estilo original con botones) */}
          <div ref={footerRef} className="sticky bottom-0 z-10 bg-card/95 border-t backdrop-blur-sm shadow-sm flex-shrink-0">
            <div className="px-2 py-1.5 sm:py-2">
              <div className="flex justify-between items-center text-[11px] sm:text-[12px] md:text-sm gap-2">


                <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                  <span className="text-[11px] sm:text-[12px] md:text-sm text-muted-foreground">
                    <span className="hidden sm:inline">{t('common.page', 'Página')} </span>
                    <span className="sm:hidden">Pág. </span>
                    {currentPage} <span className="hidden sm:inline">{t('common.of', 'de')}</span><span className="sm:hidden">/</span> {Math.max(totalPages, 1)}
                  </span>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={loading || currentPage <= 1}
                      aria-label={t('common.previous', 'Anterior')}
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background h-7 w-7 sm:h-9 sm:w-9 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    </button>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={loading || currentPage >= totalPages}
                      aria-label={t('common.next', 'Siguiente')}
                      className="inline-flex items-center justify-center rounded-md border border-input bg-background h-7 w-7 sm:h-9 sm:w-9 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                      <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(config.enableCreateModal !== false || config.enableEditModal !== false) && (
        <GenericModal
          isOpen={isModalOpen}
          onOpenChange={handleModalClose}
          title={editingItem ? `${t('common.edit', 'Editar')} ${config.entityName}: ${editingItem.id}` : `${t('common.create', 'Crear')} ${config.entityName}`}
          size="5xl"
          variant="compact"
          allowFullScreenToggle
          enableBackdropBlur
          className="bg-card/95 backdrop-blur-md text-card-foreground border-border/10 shadow-xl transition-all duration-200 ease-out max-h-[90vh]"
        >
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 h-full flex flex-col text-[13px] sm:text-sm">
            {Object.keys(formErrors).length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <div className="font-semibold">Faltan datos obligatorios</div>
                <div>Revise los campos marcados en rojo y corrija lo siguiente:</div>
                {formErrorMessages.length > 0 && (
                  <ul className="mt-1 list-disc pl-4">
                    {formErrorMessages.slice(0, 5).map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                    {formErrorMessages.length > 5 && (
                      <li>y {formErrorMessages.length - 5} mas...</li>
                    )}
                  </ul>
                )}
              </div>
            )}
            {config.formSections.map((section, _sectionIndex) => {
              const gridCols = section.gridCols ?? 3;
              // Helper: responsive grid classes for Tailwind
              const gridClass = `grid grid-cols-1 ${gridCols >= 2 ? 'sm:grid-cols-2' : ''} ${gridCols >= 3 ? 'lg:grid-cols-3' : ''} gap-3 sm:gap-4 lg:gap-5`;
              const spanClass = (span?: number) => {
                if (!span || span <= 1) return '';
                if (span >= 3) return 'sm:col-span-2 lg:col-span-3';
                if (span >= 2) return 'sm:col-span-2';
                return '';
              };
              return (
                <div key={section.title || _sectionIndex} className={cn(
                  "relative rounded-xl p-3 sm:p-4",
                  "border border-border/40",
                  "bg-gradient-to-br from-card/30 via-card/20 to-transparent",
                  "shadow-sm backdrop-blur-sm",
                  "transition-all duration-300"
                )}>
                  {section.title && (
                    <div className="mb-3 sm:mb-4 pb-2 border-b border-border/30">
                      <h3 className={cn(
                        "text-base sm:text-lg font-semibold",
                        "bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent",
                        "flex items-center gap-2"
                      )}>
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        {section.title}
                      </h3>
                    </div>
                  )}
                  <div className={gridClass}>
                    {section.fields.map((field, _fieldIndex) => (
                      <div key={String(field.name)} className={cn(
                        'w-full space-y-2 group',
                        spanClass(field.colSpan)
                      )}>
                        <label htmlFor={String(field.name)} className={cn(
                          "block text-xs sm:text-sm font-medium",
                          "text-foreground/90 group-hover:text-foreground",
                          "transition-colors duration-200",
                          "flex items-center gap-1.5"
                        )}>
                          <span>{field.label}</span>
                          {field.required && (
                            <span className="text-red-600 dark:text-red-400 font-extrabold text-base" title="Campo obligatorio">*</span>
                          )}
                        </label>
                        {field.required && (
                          <p className={cn(
                            "text-[10px] sm:text-xs transition-opacity duration-300 flex items-center gap-1",
                            Object.keys(formErrors).length > 0
                              ? "text-red-500 font-medium opacity-100"
                              : "text-muted-foreground/50 opacity-100"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              Object.keys(formErrors).length > 0 ? "bg-red-500" : "bg-muted-foreground/30"
                            )}></span>
                            <span>{t('validation.required', 'Campo obligatorio')}</span>
                          </p>
                        )}

                        {field.type === 'textarea' && (() => {
                          const currentValue = (formData as any)[field.name];
                          const fieldError = formErrors[String(field.name)];
                          const showWarning = Boolean(fieldError);
                          return (
                            <div className="space-y-1">
                              <Textarea
                                id={String(field.name)}
                                value={currentValue || ''}
                                onChange={(e) => updateFieldValue(field, e.target.value)}
                                placeholder={field.placeholder}
                                rows={3}
                                disabled={saving}
                                aria-invalid={showWarning}
                                aria-required={field.required}
                                className={cn(
                                  "w-full min-h-[80px] resize-none text-sm",
                                  showWarning
                                    ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                                    : "border-border/50 focus:border-primary/50",
                                  field.required && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
                                  "bg-background/50 focus:bg-background/80",
                                  "transition-all duration-300",
                                  "backdrop-blur-sm"
                                )}
                              />
                              {showWarning && (
                                <p className="text-xs text-red-500">{fieldError}</p>
                              )}
                            </div>
                          );
                        })()}

                        {field.type === 'select' && field.options && (
                          (() => {
                            const opts = field.options || [];
                            const isNumeric = opts.length > 0 && opts.every((o: any) => typeof o.value === 'number');
                            const fieldError = formErrors[String(field.name)];
                            const showWarning = Boolean(fieldError);

                            return (
                              <div className="space-y-1">
                                <select
                                  id={String(field.name)}
                                  value={String(((formData as any)[field.name] ?? ''))}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateFieldValue(field, isNumeric ? (val === '' ? undefined : Number(val)) : val);
                                  }}
                                  disabled={saving}
                                  required={field.required}
                                  className={cn(
                                    "w-full px-3 py-2.5 border rounded-lg min-h-[44px] text-sm",
                                    "bg-background/50 focus:bg-background/80",
                                    "transition-all duration-200",
                                    "backdrop-blur-sm",
                                    "cursor-pointer",
                                    showWarning
                                      ? "border-amber-400/70 focus:border-amber-500 hover:border-amber-500/50 text-amber-900 dark:text-amber-200"
                                      : "border-border/50 focus:border-primary/50 text-foreground hover:border-primary/30",
                                    field.required && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40"
                                  )}
                                >
                                  <option value="" className="text-muted-foreground">
                                    {field.placeholder || 'Seleccionar...'}
                                  </option>
                                  {opts.map((option: any, _optIndex) => (
                                    <option key={String(option.value)} value={String(option.value)} className="text-foreground">
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                {showWarning && fieldError && (
                                  <p className="text-xs text-red-500">{fieldError}</p>
                                )}
                              </div>
                            );
                          })()
                        )}

                        {field.type === 'searchable-select' && field.options && (
                          (() => {
                            // Opciones base
                            let opts = field.options || [];
                            const isNumeric = opts.length > 0 && opts.every((o: any) => typeof o.value === 'number');
                            // Tratar 0 como vacío para selects numéricos que usan 0 como placeholder
                            const rawVal = (formData as any)[field.name];
                            const currentVal = rawVal === 0 ? null : rawVal;
                            const fieldError = formErrors[String(field.name)];

                            // Excluir el propio registro si se solicita (evitar seleccionarse a sí mismo)
                            if (field.excludeSelf && editingItem?.id != null) {
                              opts = opts.filter((o: any) => o.value !== editingItem.id);
                            }

                            const isLoading = Boolean(field.loading);
                            const hasOptions = opts.length > 0;

                            // Placeholder dinámico según estado
                            const getPlaceholderText = () => {
                              if (saving) return t('common.saving', 'Guardando...');
                              if (isLoading) return t('state.loading', 'Cargando opciones...');
                              if (!hasOptions) return t('state.empty.title', 'Sin opciones disponibles');
                              return field.placeholder || t('common.search', 'Buscar...');
                            };

                            const emptyText = field.emptyMessage || t('state.empty.title', 'Sin resultados');

                            return (
                              <div className="space-y-1">
                                <div className={cn(
                                  field.required && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40 rounded-l-sm"
                                )}>
                                  <Combobox
                                    options={opts.map((o) => ({ value: String(o.value), label: o.label }))}
                                    value={currentVal == null ? '' : String(currentVal)}
                                    onValueChange={(val) =>
                                      updateFieldValue(field, isNumeric ? (val === '' ? undefined : Number(val)) : val)
                                    }
                                    placeholder={getPlaceholderText()}
                                    searchPlaceholder={t('common.search', 'Buscar...')}
                                    emptyMessage={emptyText}
                                    disabled={saving}
                                    loading={isLoading}
                                    searchDebounceMs={field.searchDebounceMs || 300}
                                    onSearchChange={field.onSearchChange}
                                    className={cn(
                                      "transition-all duration-200",
                                      isLoading && "opacity-80",
                                      !hasOptions && !isLoading && "opacity-60"
                                    )}
                                  />
                                </div>
                                {isLoading && (
                                  <div className="flex items-center gap-2 text-xs text-[#3b82f6]">
                                    <Loader2 className="h-3 w-3 animate-spin text-[#3b82f6]" />
                                    <span>Buscando opciones...</span>
                                  </div>
                                )}
                                {!hasOptions && !isLoading && (
                                  <div className="text-xs text-muted-foreground">
                                    {emptyText}
                                  </div>
                                )}
                                {fieldError && (
                                  <p className="text-xs text-red-500">{fieldError}</p>
                                )}
                              </div>
                            );
                          })()
                        )}

                        {field.type === 'checkbox' && (
                          <div className="flex items-start space-x-2 mt-1">
                            <input
                              id={String(field.name)}
                              type="checkbox"
                              checked={Boolean((formData as any)[field.name])}
                              onChange={(e) => updateFieldValue(field, e.target.checked)}
                              disabled={saving}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded mt-0.5 flex-shrink-0"
                            />
                            <label htmlFor={String(field.name)} className="text-sm font-medium text-foreground leading-relaxed">
                              {field.label}
                            </label>
                            {formErrors[String(field.name)] && (
                              <p className="text-xs text-red-500">{formErrors[String(field.name)]}</p>
                            )}
                          </div>
                        )}

                        {field.type === 'number' && (() => {
                          const fieldError = formErrors[String(field.name)];
                          const showWarning = Boolean(fieldError);
                          return (
                            <div className="space-y-1">
                              <Input
                                id={String(field.name)}
                                type="number"
                                value={(formData as any)[field.name] || ''}
                                onChange={(e) => updateFieldValue(field, e.target.value ? Number(e.target.value) : undefined)}
                                placeholder={field.placeholder}
                                min={field.validation?.min}
                                max={field.validation?.max}
                                disabled={saving}
                                aria-invalid={showWarning}
                                aria-required={field.required}
                                className={cn(
                                  "w-full min-h-[44px] text-sm",
                                  showWarning
                                    ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                                    : "border-border/50 focus:border-primary/50",
                                  field.required && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
                                  "bg-background/50 focus:bg-background/80",
                                  "transition-all duration-300 backdrop-blur-sm"
                                )}
                              />
                              {showWarning && (
                                <p className="text-xs text-red-500">{fieldError}</p>
                              )}
                            </div>
                          );
                        })()}

                        {field.type === 'date' && (() => {
                          const currentValue = (formData as any)[field.name];
                          const fieldError = formErrors[String(field.name)];
                          const showWarning = Boolean(fieldError);
                          const today = getTodayColombia();
                          // Validación especial para birth_date para evitar fechas futuras
                          const isBirthDate = String(field.name) === 'birth_date';
                          const maxDate = isBirthDate ? today : undefined;

                          return (
                            <div className="space-y-1">
                              <Input
                                id={String(field.name)}
                                type="date"
                                max={maxDate}
                                value={(formData as any)[field.name] || ''}
                                onChange={(e) => updateFieldValue(field, e.target.value)}
                                disabled={saving}
                                aria-invalid={showWarning}
                                aria-required={field.required}
                                className={cn(
                                  "w-full min-h-[44px] text-sm",
                                  showWarning
                                    ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                                    : "border-border/50 focus:border-primary/50",
                                  field.required && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
                                  "bg-background/50 focus:bg-background/80",
                                  "transition-all duration-300 backdrop-blur-sm"
                                )}
                              />
                              {showWarning && (
                                <p className="text-xs text-red-500">{fieldError}</p>
                              )}
                              {isBirthDate && currentValue && currentValue > today && (
                                <p className="text-xs text-red-500">La fecha de nacimiento no puede ser futura.</p>
                              )}
                            </div>
                          );
                        })()}

                        {(field.type === 'text' || field.type === 'multiselect') && (() => {
                          const fieldError = formErrors[String(field.name)];
                          const showWarning = Boolean(fieldError);
                          return (
                            <div className="space-y-1">
                              <Input
                                id={String(field.name)}
                                value={(formData as any)[field.name] || ''}
                                onChange={(e) => updateFieldValue(field, e.target.value)}
                                placeholder={field.placeholder}
                                disabled={saving}
                                aria-invalid={showWarning}
                                aria-required={field.required}
                                className={cn(
                                  "w-full min-h-[44px] text-sm",
                                  showWarning
                                    ? "border-amber-500 focus:border-amber-600 ring-1 ring-amber-500"
                                    : "border-border/50 focus:border-primary/50",
                                  field.required && "border-l-4 border-l-red-500/40 dark:border-l-red-400/40",
                                  "bg-background/50 focus:bg-background/80",
                                  "transition-all duration-300 backdrop-blur-sm"
                                )}
                              />
                              {showWarning && (
                                <p className="text-xs text-red-500">{fieldError}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {editingItem && (
              <div className={cn(
                "mt-2 p-3 sm:p-4 rounded-lg",
                "bg-muted/30 border border-border/40",
                "text-xs sm:text-sm text-muted-foreground",
                "backdrop-blur-sm"
              )}>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span><strong className="text-foreground/80">ID:</strong> {editingItem.id}</span>
                  {config.showEditTimestamps !== false && (editingItem as any).created_at && (
                    <span><strong className="text-foreground/80">Creado:</strong> {new Date((editingItem as any).created_at).toLocaleDateString('es-ES')}</span>
                  )}
                  {config.showEditTimestamps !== false && (editingItem as any).updated_at && (
                    <span><strong className="text-foreground/80">Actualizado:</strong> {new Date((editingItem as any).updated_at).toLocaleDateString('es-ES')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Contenido adicional personalizado */}
            {additionalFormContent && (
              <div className="mt-3">
                {additionalFormContent(formData, editingItem)}
              </div>
            )}



            <div className={cn(
              "flex flex-col sm:flex-row gap-3 pt-4 mt-auto",
              "sticky bottom-0 -mx-4 -mb-4 p-4 sm:-mx-6 sm:-mb-6 sm:p-6",
              "bg-gradient-to-t from-card/95 to-card/50",
              "backdrop-blur-md border-t border-border/40"
            )}>
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={saving}
                className={cn(
                  "w-full sm:flex-1",
                  "h-11 sm:h-12",
                  "border-border/50 hover:border-border",
                  "hover:bg-accent/50",
                  "transition-all duration-200",
                  "hover:shadow-lg hover:scale-[1.02]",
                  "active:scale-[0.98]"
                )}
              >
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className={cn(
                  "w-full sm:flex-1",
                  "h-11 sm:h-12",
                  "bg-primary hover:bg-primary/90",
                  "shadow-lg shadow-primary/20",
                  "hover:shadow-xl hover:shadow-primary/30",
                  "transition-all duration-200",
                  "hover:scale-[1.02]",
                  "active:scale-[0.98]",
                  saving && "opacity-80 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.saving', 'Guardando...')}
                  </span>
                ) : (
                  editingItem ? t('common.update', 'Actualizar') : t('common.create', 'Crear')
                )}
              </Button>
            </div>
          </form>
        </GenericModal>
      )}

      {/* Detail Modal */}
      {config.enableDetailModal !== false && (
        <GenericModal
          isOpen={isDetailOpen}
          onOpenChange={(open) => {
            if (open) {
              setIsDetailOpen(true);
              return;
            }
            closeDetailModal();
          }}
          title={detailItem ? `Detalle del ${config.entityName}${config.showIdInDetailTitle === false ? '' : `: ${detailItem.id}`}` : `Detalle del ${config.entityName}`}
          size="full"
          variant="compact"
          allowFullScreenToggle
          enableBackdropBlur
          className="bg-card/95 backdrop-blur-md text-card-foreground border-border/10 shadow-xl transition-all duration-200 ease-out"
          enableNavigation={!!visibleItems && visibleItems.length > 1}
          onNavigatePrevious={handlePrevDetail}
          onNavigateNext={handleNextDetail}
          hasPrevious={!!visibleItems && visibleItems.length > 1}
          hasNext={!!visibleItems && visibleItems.length > 1}
          footer={detailItem && (
            <div className="border-t border-border/40 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Navegación (izquierda en desktop, arriba en mobile) */}
                <div className="flex gap-2 sm:flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handlePrevDetail}
                    disabled={!visibleItems || visibleItems.length <= 1}
                    className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleNextDetail}
                    disabled={!visibleItems || visibleItems.length <= 1}
                    className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>

                {/* Acciones principales (derecha en desktop, abajo en mobile) */}
                <div className="flex gap-2 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={closeDetailModal}
                    className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                  >
                    {t('modal.close', 'Cerrar')}
                  </Button>
                  {detailItem && config.enableEditModal !== false && (
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => { openEdit(detailItem); closeDetailModal(); }}
                      className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                    >
                      <Edit className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">{t('common.edit', 'Editar')}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        >
          {detailItem && (
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                {customDetailContent || config.customDetailContent ? (
                  (customDetailContent || config.customDetailContent)!(detailItem, {
                    onEdit: config.enableEditModal !== false ? () => openEdit(detailItem) : undefined
                  })
                ) : (
                  <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Información general</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        {tableColumns.map((col, _colIndex) => (
                          <div key={String(col.key)} className="space-y-1">
                            <dt className="text-xs text-muted-foreground font-medium">{col.label}</dt>
                            <dd className="text-sm font-medium text-foreground">
                              {col.render
                                ? col.render((detailItem as any)[col.key], detailItem, 0)
                                : (() => {
                                  const raw = (detailItem as any)[col.key];
                                  const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                                  return mapped ?? String(raw ?? '-');
                                })()}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </CardContent>
                  </Card>
                )}
              </div>

              {(config.showDetailTimestamps ?? true) && ((detailItem as any).created_at || (detailItem as any).updated_at) && (
                <Card className="shadow-sm border border-border rounded-xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fecha y hora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-1 gap-3 text-sm">
                      {(config.showDetailTimestamps ?? true) && (detailItem as any).created_at && (
                        <div className="space-y-1">
                          <dt className="text-xs text-muted-foreground font-medium">Creado</dt>
                          <dd className="text-sm font-medium">{new Date((detailItem as any).created_at).toLocaleString('es-ES')}</dd>
                        </div>
                      )}
                      {(config.showDetailTimestamps ?? true) && (detailItem as any).updated_at && (
                        <div className="space-y-1">
                          <dt className="text-xs text-muted-foreground font-medium">Actualizado</dt>
                          <dd className="text-sm font-medium">{new Date((detailItem as any).updated_at).toLocaleString('es-ES')}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </GenericModal>
      )}

      {/* Confirm Delete Dialog con verificación de dependencias */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          // Si se cierra manualmente (cancelar/ESC), resetear estado
          if (!open && !isConfirmingDelete.current) {
            setTargetId(null);
            setDependencyCheckResult(null);
          }
        }}
        title={
          checkingDependencies
            ? '🔍 Verificando dependencias...'
            : dependencyCheckResult?.hasDependencies
              ? '⚠️ No se puede eliminar'
              : config.confirmDeleteTitle || '⚠️ Confirmar eliminación'
        }
        description={
          checkingDependencies
            ? 'Verificando si existen registros relacionados antes de eliminar...'
            : dependencyCheckResult?.hasDependencies
              ? dependencyCheckResult.message || 'Este registro tiene dependencias que deben ser eliminadas primero.'
              : config.confirmDeleteDescription ||
              `¿Está seguro que desea eliminar este ${config.entityName.toLowerCase()}? Esta acción no se puede deshacer.`
        }
        confirmLabel={
          checkingDependencies
            ? t('common.checking', 'Verificando...')
            : (() => {
              const el = (config.entityName || entityKey).toLowerCase();
              const canCascade = (dependencyCheckResult?.hasDependencies) && (el.includes('tratamient') || el.includes('medicament') || el.includes('vacun') || el.includes('vaccine'));
              if (dependencyCheckResult?.hasDependencies && canCascade) return 'Eliminar dependencias y borrar';
              if (dependencyCheckResult?.hasDependencies) return t('common.understood', 'Entendido');
              return t('common.delete', 'Eliminar');
            })()
        }
        cancelLabel={t('common.cancel', 'Cancelar')}
        confirmVariant={(() => {
          const el = (config.entityName || entityKey).toLowerCase();
          const canCascade = (dependencyCheckResult?.hasDependencies) && (el.includes('tratamient') || el.includes('medicament') || el.includes('vacun') || el.includes('vaccine'));
          if (dependencyCheckResult?.hasDependencies && canCascade) return 'destructive';
          if (dependencyCheckResult?.hasDependencies) return 'outline';
          return 'destructive';
        })()}
        disabled={checkingDependencies}
        onConfirm={() => {
          console.log('[ConfirmDialog.onConfirm] Botón clickeado, verificando dependencias:', {
            hasDependencies: dependencyCheckResult?.hasDependencies,
            targetId
          });

          if (dependencyCheckResult?.hasDependencies) {
            const el = (config.entityName || entityKey).toLowerCase();
            const canCascade = el.includes('tratamient') || el.includes('medicament') || el.includes('vacun') || el.includes('vaccine');
            if (canCascade && targetId != null) {
              isConfirmingDelete.current = true;
              void cascadeDeleteDependencies(targetId);
              isConfirmingDelete.current = false;
              return;
            } else {
              setTargetId(null);
              setDependencyCheckResult(null);
              return;
            }
          }

          // Si no hay dependencias, proceder con la eliminación
          console.log('[ConfirmDialog.onConfirm] No hay dependencias, llamando handleConfirmDelete()');
          isConfirmingDelete.current = true;
          handleConfirmDelete().finally(() => {
            isConfirmingDelete.current = false;
          });
        }}
        // Nuevas props para mostrar dependencias detalladas
        showWarningIcon={dependencyCheckResult?.hasDependencies || false}
        detailedMessage={dependencyCheckResult?.detailedMessage}
        dependencies={dependencyCheckResult?.dependencies}
      />

      {/* Loading Overlay - Elegante y no intrusivo */}
      <LoadingOverlay
        show={isProcessing}
        message={processingMessage}
        allowInteraction={true}
      />
    </AppLayout>
  );
}
