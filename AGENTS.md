# CATEGORIA: app — Villaluz

**Esta regla es ABSOLUTA y aplica a TODOS los proyectos del ecosistema DevBrain, para SIEMPRE.**

Las aplicaciones (backend/frontend) **NO** deben ejecutarse en contenedores Docker en desarrollo local.
La infraestructura compartida (PostgreSQL y Redis/Memurai) se ejecuta de forma **nativa en Windows** (servicios de Windows) para eliminar por completo la dependencia de WSL/Docker y ahorrar recursos. Qdrant no forma parte del runtime local.

## Principio Fundamental
- **Infraestructura** → Servicios nativos en Windows (PostgreSQL en 5434 y Memurai en 6380)
- **Aplicaciones** → Windows nativo (Python/Node directo, sin Docker ni WSL)
- **Ahorro**: ~3.2 GB RAM (villaluz) + ~678 MB (sennova) + ~500 MB (cgao) = ~4.4 GB total

## Prohibiciones Absolutas
1. **NO** ejecutar `docker compose up` para aplicaciones (backend/frontend) en desarrollo.
2. **NO** crear nuevos contenedores para proyectos existentes.
3. **NO** mezclar contenedores de aplicación con infraestructura compartida.
4. **NO** usar Nginx en Docker para static sites — usar `python -m http.server`.
5. **NO** sobrepasar los límites de RAM: si un proyecto necesita +1 GB en Docker, va a nativo.

## Scripts de Inicio Obligatorios
Cada proyecto DEBE tener un `start-windows.ps1` en su raíz con:
- Backend: proceso nativo (Flask `python wsgi.py` / FastAPI `uvicorn app.main:app` / Next.js `next dev`)
- Frontend: Vite / Next.js nativo
- PostgreSQL/Redis: apuntar a `127.0.0.1:5434` y `127.0.0.1:6380` (Nativos de Windows)
- Logs: en `logs/` del proyecto
- Parámetros: `-Stop`, `-Status`, `-FrontendOnly`, `-BackendOnly`

## Script de Startup Post-Reinicio
No se registran tareas automáticas para DevBrain ni Villaluz. PostgreSQL y Memurai son servicios nativos independientes; iniciar Villaluz manualmente después de `devbrain start`:
```powershell
cd C:\Users\Miguel\Documents\Aplicaciones\_projects\villaluz
.\start-windows.ps1 -Daemon

# Use -BackendOnly only when the Vite frontend is already running.
```

## Excepciones
1. **Producción/Coolify**: Docker es aceptable en servidores (no hay Windows).
2. **Proyectos sin backend nativo**: Solo si no existe Python/Node para Windows (ej: Go/Wails).
3. **Pruebas CI/CD**: GitHub Actions usa Docker efímero, no afecta RAM local.

## Verificación de Cumplimiento
```powershell
# Verificar que los servicios de infraestructura nativos estén corriendo
Get-Service -Name "postgresql-x64-18", "Memurai" -ErrorAction SilentlyContinue
```

## Mapa de Puertos
| Puerto | Servicio | Tipo | Proyecto |
|--------|----------|------|----------|
| 5434 | PostgreSQL | Infra | Compartido |
| 6380 | Memurai (Redis) | Infra | Compartido |
| 8092 | Backend Flask | Nativo | Villaluz |
| 8000 | Backend FastAPI | Nativo | Sennova |
| 8002 | Backend FastAPI | Nativo | CGAO |
| 8009 | Backend FastAPI | Nativo | ADSO |
| 3005 | Frontend Vite | Nativo | Villaluz |
| 3006 | Frontend Vite | Nativo | Sennova |
| 3000 | Frontend Vite | Nativo | CGAO |
| 3009 | Frontend Next.js | Nativo | ADSO |
| 3008 | Frontend Next.js | Nativo | Turismo |
| 8013 | Static HTML | Nativo | CGAO Landing |
| 8019 | Static HTML | Nativo | Presentación |

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

## 4. Estrategia Anti-Bucle e Integración de Capas (Evitar Fugas de Metadatos y Falsas Asunciones)
Para evitar bucles de desarrollo fallidos y asegurar soluciones 100% efectivas, todo agente de IA debe cumplir obligatoriamente estas directrices:

