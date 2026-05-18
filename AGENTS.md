# Protocolo de Perfección Funcional (Cero Errores)

Para asegurar entregas 100% funcionales y mitigar la fricción de entorno (WSL/Docker/MCP), se aplican estas reglas de cumplimiento obligatorio:

---

# 🛡️ PROTOCOLO ANTI-PÉRDIDA DE TRABAJO (Nuevo — Obligatorio)

> **Objetivo:** Ninguna sesión de agente debe destruir configuraciones, funcionalidades o vistas ya establecidas.
> **Documento maestro:** `DEVBRAIN_PERSISTENCE_STRATEGY.md`

## 0. Single Source of Truth (SSOT)
- **Único directorio activo:** `frontend/src/` y `backend/`
- **PROHIBIDO** crear: `frontend_VALIDATED_TMP/`, `frontend_backup/`, `*_TMP/`, duplicados en `_archive/`
- Si necesitas backup, usa `git branch backup/YYYY-MM-DD`, NUNCA copies carpetas.
- Antes de tocar cualquier archivo, verificar que la ruta NO contiene `archive`, `backup`, `tmp`, `validated`, `duplicate`.

## 1. Checkpoint Obligatorio (Inicio de Sesión)
Cada agente DEBE ejecutar al inicio:
```bash
bash .devbrain/session-start.sh
```
Esto:
- Verifica que no estás en un directorio prohibido
- Inicializa Git si no existe
- Crea un tag de punto de retorno (`session-start-YYYYMMDD-HHMMSS`)
- Verifica integridad del código

## 2. Checkpoint Automático (Durante Sesión)
Antes de **cualquier** operación destructiva (reemplazo de archivo completo, refactor masivo, eliminación de funciones):
```bash
bash .devbrain/checkpoint.sh "mensaje descriptivo"
```
Esto crea un commit con todo el trabajo actual como punto de retorno.

## 3. Integridad de Archivos (Pre-Edit)
Antes de modificar cualquier archivo:
- [ ] Leer las primeras 5 líneas. Si el archivo tiene **< 5 líneas** y **> 500 chars en línea 1**, está **corrupto/minificado**. NO EDITAR.
- [ ] Si tiene header `⚠️ COMPONENTE CRÍTICO`, leer qué funciones maneja y no eliminarlas.
- [ ] Si existe `FEATURE_MANIFEST.md`, verificar que la funcionalidad no está marcada como crítica antes de modificarla.

## 4. Commits Atómicos (Durante Sesión)
- Un cambio lógico = un commit
- Nunca mezclar: feature + refactor + fix en el mismo commit
- Mensaje de commit descriptivo: `feat:`, `fix:`, `refactor:`, `chore:`

## 5. Verificación de Persistencia (Post-Sesión)
Antes de declarar "terminé", ejecutar:
```bash
bash .devbrain/session-end.sh
```
Esto:
- Verifica que no quedan archivos sin commitear
- Ejecuta `npm run build`
- Corre `integrity-check.sh`
- Crea tag `session-end-YYYYMMDD-HHMMSS`

## 6. Recuperación Rápida
Si algo se rompió en la sesión:
```bash
# Volver al inicio de la sesión
git reset --hard session-start-YYYYMMDD-HHMMSS

# O revertir último commit
git reset --hard HEAD~1

# O restaurar archivo específico desde tag
git checkout session-start-YYYYMMDD-HHMMSS -- ruta/al/archivo.tsx
```

---

# Reglas Originales del Proyecto

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
- **ESTILOS: Tokens semánticos SIEMPRE** — ver `.gemini/rules/ui-standard.md`
  - Prohibido: `bg-white`, `text-slate-900`, `bg-gray-100`, `border-slate-200`, `bg-rose-500`
  - Obligatorio: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-destructive`

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
- `.gemini/rules/ui-standard.md` — estándar completo de estilos UI (tokens semánticos, temas, anti-patrones)
