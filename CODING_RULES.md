# Reglas de Código — Finca Villa Luz

## Límites de tamaño (enforzados por linters)

| Unidad | Máximo | Ideal |
|---|---|---|
| Archivo (frontend) | 200 líneas | 100-150 |
| Archivo (backend) | 200 líneas | 100-150 |
| Función / método | 50 líneas | 20-30 |
| Componente React | 150 líneas JSX | 80-120 |
| Parámetros por función | 4 | 2-3 |
| Profundidad de anidado | 3 niveles | 2 |
| Complejidad ciclomática | 10 | 5 |

---

## Reglas Frontend (React + TypeScript)

### Estructura de archivos

```
widgets/MiWidget/
  index.ts              ← solo re-exports
  MiWidget.tsx          ← componente principal (max 150L JSX)
  MiWidget.types.ts     ← interfaces/props
  hooks/                ← hooks específicos del widget
  components/           ← sub-componentes
```

### Reglas obligatorias

1. **Un componente = una responsabilidad.** Si hace fetch + estado + render complejo → dividir.
2. **Llamadas API solo en `services/` o en `{feature}/api/`.** Nunca `fetch()`/`axios` en un componente directamente.
3. **Lógica reutilizable → custom hook.** Si el `useEffect` tiene más de 10 líneas → hook.
4. **Tipos compartidos → `shared/types/` o `{entidad}/model/`.** No definir interfaces inline en componentes grandes.
5. **Sin imports `../../../`.** Usar alias `@/` siempre.
6. **Componentes "dumb" en `ui/`.** Solo props y render, sin efectos ni llamadas API.
7. **Componentes "smart" en `features/` o `widgets/`.** Estado, efectos, coordinación.
8. **FSD boundaries obligatorios.** `pages` → `widgets` → `features` → `entities` → `shared`. Nunca al revés.
9. **Política de Ancho de Pantalla Completo (Full Screen Width Policy).** El sistema Villa Luz OS está diseñado para ser operado y visualizado desde cualquier dispositivo, incluyendo celulares, portátiles y pantallas de TV de gran formato. Todo layout principal y página de dashboard debe ocupar el 100% del ancho de pantalla disponible. Queda **PROHIBIDO** usar la clase `.container` de Tailwind en layouts principales y páginas (usar `w-full` en su lugar), dado que sus media-queries restringen el ancho máximo de forma predeterminada a 1280px o 1536px, dejando márgenes vacíos en pantallas grandes.

### Prohibido

- `fetch()` / `axios.get()` directamente en un componente (usar `apiFetch` o service)
- Definir tipos/interfaces en el cuerpo de un componente grande
- Props drilling más de 2 niveles (usar context o mover estado arriba/abajo)
- `useEffect` con más de 2 dependencias y lógica compleja inline
- Importar desde `shared/ui/common/AdminCRUDPage.tsx` (legacy) — usar `widgets/admin-crud/`
- Archivos nuevos en `src/components/` (pre-FSD legacy, no crecer)

---

## Reglas Backend (Flask + Python)

### Capas y responsabilidades

```
namespaces/{dominio}/routes.py   ← recibe request, llama service, retorna APIResponse
namespaces/{dominio}/schemas.py  ← validación entrada/salida (marshmallow o api.model)
services/{dominio}_service.py    ← lógica de negocio, sin ORM directo
models/{recurso}.py              ← SQLAlchemy models + queries simples
```

### Reglas obligatorias

1. **Rutas delegan, no implementan.** Una ruta = máximo 15 líneas: validar, llamar service, responder.
2. **Queries SQLAlchemy en models o services.** NUNCA `db.session.query()` en un namespace route.
3. **Type hints en todas las funciones públicas.**
4. **Configuración solo desde `config.py` / variables de entorno.** Sin strings hardcoded de URLs o secrets.
5. **Errores → excepciones personalizadas** capturadas por `error_handlers.py`. Queda prohibido usar bloques `try/except Exception` genéricos en las rutas para formatear/retornar errores manualmente. En su lugar, se deben lanzar excepciones personalizadas (`ValidationError`, `BusinessRuleException`, `ResourceNotFoundException`, `ForbiddenException`, `UnauthorizedException`, `ConflictException`) y dejar que se propaguen de forma natural para ser capturadas y formateadas centralmente en respuestas JSON estandarizadas. Todo nuevo escenario de error o excepción debe estar cubierto por pruebas unitarias en el backend.
6. **Nuevos namespaces en `app/namespaces/{dominio}/`.** NO en `app/api/namespaces/` (legacy, unificar).
7. **Application factory siempre.** Ningún código ejecutable a nivel módulo fuera de `create_app()`.

### Prohibido

- `db.session.query()` / `Model.query.filter()` in `*_namespace.py` files
- Lógica de negocio (cálculos, transformaciones, reglas) directamente en rutas
- `print()` para logging (usar `logging.getLogger(__name__)`)
- Credenciales / URLs hardcoded (usar `current_app.config['KEY']`)
- Crear nuevos archivos `*_namespace.py` > 200 líneas (dividir desde el inicio)
- **Simular funcionalidad en backend:** Queda PROHIBIDO simular rutas, respuestas o modelos de base de datos. Toda característica o acción requerida debe implementarse en código Python/SQLAlchemy real con actualizaciones físicas de la base de datos.

---

## Reglas de integración Frontend ↔ Backend

1. **Respuestas siempre por `APIResponse`** del backend. Frontend lee `.data`, `.meta`, `.message`.
2. **snake_case backend, camelCase frontend.** `responseNormalizer.ts` hace la transformación.
3. **Errores HTTP estándar.** 400 validación, 401 auth, 403 permisos, 404 no encontrado, 500 servidor.
4. **Paginación consistente.** `{ data: [], meta: { page, per_page, total } }`.
5. **Nuevos endpoints documentados** en `ARCHITECTURE.md` tabla de endpoints críticos.

---

## Proceso de cambios seguros

1. Siempre en rama feature/fix, nunca directo en `main`
2. Commits atómicos: un cambio lógico por commit
3. Antes de merge: verificar que build frontend funciona + backend arranca
4. Si refactorizas: NO cambies comportamiento en el mismo commit que mueves código
5. Si encuentras un bug durante refactor: créa issue, NO lo arregles en el mismo commit