1. **Auditoría de Abstracciones en Servicios (Front-to-Back)**:
   - **Prohibido asumir retornos de API a ciegas**: Si el backend devuelve un objeto complejo con propiedades de metadatos (como `meta`, `message`, `status`), verifica siempre el `.service.ts` correspondiente para ver si hace uso de `customRequest` (que por defecto desenvuelve `.data` y desecha el resto de las propiedades del payload).
   - **Bypass de Wrappers**: Si requieres acceder a la respuesta original completa (incluyendo `meta`), puentea `customRequest` realizando la petición directa usando el cliente `api` importado (`api.get`, `api.post`).

2. **Garantía de Casos de Borde (Omitidos y Conteo)**:
   - En operaciones masivas (traslados, asignaciones, actualizaciones), la lógica debe manejar explícitamente escenarios donde los datos de entrada ya tengan el estado deseado. El backend debe calcular y retornar cuántos registros fueron modificados y cuántos omitidos, y el frontend debe informar de esto al usuario detalladamente para evitar malentendidos de conteo.

3. **Pruebas de Integración Mandatorias para Endpoints Modificados**:
   - Si creas o alteras la lógica de un endpoint REST/controlador que no esté cubierto por la suite de pruebas actual, es de cumplimiento OBLIGATORIO escribir un archivo de prueba correspondiente en `backend/tests/` (ej: `test_..._meta.py`) que simule el ciclo completo del endpoint con sus casos de éxito y descarte.
   - Ejecuta `python -m pytest tests/tu_archivo_test.py` y asegúrate de que pase exitosamente.

4. **Compilación Estricta**:
   - Corre `npx tsc --noEmit` en el frontend tras modificar firmas de servicios o tipos de datos para prevenir errores de tipo silenciosos en otros consumidores.

## Sistema de Inicio DevBrain

**IMPORTANTE**: El ecosistema DevBrain se inicia mediante el script `START-DEVBRAIN.ps1` accesible desde el desktop como `DEVBRAIN START.lnk`.

### Comando de Inicio Oficial
```powershell
# Desde el desktop shortcut:
C:\Users\Miguel\Desktop\DEVBRAIN START.lnk

# O directamente:
pwsh -NoExit -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\mcp\START-DEVBRAIN.ps1" -ManualDesktopLaunch
```

### Qué Hace el Inicio
1. **Verifica** PostgreSQL nativo en `5434` y Memurai nativo en `6380`
2. **Limpia procesos/puertos anteriores** del propio DevBrain
3. **Levanta el gateway MCP único** en `8010`
4. **Levanta el Dashboard Flask** en `8050` o `8051` si `8050` está protegido
5. **Levanta Headroom CPU** en `8787`
6. **Deja los proyectos apagados** hasta que se soliciten explícitamente

### Servicios que Inicia
- Dashboard Flask: puerto 8050/8051
- Gateway MCP único: puerto 8010
- Headroom CPU: puerto 8787
- MCP-Core: puerto 8081
- Redis: puerto 6380

### Regla de Oro
**SIEMPRE** usar `DEVBRAIN START` del desktop para iniciar el ecosistema. No iniciar servicios manualmente.

## Configuración OpenCode

El proyecto villaluz tiene configuración de OpenCode en `opencode.json` con:

### MCP Servers Configurados
- **devbrain-core**: MCP core de DevBrain (puerto 8081)
- **devbrain-ai**: AI Processor con GPU/NPU (puerto 8083)
- **devbrain-npu-bridge**: Bridge para NPU Intel (puerto 7801)
- **filesystem**: Acceso a sistema de archivos
- **memory**: Memoria persistente
- **fetch**: HTTP requests

### LSP Servers Configurados
- **TypeScript/JavaScript**: typescript-language-server para .ts, .tsx, .js, .jsx
- **Python**: pyright-langserver para .py

### Por Qué LSP Estaba Vacío
OpenCode soporta LSP nativamente pero requiere configuración explícita en `opencode.json`. Sin configuración, no carga ningún language server automáticamente.

### Uso
Al iniciar OpenCode en el proyecto villaluz, automáticamente:
1. Carga los MCP servers de DevBrain
2. Inicia los LSP servers para TypeScript y Python
3. Proporciona autocompletado, diagnóstico y navegación de código

