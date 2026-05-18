/*
 * AdminCRUDPage Components
 * 
 * Exportación de todos los componentes refactorizados y optimizados.
 */

// Componente principal optimizado
export { AdminCRUDPage as default } from './AdminCRUDPage';
export type { AdminCRUDPageProps } from './AdminCRUDPage';

// Componentes especializados
export { default as CRUDTable } from './CRUDTable';
export { default as CRUDForm } from './CRUDForm';
export { default as CRUDPagination } from './CRUDPagination';
export { default as CRUDSearch } from './CRUDSearch';
export { default as CRUDToolbar } from './CRUDToolbar';

// Interfaces y tipos
export type {
  CRUDColumn,
  CRUDFormField,
  CRUDFormSection,
  CRUDConfig,
} from '@/shared/types/crud';
