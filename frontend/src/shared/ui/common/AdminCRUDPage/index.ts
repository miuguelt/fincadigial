/*
 * ⚠️ DIRECTORIO LEGACY — NO USAR — DEPRECATED
 * Estos componentes fueron reemplazados por: widgets/admin-crud/ui/
 * NO importar desde esta ruta. Todos los imports deben usar '@/widgets/admin-crud'
 * Fecha de deprecación: 2026-05-17
 * Mantenido solo como referencia histórica. Eliminar cuando se confirme migración completa.
 *
 * AdminCRUDPage Components
 * 
 * Exportación de todos los componentes refactorizados y optimizados.
 */

// Componente principal optimizado
export { OptimizedAdminCRUDPage as default } from './OptimizedAdminCRUDPage';

// Componentes especializados
export { default as CRUDTable } from './CRUDTable';
export { default as CRUDForm } from './CRUDForm';
export { default as CRUDPagination } from './CRUDPagination';
export { default as CRUDSearch } from './CRUDSearch';
export { default as CRUDToolbar } from './CRUDToolbar';

// Interfaces y tipos (reexportar del componente original)
export type {
  CRUDColumn,
  CRUDFormField,
  CRUDFormSection,
  CRUDConfig,
  AdminCRUDPageProps,
} from '../AdminCRUDPage';