## ¿Qué son los LSP y por qué importan?

**LSP (Language Server Protocol)** es un estándar que permite a los editores/IDEs proporcionar:

### Capacidades que ofrece
- **Autocompletado inteligente** — Sugiere variables, funciones, métodos según el contexto
- **Diagnóstico en tiempo real** — Detecta errores de tipo ANTES de ejecutar el código
- **Navegación de código** — "Go to Definition", "Find References", "Go to Implementation"
- **Refactoring asistido** — Renombrar símbolos en todo el proyecto
- **Hover information** — Muestra tipos, documentación, firmas de funciones
- **Code actions** — Quick fixes, importaciones automáticas

### LSP en el Ciclo Virtuoso DevBrain

Los LSP están integrados en `db verify` como check `lsp_types`:

```
┌─────────────────────────────────────────────────────────────┐
│  db verify ejecuta en orden:                                │
├─────────────────────────────────────────────────────────────┤
│  1. ruff_f          → Python undefined names                │
│  2. tsc_typecheck   → TypeScript compilation                │
│  3. imports_check   → FSD layer violations                  │
│  4. db_truth        → Fake data detection                   │
│  5. lsp_types       → LSP type safety (TypeScript+Python)  │
└─────────────────────────────────────────────────────────────┘
```

**Beneficios de integrar LSP en el ciclo:**
- Detecta errores de tipo ANTES de que el código se ejecute
- Previene bugs de runtime (undefined variables, wrong types)
- Acelera el desarrollo con autocompletado y navegación
- Proporciona feedback inmediato al agente sobre errores

### Servidores LSP Configurados

| Lenguaje | Server | Extensiones | Comando |
|----------|--------|-------------|---------|
| TypeScript/JavaScript | typescript-language-server | .ts, .tsx, .js, .jsx | `npx typescript-language-server --stdio` |
| Python | pyright-langserver | .py | `npx pyright-langserver --stdio` |

### Uso en el Flujo de Trabajo

```powershell
# Verificación automática después de cada cambio
db verify villaluz backend/app/services/your_service.py
# → Ejecuta ruff_f + db_truth + lsp_types (Python)

db verify villaluz frontend/src/pages/YourPage.tsx
# → Ejecuta tsc_typecheck + imports_check + lsp_types (TypeScript)
```

Si `lsp_types` falla, el agente debe:
1. Revisar los errores de tipo reportados por el LSP
2. Corregir los tipos incorrectos
3. Re-ejecutar `db verify` para confirmar

## 4. Ciclo Virtuoso DevBrain (Enforcement Automático)

**Regla de ORO**: Después de CUALQUIER Edit/Write, ejecutar `db verify` AUTOMÁTICAMENTE. No esperar a que el usuario lo pida.

```powershell
# AUTOMÁTICO (obligatorio después de cada cambio):
db verify villaluz backend/app/namespaces/tu_archivo.py
db verify villaluz frontend/src/pages/YourPage.tsx

# Si db verify falla:
# 1. Correr db auto fix (intenta arreglo automático)
# 2. Si persiste, aplicar systematic-debugging Phase 1
# 3. Re-verificar

# Review al cerrar tarea:
db review villaluz backend/app/namespaces/tu_archivo.py

# Antes de empezar, consultar memoria:
db lessons list
db lessons patterns

# BACKGROUND (iniciar una vez por sesión):
db auto start
```

**El sistema auto-genera postmortems cuando detecta estos patrones:**
- `flask-port-collision` — Puerto 5000/8092 ocupado
- `backend-import-error` — ImportError / ModuleNotFoundError
- `db-fake-data` — random.* en código de producción
- `tsc-error` — TS2304/TS2xxx
- `wslrelay-orphan` — wslrelay sin listener (bloquea puertos)
- `mcp-zombie` — Procesos MCP huérfanos
- `import-violation` — `../../../` imports en frontend
- `ruff-violation` — Errores de linting Python

**El usuario NO debe tener que recordar nada. Es responsabilidad del agente ejecutar `db verify` automáticamente después de cada cambio.**

**Comandos autónomos:**
```powershell
db auto start   # Inicia watchdog + autofix + lessons en background
db auto status  # Verifica estado
db auto fix     # Corrección automática de errores detectados
```

