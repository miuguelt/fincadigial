import { ReactNode } from 'react';

export type CRUDFieldType = 
  | 'text' 
  | 'number' 
  | 'email' 
  | 'date' 
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
}

export interface CRUDColumn<T = any> {
  key: keyof T | string;
  label: string;
  width?: number;
  render?: (value: any, item: T, index: number) => ReactNode;
  sortable?: boolean;
}

export interface CRUDFormSection<T = any> {
  title: string;
  fields: CRUDFormField<T>[];
  gridCols?: number;
}

export interface CRUDConfig<T = any, TInput = any> {
  title: string;
  entityName: string;
  columns: CRUDColumn<T>[];
  formSections?: CRUDFormSection<TInput>[];
  searchPlaceholder?: string;
  emptyStateMessage?: string;
  emptyStateDescription?: string;
  enableDetailModal?: boolean;
  enableCreateModal?: boolean;
  enableEditModal?: boolean;
  enableDelete?: boolean;
  customHeader?: ReactNode;
  customToolbar?: ReactNode;
  customActions?: (item: T) => ReactNode;
  viewMode?: 'table' | 'cards';
  renderCard?: (item: T) => ReactNode;
  // Propiedades adicionales detectadas en la auditoría
  defaultFields?: string[];
  additionalFilters?: Record<string, any>;
  showEditTimestamps?: boolean;
  showIdInDetailTitle?: boolean;
  showDetailTimestamps?: boolean;
  confirmDeleteTitle?: string;
  confirmDeleteDescription?: string;
  preDeleteCheck?: (id: number) => Promise<{ hasDependencies: boolean; dependencies?: any[] }>;
  onAfterCreate?: (item: any) => Promise<void> | void;
  onAfterUpdate?: (item: any) => Promise<void> | void;
}
