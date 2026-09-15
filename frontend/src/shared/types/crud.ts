import { ReactNode } from 'react';

export type CRUDFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'datetime-local'
  | 'tel'
  | 'select'
  | 'textarea'
  | 'checkbox'
  | 'searchable-select'
  | 'multiselect';

export interface CRUDFieldOption {
  label: string;
  value: string | number;
}

export interface CRUDFormField<T = any> {
  name: keyof T;
  label: string;
  type: CRUDFieldType;
  required?: boolean;
  placeholder?: string;
  options?: CRUDFieldOption[];
  section?: string;
  disabled?: boolean;
  hidden?: boolean;
  // Nuevas propiedades para componentes avanzados
  excludeSelf?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  searchDebounceMs?: number;
  onSearchChange?: (query: string) => void;
  validation?: {
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
    message?: string;
  };
  colSpan?: number;
  helperText?: string;
  /** Sugerencias rápidas (chips táctiles) para autocompletar con 1 toque */
  suggestions?: Array<string | number | { label: string; value: any }>;
  /**
   * Campo del que depende éste: su valor alimenta `showIf` y `optionsFilter`.
   */
  dependsOn?: keyof T | string;
  /** Devuelve un parche del formulario cuando cambia el valor del campo. */
  onChange?: (value: any, data: T) => Partial<T> | void;
  /** Oculta el campo cuando devuelve false. */
  showIf?: (data: T) => boolean;
  /**
   * Filtra las opciones de un select según el valor del campo `dependsOn`
   * (p. ej. un selector de tipo que restringe la lista de un combobox).
   */
  optionsFilter?: (dependValue: any, options: CRUDFieldOption[]) => CRUDFieldOption[];
  /** Carga las opciones de forma asíncrona (selects dependientes). */
  loadOptions?: () => Promise<CRUDFieldOption[]>;
}

export interface CRUDColumn<T = any> {
  key: keyof T | string;
  label: string;
  width?: number;
  render?: (value: any, item: T, index: number) => ReactNode;
  sortable?: boolean;
  editable?: boolean;
  editType?: 'text' | 'number' | 'select';
  editOptions?: Array<{ label: string; value: string | number }>;
}

export interface CRUDFormSection<T = any> {
  title: string;
  fields: CRUDFormField<T>[];
  gridCols?: number;
  /** Oculta toda la sección cuando devuelve false. */
  showIf?: (data: T) => boolean;
}

// ⚠️ COMPONENTE CRÍTICO - NO ELIMINAR SIN REVISIÓN
// Funciones: [Configuración de CRUD, selección masiva, batch actions]
// Última modificación: 2026-05-17
// Relacionado con: AdminCRUDPage, CRUDTable, OptimizedAdminCRUDPage

export interface CRUDConfig<T = any, TInput = any> {
  title: string;
  /** Descripción breve que acompaña al título en la fila superior del CRUD. */
  headerDescription?: string;
  /** Oculta el título compacto cuando `customHeader` aporta el encabezado principal. */
  hideTitle?: boolean;
  entityName: string;
  /** Entidad RBAC; si se omite se resuelve desde `entityName`. */
  permissionEntity?: string;
  entityNamePlural?: string;
  columns: CRUDColumn<T>[];
  formSections?: CRUDFormSection<TInput>[];
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  emptyStateIcon?: ReactNode;
  enableDetailModal?: boolean;
  enableCreateModal?: boolean;
  enableEditModal?: boolean;
  enableDelete?: boolean;
  /** Manejador personalizado para abrir el modal de creación (ej. formularios especializados). */
  onOpenCreate?: () => void;
  /** Consulta el endpoint genérico de dependencias antes de eliminar. */
  checkDependencies?: boolean;
  customHeader?: ReactNode;
  /** Encabezado contextual que se alinea con el buscador de la página. */
  headerLeading?: ReactNode;
  customToolbar?: ReactNode;
  /**
   * Dónde se pinta `customToolbar`: `inline` (por defecto) junto al botón de
   * crear, para controles cortos; `row` en una fila propia de ancho completo,
   * para bloques anchos como una barra de chips.
   */
  toolbarPlacement?: 'inline' | 'row';
  /**
   * La búsqueda arranca compacta y se expande al recibir foco, dejando todo
   * el toolbar en una sola fila.
   */
  expandableSearch?: boolean;
  customActions?: (
    item: T,
    options?: { openCreate?: (prefill?: any) => void; openEdit?: (item: T) => void },
  ) => ReactNode;
  /** Acciones extra dentro del modal de detalle. */
  detailActions?: (
    item: T,
    handlers: { openCreate?: (prefill?: any) => void; close?: () => void },
  ) => ReactNode;
  viewMode?: 'table' | 'cards';
  /**
   * Jerarquía de las tarjetas CRUD en pantallas pequeñas. Las claves deben
   * coincidir con las columnas configuradas.
   */
  mobileTitleColumn?: string;
  mobileHighlightColumn?: string;
  mobileColumns?: string[];
  autoHeight?: boolean;
  /** `openDetail` abre el modal de detalle; útil para tarjetas personalizadas. */
  renderCard?: (item: T, openDetail?: (item: T) => void) => ReactNode;
  /** Si se provee, reemplaza el grid de cards por un layout agrupado personalizado */
  renderGrouped?: (items: T[]) => ReactNode;
  // Selección masiva y acciones por lote
  enableSelection?: boolean;
  batchActions?: (
    selectedIds: number[],
    items: T[],
    clearSelection: () => void,
    handlers?: { openCreate?: () => void },
  ) => ReactNode;
  // Propiedades adicionales detectadas en la auditoría
  defaultFields?: string[];
  defaultLimit?: number;
  /** Opciones del selector de registros por página. `null` oculta el selector. */
  pageSizeOptions?: number[] | null;
  /** Oculta la barra de paginación (vistas que traen sus propios datos, p. ej. tableros). */
  hidePagination?: boolean;
  additionalFilters?: Record<string, any>;
  showEditTimestamps?: boolean;
  showIdInDetailTitle?: boolean;
  /** Título contextual para la ficha de detalle de un registro. */
  detailTitle?: string | ((item: T) => ReactNode);
  showDetailTimestamps?: boolean;
  confirmDeleteTitle?: string;
  confirmDeleteDescription?: string;
  preDeleteCheck?: (id: number) => Promise<{ hasDependencies: boolean; dependencies?: any[] }>;
  onAfterCreate?: (item: any) => Promise<void> | void;
  onAfterUpdate?: (item: any) => Promise<void> | void;
  onAfterDelete?: (id: number) => Promise<void> | void;
  cardGridClassName?: string;
  themeColor?: 'blue' | 'cyan' | 'teal' | 'emerald' | 'purple' | 'indigo' | 'red' | 'amber' | 'slate';
  detailTabs?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    render: (item: T, handlers?: any) => React.ReactNode;
  }>;
}