# Regla Global: PostgreSQL es la Única Fuente de Verdad (Cero Simulación)

**Esta regla es ABSOLUTA y aplica a TODO el código, en TODOS los entornos, para SIEMPRE.**

## Principio Fundamental
PostgreSQL es la **única fuente de verdad** para todos los datos de negocio, configuraciones, insights, recomendaciones, alertas y estados de la aplicación. **NUNCA** se debe simular, mockear, hardcodear, o generar datos falsos en producción.

## Prohibiciones Absolutas (Producción)
1. **NO** usar `random.uniform()`, `random.randint()`, `random.choice()`, `Faker`, o cualquier generador de datos aleatorios en servicios o endpoints.
2. **NO** retornar diccionarios/listas hardcodeadas como respuesta de API (excepto configuración UI estática como iconos, colores, o estructuras de navegación).
3. **NO** usar IA/LLM (OpenAI, Anthropic, Cohere, Ollama) para generar respuestas en producción. Todo contenido debe venir de `system_contents` o tablas de negocio.
4. **NO** crear fallbacks a datos simulados cuando la DB no tiene datos. Retornar `null`, `[]`, o error apropiado.
5. **NO** inyectar datos falsos en `localStorage`, `sessionStorage`, o contexto de autenticación en producción.
6. **NO** usar MSW handlers, mock providers, o test fixtures en rutas de producción (`src/`).
7. **NO** usar datos hardcodeados en el frontend (UI) como fallbacks temporales de clima, producción, o finanzas. Si no hay conexión o no se encuentran datos en base de datos, se debe dejar el espacio vacío o mostrar indicadores de ausencia de datos (ej: `--`).


## Excepciones Permitidas
1. **Scripts de seed/migración**: Pueden contener datos hardcodeados SIEMPRE que:
   - Estén protegidos por `ALLOW_SIMULATION_SCRIPTS=true` variable de entorno
   - Escriban a PostgreSQL (no retornen datos fake a APIs)
   - Usen patrones idempotentes (`if not exists`)
2. **Tests**: Mocks y fixtures son aceptables en `tests/` o `test/` directorios.
3. **Fallbacks de resiliencia**: Valores por defecto para APIs externas (Open-Meteo, etc.) son aceptables SI:
   - Son claramente identificados como "datos de respaldo"
   - No representan datos de negocio del usuario
   - Se prioriza retornar `None`/`null` sobre datos fabricados
4. **Configuración UI estática**: Iconos, colores, estructuras de navegación, y patrones de diseño pueden ser hardcodeados.

## Patrón Obligatorio para Configuraciones
Todas las configuraciones, parámetros, thresholds, y constantes de negocio deben leerse de `system_contents`:

```python
# ✅ CORRECTO - Lee de DB
def get_target_weight():
    entry = SystemContent.get_by_key('param.target_market_weight')
    return int(float(entry.content)) if entry else None  # Retorna None, no hardcoded

# ❌ INCORRECTO - Hardcoded fallback
def get_target_weight():
    return 450  # NUNCA hacer esto
```

## Verificación Obligatoria
Antes de commit, verificar:
1. **Backend**: `grep -r "random\." app/services/ app/namespaces/` → debe retornar 0 resultados (excepto seed scripts)
2. **Frontend**: `grep -r "mock\|fake\|simulated" src/ --include="*.ts" --include="*.tsx"` → debe retornar 0 resultados (excepto `tests/`)
3. **DB**: `system_contents` table debe tener entradas para todas las claves referenciadas en código

## Consecuencias de Violación
Cualquier código que viole esta regla debe ser:
1. Rechazado en code review
2. Refactorizado inmediatamente para leer de DB
3. Documentado en el commit como "fix: eliminate simulated data"

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

### i18n — Español Colombia (es-CO) Obligatorio

Todo el UI, textos en DB, y mensajes al usuario deben usar **español colombiano**. Los scripts `fix_ux.py` (frontend) y `backend/update_db_texts.py` (DB) aplican las correcciones automáticas.

**Léxico prohibido** — no usar estos términos; reemplazar por el equivalente es-CO:

| Término prohibido | Reemplazo es-CO | Ámbito |
|-------------------|-----------------|--------|
| `Hato` | `Ganado` | UI visible al usuario |
| `Dashboard` | `Resumen` | UI, títulos, labels |
| `Overview` | `Vista general` | UI |
| `Membresía` | `Acceso` | UI, SystemContent |
| `Ir al Dashboard` | `Ir al Resumen` | UI |

