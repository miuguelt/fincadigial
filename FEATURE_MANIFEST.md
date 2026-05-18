# Funcionalidades Críticas Villa Luz OS

## Estado de funciones principales

| Función | Archivos | Estado | Último Verify | Verificación rápida |
|---------|----------|--------|---------------|---------------------|
| Submenú Sidebar | `widgets/dashboard/sidebarConfig.tsx`, `widgets/dashboard/RoleBasedSideBar.tsx` | ✅ Activo | 2026-05-17 | Verificar que menús se expanden con Chevron |
| Bulk Actions Animales | `widgets/admin-crud/ui/AdminCRUDPage.tsx`, `widgets/admin-crud/ui/CRUDTable.tsx`, `pages/dashboard/admin/animals/index.tsx` | ✅ Activo | 2026-05-17 | Seleccionar checkbox en tabla → aparece barra flotante |
| Selección masiva | `shared/types/crud.ts` (enableSelection, batchActions), `widgets/admin-crud/ui/CRUDTable.tsx` | ✅ Activo | 2026-05-17 | Checkbox en header y filas |
| Modales bulk | `features/animal-bulk-actions/BatchActionToolbar.tsx`, `BatchWeightModal.tsx`, `BatchVaccinationModal.tsx`, `BatchFieldTransferModal.tsx`, `BulkTagPrintModal.tsx` | ✅ Activo | 2026-05-17 | Barra flotante → click en acción → abre modal |
| CRUD Genérico | `widgets/admin-crud/ui/AdminCRUDPage.tsx`, `CRUDTable.tsx`, `CRUDForm.tsx`, `CRUDModals.tsx` | ✅ Activo | 2026-05-17 | Crear/editar/eliminar cualquier entidad |
| Tree Genealógico | `widgets/dashboard/GeneticTreeModal.tsx`, `DescendantsTreeModal.tsx` | ✅ Activo | 2026-05-17 | Ver detalle animal → Árbol genealógico |
| Modales de detalle | `widgets/dashboard/animals/AnimalModalContent.tsx` | ✅ Activo | 2026-05-17 | Click en animal → detalle completo |

## Archivos corruptos conocidos (NO USAR)

| Archivo | Estado | Acción |
|---------|--------|--------|
| `widgets/admin-crud/ui/OptimizedAdminCRUDPage.tsx` | ❌ Minificado/corrupto (25 líneas) | Usar `shared/ui/common/AdminCRUDPage/OptimizedAdminCRUDPage.tsx` |

## Reglas para nuevas funcionalidades críticas

1. Agregar a esta tabla
2. Agregar header `⚠️ COMPONENTE CRÍTICO` al archivo
3. Documentar cómo verificar que funciona
4. Hacer commit atómico separado del resto de cambios

---

*Última actualización: 2026-05-17*
