# Protocolo de Generación CRUD (SSoT DevBrain)

> **MANDATO DEVBRAIN:** Prohibido simular, hardcodear o inventar datos. Todo CRUD debe nacer en PostgreSQL y escalar hasta la UI siguiendo el patrón exacto de la fábrica `create_optimized_namespace()`.

## Flujo de Trabajo Obligatorio

### 1. Modelo (Backend — SQLAlchemy + BaseModel)
- Leer `backend_model.py.template`
- Crear en `backend/app/models/<modulo>.py`
- Heredar de `BaseModel` (NO de `db.Model` directo)
- Configurar `_namespace_fields`, `_searchable_fields`, `_filterable_fields`, `_sortable_fields`, `_required_fields`, `_unique_fields`
- `_namespace_fields` define el contrato de datos → debe coincidir 100% con frontend types

### 2. Ruta (Backend — Flask-RESTX Namespace + Factory)
- Leer `backend_route.py.template`
- Crear en `backend/app/namespaces/<dominio>/<modulo>_namespace.py`
- Usar `create_optimized_namespace()` — genera automáticamente: GET list, GET by id, POST, PUT, PATCH, DELETE, bulk, stats, metadata
- NO usar Blueprints ni escribir CRUD manual
- Agregar endpoints personalizados SOLO si se necesita lógica extra (no duplicar el CRUD factory)
- Registrar en `backend/app/api/namespaces_registry.py`

### 3. Service (Frontend — BaseService)
- Leer `frontend_service.ts.template`
- Crear en `frontend/src/entities/<modulo>/api/<modulo>.service.ts`
- Extender `BaseService`, constructor recibe el nombre del namespace
- Exportar instancia singleton

### 4. Types (Frontend — TypeScript)
- Leer `frontend_types.ts.template`
- Crear en `frontend/src/entities/<modulo>/model/types.ts`
- Las interfaces deben coincidir EXACTAMENTE con `_namespace_fields` del modelo Backend

### 5. Hook (Frontend — useResource)
- Leer `frontend_hook.ts.template`
- Crear en `frontend/src/entities/<modulo>/model/use<Modulo>.ts`
- Usar `useResource` de `@/shared/hooks/useResource`
- NO inventar lógica de fetching manual

### 6. Página (Frontend — AdminCRUDPage)
- Leer `frontend_page.tsx.template`
- Crear en `frontend/src/pages/dashboard/<rol>/<modulo>/index.tsx`
- Usar `AdminCRUDPage` de `@/widgets/admin-crud/`
- Mobile First: w-full, columnas responsivas

## Check Final
- `npm run type-check` en frontend (coincidencia de contratos)
- Backend arranca sin errores de import
- La UI muestra datos reales de DB, no arrays falsos