**Verificación automática**: antes de commit, ejecutar:
```powershell
grep -rn -i "\bhato\b" frontend/src/ --include="*.tsx" --include="*.ts"
# Debe retornar 0 resultados en UI produccion (excluir _VALIDATED_TMP, docs, CHANGELOG)
```

**Excepciones**: endpoints API (`/api/v1/.../hato`) NO deben cambiarse para no romper contratos.

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

## Motor de Alertas v2 — Nuevas capacidades

### Modelos nuevos
- `BreedGrowthStandard` — Curvas de crecimiento por raza/sexo/etapa (`app/models/breed_growth_standards.py`)
- `BodyConditionScore` — Registro BCS 1-9 con tendencia (`app/models/body_condition_scores.py`)
- `SeasonalAdjustment` — Factores estacionales por finca/mes (`app/models/seasonal_adjustments.py`)

### Reglas nuevas en AlertEngine (alert_engine.py)
| # | Regla | Condición | Prioridad |
|---|-------|-----------|-----------|
| 30 | Peso bajo vs raza | Desviación >15-25% bajo estándar racial | MEDIA-ALTA-CRÍTICA |
| 31 | ADG sostenido bajo | ADG real <40-60% del esperado | MEDIA-ALTA-CRÍTICA |
| 32 | Proyección forward | Peso proyectado a 12m < mínimo esperado | ALTA |
| 33 | Enfermedad + pérdida peso | Enfermedad activa + caída ≥3% | CRÍTICA |
| 34 | Lactancia + pérdida peso | Vaca lactando + caída 5-10% (atenuado) | MEDIA |
| 35 | Ventana post-tratamiento | Pérdida 3-5% en 14 días post-tratamiento | Suprimida |
| 36 | BCS bajo | Score ≤2 (CRÍTICA), ≤3 (ALTA), ≤4 (MEDIA) | Variable |
| 37 | BCS tendencia negativa | Caída ≥1.5 puntos en 90 días | ALTA |
| 38 | Diagnóstico negativo | >14-21 días sin re-inseminación | MEDIA-ALTA |
| 39 | Repeat breeder | ≥3 inseminaciones sin preñez | ALTA-CRÍTICA |
| 40 | Parto vencido | >0-14 días past due date | MEDIA-ALTA-CRÍTICA |
| 41 | Complicaciones post-parto | Revisión día 3 y 7 post-complicación | ALTA-CRÍTICA |
| 42 | Parto gemelar | alive_count >1, manejo especial 7 días | ALTA |
| 43 | Secuencia inconsistente | Parto sin inseminación/celo previo | MEDIA |
| 44 | Sin controles >90-120 días | Alerta escalonada por días sin pesaje | MEDIA-ALTA |

### Endpoints nuevos (growth_namespace.py)
- `GET /api/v1/growth/projection/<id>` — Proyección forward a hitos
- `GET /api/v1/growth/bcs/<id>` — Historial BCS de animal
- `GET /api/v1/growth/bcs` — BCS promedio del hato
- `GET /api/v1/growth/breed-standards` — Estándares por raza
- `GET /api/v1/growth/seasonal-adjustments` — Ajustes estacionales

### Seed scripts
- `scripts/seed_breed_growth_standards.py` — 120 estándares (4 razas × 2 sexos × 15 edades)
- `scripts/seed_seasonal_adjustments.py` — 12 meses por finca
- `scripts/test_alert_engine_v2.py` — Prueba integral (6 escenarios, 6 checks)

## Modo de Ejecución

### 🏠 Modo Nativo Windows (RECOMENDADO para desarrollo)
 Ejecuta infraestructura y proyectos directamente en Windows para ahorrar RAM. No se usan WSL, Docker, Mutagen ni Qdrant en desarrollo local.

| Proyecto | Comando | Puertos |
|----------|---------|---------|
| Villaluz completo | `.\start-windows.ps1` | 3005/8092 |
| Solo backend | `python wsgi.py` (en backend/) | :8092 |
| Solo frontend | `npm run dev` (en frontend/) | :3005 |
| DevBrain completo | `devbrain start` | 8010/8050/8787 |
| Detener (apaga todo) | `devbrain stop` | Solo componentes propios; PostgreSQL/Memurai siguen activos |

