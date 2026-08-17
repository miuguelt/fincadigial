# Lecciones Aprendidas (DevBrain Memory Tree)

> **Regla Primordial:** DevBrain debe consultar este archivo antes de realizar refactorizaciones críticas. Cada vez que DevBrain provoque una caída (OOM, Error 500, TypeError), debe registrar aquí la causa raíz y la directiva preventiva para no repetirlo jamás.

## Front-End (React / TS / UI)

- **Sanidad de Componentes:** NUNCA pasar objetos crudos de `DashboardStats` directamente como `children` de un componente de React. Causa error `Objects are not valid as a React child`. Siempre desempaquetar o usar una función extractora (e.g. `stat.value` o `getStatValue(stat)`).
- **Mobile First Obligatorio:** Todos los componentes UI en Villaluz DEBEN ser `w-full` por defecto y fluir en columnas `grid-cols-1` para móvil antes de escalar a `sm:grid-cols-2` o `lg:grid-cols-4`. Prohibido usar márgenes fijos que rompan el responsive.
- **Formularios = Modales:** Los formularios nunca deben ser páginas aisladas. Siempre deben renderizarse sobre el contexto en modo Dialog/Modal para mantener el estado del dashboard intacto.

## Back-End (Flask / Python / DB)

- **Regla SSoT (Zero Mocking):** Nunca simular o hardcodear arrays de datos. La Base de Datos PostgreSQL es la única fuente de la verdad. Si el dato no existe, construir el esquema en DB primero.
- **Toda configuración en system_contents:** Thresholds, timeouts, defaults, milestones, maps — todo debe leerse de `system_contents` vía `SystemContent.get_by_key()`. Prohibido returns hardcodeados como `return 600` o `return 3600`. El fallback máximo permitido es un valor constante tras haber intentado leer de DB.
- **Patrón correcto para valores configurables:**
  ```python
  def _get_my_param():
      from app.models.system_content import SystemContent
      entry = SystemContent.get_by_key('param.mi_clave')
      return int(entry.content) if entry else VALOR_FALLBACK
  ```
- **Respuestas Tipadas:** Todo modelo debe proveer un método `to_dict()`. Las rutas deben retornar `jsonify([item.to_dict() for item in list])`. Nunca construir JSONs a mano en el route.

## Infraestructura & Despliegue

- **Híbrido Windows/WSL:** Los scripts PowerShell y bash deben manejarse con cautela por los saltos de línea (CRLF vs LF).
- **Contabo/Coolify (Memoria):** Los builds del front-end consumen alta memoria. Las tareas pesadas deben hacerse conscientes de que el servidor tiene límites (usar Swap o limitar workers concurrentes).

## [2026-06-14] Refactor Masivo Anti-Hardcodeo: system_contents como única fuente de configuración

### 🔍 1. Síntomas
El backend tenía 50+ valores hardcodeados (THI thresholds, lat/lon, field capacity, admin_roles, period_days, age groups, weight ranges, timedeltas) en servicios y namespaces. Aunque `system_contents` tenía seed data para muchos parámetros (THI, somatic cells), el código nunca los leía y usaba los valores literales.

### 💡 2. Causa Raíz
1. **Falta de enforcement**: No había un integrity-check que detectara hardcodeos en PRs.
2. **Código legacy duplicado**: `legacy.py` tenía age_groups/weight_ranges hardcodeados mientras `stats.py` ya leía de `system_contents` correctamente.
3. **Fallbacks geográficos**: `alert_engine.py` retornaba coordenadas hardcodeadas (4.6097, -74.0817) en vez de `None`.
4. **Roles y periodos**: `admin_roles` y `period_days` definidos como sets/dicts literales en 3 archivos distintos.

### 🛠️ 3. Solución Aplicada
| Archivo | Cambio |
|---------|--------|
| `alert_rules_health.py` | THI thresholds (89, 79, 72) ahora leen de `param.weather.thi_*`; somatic cells promedio usa `param.alert.somatic_cells_high` |
| `alert_engine.py` | lat/lon fallback hardcodeado reemplazado por `return None` |
| `legacy.py` | Field capacity fallback 50→0; age_groups/weight_ranges ahora leen de `config.age_groups` / `config.weight_ranges` |
| `predictive.py` | Field capacity fallback 50→0 |
| `dashboard_service.py` | `admin_roles` ahora lee de `config.admin_roles` en system_contents |
| `invitation_service.py` | `admin_roles` ahora lee de `config.admin_roles` |
| `production_service.py` | `period_days` ahora lee de `config.period_days` |
| `seed_config_extras.py` (nuevo) | Seed para `config.admin_roles` y `config.period_days` |
| `integrity-check.sh` | Nuevos patrones de detección (timedelta, admin_roles, period_days) + verificación de keys no referenciadas |

### 🧠 4. Lección Aprendida
> **TODO parámetro de negocio debe leerse de system_contents en runtime.** Si existe seed data para un parámetro, el código DEBE consumirlo. Los únicos fallbacks permitidos son literales de resiliencia (timeout, puerto) — nunca datos de negocio como pesos, edades, roles, o coordenadas.

---

## [2026-06-09] Prevención de Fallo en Cascada en PowerShell 7.6.2 (Variable Protegida $args)

### 🔍 1. Síntomas del Error
Durante el arranque maestro del ecosistema (devbraind start o START-DEVBRAIN.ps1), el proceso fallaba en cascada en la etapa [6/7] Levantando relays y backends Windows. Los procesos (como NPU Bridge, Ollama, MCP-*) se reportaban como OFFLINE y fallaba el pasaje de argumentos silenciosamente.

### 💡 2. Causa Raíz (Análisis Técnico)
1. **Incompatibilidad de variables automáticas**: En PowerShell 7.6.2 y superior, $args es una variable automática estrictamente protegida en bloques de funciones. La reasignación de esta variable en START-DEVBRAIN.ps1 ($args = @()) y otros 5 scripts colapsaba silenciosamente el pase de parámetros a procesos hijos, corrompiendo la inicialización de los bridges MCP y contenedores anexos.

### 🛠️ 3. Solución Aplicada
Refactorización de variable en toda la infraestructura de orquestación DevBrain:
1. Reemplazo sistemático de $args por $procArgs en START-DEVBRAIN.ps1, Cortex-Genome-Guardian.ps1, GENERATE-MCP-CONFIGS.ps1, Start-DevBrainEcosystem.ps1 y 	est-data.ps1.
2. Actualización de PortForwarder.ps1 inyectando un bloque param() dentro de la invocación asíncrona de [TaskFactory]::StartNew para mantener el aislamiento de runspaces multihilo.

### 🧠 4. Lección Aprendida y Regla de Prevención (Neural Store)
> [!IMPORTANT]
> **REGLA DE SCRIPTING Y AUTOMATIZACIÓN POWERSHELL:**
> **Nunca utilizar la variable $args** para el pase de parámetros manuales en funciones o la definición local de arrays de comandos. Es una variable reservada y su reasignación causa fallos en cascada de red y subprocesos. Utilizar siempre alternativas explícitas como $CommandArgs o $procArgs.
