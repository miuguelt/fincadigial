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
- `widgets/admin-crud/ui/AdminCRUDPage.tsx` (886L) — no crecer; extraer a subcomponentes
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
- `utils/namespace_helpers/legacy.py` (1699L) — dividir al modificar

Ya no existen: `namespaces/finanzas/analytics_namespace.py`, `utils/analytics.py` y
`utils/namespace_helpers.py` (este último era un módulo muerto que el paquete del mismo
nombre eclipsaba; se eliminó el 2026-07-28).

## Al modificar código existente

1. Lee `ARCHITECTURE.md` y `CODING_RULES.md`
2. Trabaja en rama separada
3. Commits atómicos (un cambio lógico por commit)
4. Si encuentras bug: créa issue, no lo arregles en el mismo commit del refactor
5. Verifica que app sigue arrancando después de cada cambio significativo
6. Punto de retorno siempre disponible: `git reset --hard <hash>`

## Bugs conocidos activos

Ninguno pendiente. Los dos que figuraban aquí ya no aplican (verificado 2026-07-28):
`GET /api/v1/analytics/dashboard` devuelve los conteos reales y
`/analytics/dashboard/simple` ya no está registrado como ruta.

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

## Documentación del proyecto

- `ARCHITECTURE.md` — estructura, capas, endpoints
- `CODING_RULES.md` — reglas detalladas con ejemplos