### 🐳 Modo Docker (solo producción o si no hay Python/Node local)
- `docker compose -f docker-compose.lean.yml up -d` — 1 contenedor (backend)
- `docker compose up -d` — 4 contenedores completo (producción Coolify)

### Ahorro de RAM en Modo Nativo
| Contenedor | RAM | Alternativa Nativa |
|-----------|-----|--------------------|
| frontend (Nginx) | 193MB | Vite (`npm run dev`) |
| celery_worker | 551MB | Python (`celery -A celery_worker worker`) |
| celery_beat | 162MB | Python (`celery -A celery_worker beat`) |
| **Total ahorrado** | **~906MB** | — |

## Documentación del proyecto

- `ARCHITECTURE.md` — estructura, capas, endpoints
- `CODING_RULES.md` — reglas detalladas con ejemplos
- **Responsive Mobile-First:** `docs/RESPONSIVE_MOBILE_FIRST_STRATEGY.md` (OBLIGATORIO — Villaluz es el proyecto referencia)

## Estándar Responsive — Proyecto Referencia

**Villaluz es el proyecto de referencia para responsive mobile-first en el ecosistema DevBrain.**

- **Documento oficial:** `C:\Users\Miguel\Documents\Aplicaciones\docs\RESPONSIVE_MOBILE_FIRST_STRATEGY.md`
- **Breakpoints:** mobile (375px) → sm (640px) → md (768px) → lg (1024px) → xl (1280px) → 2xl (1536px)
- **Principio:** Construir desde el teléfono, escalar hacia arriba. Información completa sin scroll horizontal.
- **Sistema de tokens:** Implementado en `frontend/src/app/styles/index.css` (colores, espaciado, sombras, radios, grids)
- **Checklist:** Verificar en 5 viewports: 375px · 768px · 1280px · 1920px · 2560px

Todos los nuevos componentes y páginas DEBEN seguir esta estrategia.

# Dual Mode: DevBrain Dashboard (Native Dev) + Coolify (Docker Prod)

**Cada proyecto tiene dos modos de operación con env vars independientes.**

## Modo 1: DevBrain Dashboard → Nativo Windows (desarrollo)

| Aspecto | Cómo funciona |
|---------|--------------|
| Inicio | `DEVBRAIN START` del desktop → Dashboard puerto 8050 |
| Backend | `start-windows.ps1` → Flask nativo `python wsgi.py` en `:8092` |
| Frontend | `start-windows.ps1` → Vite nativo `npm run dev` en `:3005` |
| Hot Reload | ✅ Vite HMR + Flask debug mode (recarga automática al editar) |
| Env vars | `backend/.env`, `frontend/.env`, `.env` raíz — leídos por `python-dotenv` en `wsgi.py` |
| PostgreSQL | Servicio Windows `postgresql-x64-18` en `127.0.0.1:5434` |
| Redis | Servicio Windows `Memurai` en `127.0.0.1:6380` |
| Logging | Archivos en `logs/` del proyecto + Dashboard en tiempo real |
| Debug | Flask debug mode, Werkzeug, hot-reload, Vite HMR, SSO/SSE sin TLS |
| Init DB | `wsgi.py` ejecuta `db.create_all()` + `run_core_initialization()` + `seed_all_fincas()` |
| Celery | `start_celery_worker.bat` y `start_celery_beat.bat` — procesos separados |

## Modo 2: Coolify → Docker (producción)

