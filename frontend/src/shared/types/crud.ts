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
    pattern?: string;
    message?: string;
  };
  colSpan?: number;
  helperText?: string;
  /**
   * Campo del que depende éste; se reevalúa `showIf` cuando cambia.
   * NOTA: declarativo — ningún renderer lo consume todavía.
   */
  dependsOn?: keyof T | string;
  /** Devuelve un parche del formulario cuando cambia el valor del campo. */
  onChange?: (value: any, data: T) => Partial<T> | void;
  /** Oculta el campo cuando devuelve false. */
  showIf?: (data: T) => boolean;
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
}

// ⚠️ COMPONENTE CRÍTICO - NO ELIMINAR SIN REVISIÓN
// Funciones: [Configuración de CRUD, selección masiva, batch actions]
// Última modificación: 2026-05-17
// Relacionado con: AdminCRUDPage, CRUDTable, OptimizedAdminCRUDPage

export interface CRUDConfig<T = any, TInput = any> {
  title: string;
  entityName: string;
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
  customHeader?: ReactNode;
  customToolbar?: ReactNode;
  customActions?: (
    item: T,
    options?: { openCreate?: () => void },
  ) => ReactNode;
  /** Acciones extra dentro del modal de detalle. */
  detailActions?: (
    item: T,
    handlers: { openCreate?: () => void; close?: () => void },
  ) => ReactNode;
  viewMode?: 'table' | 'cards';
  autoHeight?: boolean;
  renderCard?: (item: T) => ReactNode;
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
  additionalFilters?: Record<string, any>;
  showEditTimestamps?: boolean;
  showIdInDetailTitle?: boolean;
  showDetailTimestamps?: boolean;
  confirmDeleteTitle?: string;
  confirmDeleteDescription?: string;
  preDeleteCheck?: (id: number) => Promise<{ hasDependencies: boolean; dependencies?: any[] }>;
  onAfterCreate?: (item: any) => Promise<void> | void;
  onAfterUpdate?: (item: any) => Promise<void> | void;
  cardGridClassName?: string;
  themeColor?: 'blue' | 'cyan' | 'teal' | 'emerald' | 'purple' | 'indigo' | 'red' | 'amber' | 'slate';
  detailTabs?: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    render: (item: T, handlers?: any) => React.ReactNode;
  }>;
}

