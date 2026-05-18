# Protocolo de Perfección Funcional (Cero Errores)

Para asegurar entregas 100% funcionales y mitigar la fricción de entorno (WSL/Docker/MCP), se aplican estas reglas de cumplimiento obligatorio:

## 1. Validación de Integridad de Contexto (Pre-Edit)
- Antes de usar un nuevo componente o utilidad (ej: `cn`, `Info`, `Button`), **DEBES** leer el encabezado del archivo para verificar si ya está importado.
- Si no existe el import, **DEBES** añadirlo en la misma sesión. Las ediciones quirúrgicas parciales son la causa #1 de errores `ReferenceError`.

## 2. Verificación Multicapa (Post-Edit)
No basta con que un script de prueba pase. Se requiere:
1.  **Validación de Tipos:** Ejecutar `npm run type-check` (Frontend) o `ruff check` (Backend).
2.  **Validación de Construcción:** Ejecutar `npm run build` en el frontend si se modificaron componentes UI. Si el build falla por importaciones, la tarea NO está terminada.
3.  **Garantía de Runtime:** Si se añade un icono de `lucide-react`, verificar que se exportó/importó correctamente.

## 3. Sincronización de Entorno (Handshake)
- Ejecutar `npm run health` al finalizar para confirmar que los puertos 8092/3005 siguen alineados.
- Si se modificó la DB, resetear secuencias con `fix_sequences.py`.

# Reglas del Proyecto — Finca Villa Luz
... (resto de reglas existentes)
1. ¿Supera 200 líneas? Divide antes de crear.
2. ¿Tiene una sola responsabilidad? Si hace más de una cosa, separa.
3. ¿Está en la carpeta correcta según FSD (frontend) o capas (backend)?
4. ¿Ya existe algo similar que puedas extender en lugar de duplicar?

## Frontend — Reglas obligatorias

- Máximo 200 líneas por archivo (ideal 150)
- Un componente = una responsabilidad
- Llamadas API solo en `{feature}/api/` o `shared/api/` — nunca en componente directo
- Lógica reutilizable → custom hook en `hooks/`
- Tipos compartidos → `shared/types/` o `{entidad}/model/types.ts`
- Sin imports `../../../` — usar `@/` siempre
- FSD layers: `pages → widgets → features → entities → shared` (sin saltar ni invertir)
- `eslint-plugin-boundaries` activo — 0 violaciones toleradas

### Patrón componente nuevo
```
widgets/MiWidget/
  index.ts          ← re-exports
  MiWidget.tsx      ← max 150L
  MiWidget.types.ts
  hooks/
  components/
```

### Archivos legacy a NO crecer
- `shared/ui/common/AdminCRUDPage.tsx` (2844L) — usar `widgets/admin-crud/` en cambio
- `src/components/` — no agregar, es pre-FSD
- `shared/hooks/useResource.ts` — no agregar lógica, dividir cuando sea posible

## Backend — Reglas obligatorias

- Máximo 200 líneas por archivo, 50 por función
- Flujo estricto: `route → service → model → DB`
- Rutas: solo reciben request, validan schema, llaman service, retornan APIResponse
- Queries SQLAlchemy: solo en `models/` o `services/`
- Nuevos namespaces: en `app/namespaces/{dominio}/` (no en `app/api/namespaces/`)
- Type hints obligatorios en funciones públicas
- Logging: `logging.getLogger(__name__)`, nunca `print()`
- Configuración: solo de `current_app.config` o variables de entorno

### Patrón namespace nuevo
```python
# app/namespaces/{dominio}/routes.py  (max 150L)
# app/namespaces/{dominio}/schemas.py (validación)
# app/services/{dominio}_service.py   (lógica)
```

### Archivos legacy a NO crecer
- `namespaces/finanzas/analytics_namespace.py` (1989L) — monolito en deprecación
- `utils/namespace_helpers.py` (1776L) — dividir al modificar
- `utils/analytics.py` (982L) — dividir al modificar

## Al modificar código existente

1. Lee `ARCHITECTURE.md` y `CODING_RULES.md`
2. Trabaja en rama separada
3. Commits atómicos (un cambio lógico por commit)
4. Si encuentras bug: créa issue, no lo arregles en el mismo commit del refactor
5. Verifica que app sigue arrancando después de cada cambio significativo
6. Punto de retorno siempre disponible: `git reset --hard <hash>`

## Bugs conocidos activos

- `GET /api/v1/analytics/dashboard` retorna ceros — usar `/analytics/dashboard/complete`
- `GET /api/v1/analytics/dashboard/simple` también retorna ceros

## Documentación del proyecto

- `ARCHITECTURE.md` — estructura, capas, endpoints
- `CODING_RULES.md` — reglas detalladas con ejemplos