| Aspecto | Cómo funciona |
|---------|--------------|
| Inicio | Click "Deploy" en Coolify UI (Contabo VPS) |
| Backend | Gunicorn + gevent, 5 workers, puerto interno `8081` |
| Frontend | Nginx sirve build estático, puerto interno `80` |
| Hot Reload | ❌ No — cada deploy hace build completo |
| Env vars | Se setean en Coolify UI — NO existen `.env` en producción |
| Vars requeridas | `DB_USER`, `DB_PASSWORD`, `FLASK_SECRET_KEY`, `JWT_SECRET_KEY`, `DOMAIN`, `VITE_API_BASE_URL`, `VITE_FRONTEND_URL` |
| PostgreSQL | Contenedor interno `villaluz-db:5432` (PostgreSQL 16) |
| Redis | Contenedor interno `villaluz-redis:6379` (Redis 7, maxmemory 128mb) |
| Logging | `stdout/stderr` de Docker (gunicorn `--access-logfile - --error-logfile -`) |
| Debug | ❌ Producción estricta — sin debug, sin HMR, sin Vite |
| Init DB | Servicio `villaluz-db-init` (corre y muere): `flask db upgrade` + seed |
| Celery | Contenedores `villaluz-worker` + `villaluz-beat` (en la misma red Docker) |
| Backup | Contenedor `villaluz-backup`: pg_dump diario, retención 7 días |
| TLS | Traefik de Coolify (HTTPS automático) — backend solo HTTP interno |
| Red | `villaluz-net` bridge interna — Coolify conecta su red externa automáticamente |

## Health Checks en Producción

| Servicio | Healthcheck | Intervalo |
|----------|-------------|-----------|
| Backend | `curl http://localhost:8081/api/v1/health` | 30s |
| Frontend | `curl http://localhost/` | 30s |
| PostgreSQL | `pg_isready -U ${DB_USER}` | 10s |
| Redis | `redis-cli ping` | 10s |
| Celery Worker | `celery inspect ping` | 60s |

## Resiliencia a Redis/Celery Caídos (Auto-Recuperación)

**La app Flask arranca y funciona aunque Redis/Celery estén caídos** — esto aplica TANTO en desarrollo nativo como en Docker producción:

| Componente | Si Redis/Celery falla... | Mecanismo de recuperación |
|------------|--------------------------|---------------------------|
| Caché (Flask-Caching) | Cae a `SimpleCache` (memoria local del worker) | Detectado en `init_extensions` al hacer `ping()` |
| EventBus SSE | Cae a `InMemoryEventBus` (eventos solo intra-proceso) | Hilo listener inmortal con backoff exponencial + jitter |
| Rate Limiter | Cae a `memory://` (cada worker cuenta por separado) | Verificación de `ping()` en init, fallback automático |
| Presence Tracker | Usa diccionarios en RAM local | Sin dependencia de Redis |
| Token Blocklist | Fallback a diccionario en memoria con TTL manual | `is_token_revoked()` fail-safe → permite acceso |
| Token Revocation | Guarda en memoria local si Redis falla | `mark_token_revoked()` → siempre retorna `True` |
| Celery task `.delay()` | Retorna error `503` informativo sin crash | App Flask sigue funcionando |
| Redis publish (KPIs) | Log throttled + skip publish individual | No crash de tarea Celery |

### Mecanismos de Auto-Recuperación Implementados

1. **Backoff Exponencial con Jitter** (`redis_bus.py`):
   - Fórmula: `wait = min(2^attempt, 60) + random(0, base*0.3)`
   - El hilo de escucha **NUNCA muere** — reintenta indefinidamente
   - Al reconectarse: logea éxito y resetea contador de fallos
   - Tras 10+ fallos: logea modo degradado (1 vez/min)

2. **Log Throttling** (`redis_bus.py`, `token_blocklist.py`):
   - Máximo 1 log por minuto por tipo de error cuando un servicio está caído
   - Evita inundar los logs con miles de líneas repetidas
   - Patrón: `_should_log(error_key)` con diccionario `_last_log_time`

3. **Fallback en Memoria para Seguridad** (`token_blocklist.py`):
   - Si Redis no responde → `_fallback_blocklist` diccionario con TTL manual
   - `is_token_revoked()` → retorna `False` si no puede verificar (fail-safe)
   - `mark_token_revoked()` → guarda en memoria y retorna `True` siempre

4. **Init Resiliente** (`extensions/__init__.py`):
   - `socket_connect_timeout=3` para fallo rápido
   - `health_check_interval=30` para detectar conexiones muertas
   - Si `ping()` falla → `redis_client = None`, app arranca sin Redis

5. **DB Init con Retry** (`wsgi.py`):
   - `_init_database_with_retry()`: máximo 5 intentos con delay incremental
   - Si DB no está → la app arranca igual, `mark_database_available()` al final

**El worker de Celery SÍ necesita Redis** — es inherente (no hay broker = no hay mensajes). Si Redis se cae, el worker muere y debe reiniciarse. Docker restart policy (`unless-stopped`) lo revive automáticamente cuando Redis vuelva.


## Mapa de Env Vars (Dev ↔ Prod)

| Variable | Dev (.env) | Prod (Coolify UI) | ¿Obligatoria en prod? |
|----------|-----------|-------------------|----------------------|
| `DB_USER` | `villaluz` | `${DB_USER}` | ✅ |
| `DB_PASSWORD` | `villaluz_pass` | `${DB_PASSWORD}` | ✅ |
| `DB_NAME` | `finca_db` | `${DB_NAME:-villaluz}` | ❌ (default) |
| `DB_HOST` | `127.0.0.1` | `villaluz-db` | ✅ (fijo en compose) |
| `DB_PORT` | `5434` | `5432` | ✅ (fijo en compose) |
| `REDIS_URL` | `redis://127.0.0.1:6380/0` | `redis://villaluz-redis:6379/0` | ✅ (fijo en compose) |
| `FLASK_SECRET_KEY` | `dev-secret-key` | `${FLASK_SECRET_KEY}` | ✅ |
| `JWT_SECRET_KEY` | `dev-jwt-secret` (64+ chars) | `${JWT_SECRET_KEY}` | ✅ (>=64 chars) |
| `JWT_COOKIE_DOMAIN` | ❌ (no se usa) | `${DOMAIN}` | ✅ |
| `CORS_ORIGINS` | `http://localhost:3005,...` | `https://${DOMAIN},https://www.${DOMAIN}` | ✅ (fijo en compose) |
| `SENTRY_DSN` | ❌ | `${SENTRY_DSN:-}` | ❌ |
| `PORT` | `8092` | `8081` | ✅ (fijo en compose/en Dockerfile) |
| `LOG_LEVEL` | `DEBUG` | `WARNING` | ❌ (default WARNING) |
| `VITE_API_BASE_URL` | `/api/v1` (proxy Vite) | `https://${DOMAIN}/api/v1` | ✅ |
| `VITE_FRONTEND_URL` | `http://localhost:3005` | `https://${DOMAIN}` | ✅ |
| `VITE_USE_BEARER_AUTH` | `false` (cookies) | `true` | ❌ (default true) |

## Cómo la IA usa estas reglas (AGENTS.md)

**AGENTS.md** es la fuente de instrucciones para el agente. OpenCode, Claude Code, Cursor y GitHub Copilot lo leen automáticamente. Funciona así:

1. **Lectura automática** — Al abrir el proyecto, el archivo `AGENTS.md` se inyecta como contexto fundacional. Todo lo que contiene es "verdad" para mí.
2. **Reglas > todo lo demás** — Las reglas en `AGENTS.md` tienen prioridad sobre mi conocimiento general. Si hay contradicción, gana el `AGENTS.md`.
3. **Prohibiciones absolutas** — Las secciones con "NO" o "Prohibiciones" son vinculantes. Ej: "NO usar docker compose up para apps en desarrollo" → no importa lo que sepa de Docker, no lo haré.
4. **Archivo global vs local** — El `AGENTS.md` en la raíz del proyecto es local (solo aplica a este proyecto). El archivo `~/.config/opencode/AGENTS.md` es global (aplica a TODOS los proyectos).
5. **Precedencia**: `~/.config/opencode/AGENTS.md` (global) + `AGENTS.md` (proyecto) se combinan. Si hay conflicto, gana la regla más específica (proyecto).
6. **Cómo usarlo** — Para que la IA incorpore una nueva regla, simplemente escríbela en `AGENTS.md` con formato claro:
   - Usa `**negritas**` para énfasis
   - Usa listas (`-`, `1.`) para instrucciones secuenciales
   - Usa tablas para datos estructurados
   - Usa `##` para secciones (son más fáciles de parsear)
   - Sé específico: evita ambigüedades
7. **No hay que "entrenar"** — No necesitas usar comandos especiales ni re-indexar. El archivo se lee fresco cada conversación.
8. **Memoria MCP** — Además de `AGENTS.md`, el sistema de memoria (`devbrain-core` MCP) puede persistir observaciones entre sesiones. Pero `AGENTS.md` es la fuente de verdad primaria para reglas explícitas.
