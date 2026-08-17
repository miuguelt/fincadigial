# Estrategia de secretos y archivos de exclusión

## Objetivo

VillaLuz trabaja con una política de credenciales “zero literal”: Git contiene contratos y
placeholders, nunca contraseñas, tokens, DSN con contraseña ni llaves privadas. La política global
de DevBrain es la autoridad; este documento fija cómo se aplica en este monorepo.

## Flujo de credenciales

| Contexto | Fuente permitida | Regla operativa |
| --- | --- | --- |
| Desarrollo local | Windows Credential Manager o `.env` local protegido | Inyectar al proceso; nunca rastrear el archivo |
| Backend/seeds | `VILLALUZ_SEED_*`, `ADMIN_PASSWORD` y variables equivalentes | Fallar si faltan; sin defaults |
| E2E | `VILLALUZ_E2E_*` o alias `E2E_*` | Password requerida; CI la genera de forma efímera |
| Stress tests | `VILLALUZ_STRESS_TEST_ID` y `VILLALUZ_STRESS_TEST_PASSWORD` | No guardar login en el script ni en reportes |
| CI | Secret store de GitHub y secretos generados por ejecución | Nunca escribir valores en YAML |
| Producción | Coolify/Windows Credential Manager | Inyección por entorno; rotación coordinada |

Los valores `VITE_*` llegan al navegador. Por eso solo pueden contener configuración pública o una
contraseña efímera de usuarios desechables de desarrollo local.

## Reglas no negociables

- No hay contraseñas por defecto en código, scripts, E2E, Docker Compose ni workflows.
- Un DSN completo con contraseña es un secreto, aunque apunte a `localhost`.
- No se imprimen ni serializan contraseñas, tokens, cookies, JWT o respuestas que puedan contenerlos.
- Los ejemplos usan `<PLACEHOLDER>`, `${VARIABLE}`, `changeme` o `example`; no tokens truncados.
- Un secreto detectado en el historial se rota antes de retirar el archivo; limpiar `.gitignore` no
  limpia el historial.

## Arquitectura de ignores

Los archivos se generan desde el catálogo global
`_infrastructure/devbraind/templates/repo-hygiene/ignore-templates.json` y se complementan solo
con reglas del módulo:

| Archivo | Responsabilidad |
| --- | --- |
| `/.gitignore` | Secretos, dependencias y artefactos compartidos del monorepo |
| `/backend/.gitignore` | Cachés, entornos y salidas propias de Python/backend |
| `/frontend/.gitignore` | Dependencias, build y caches propias de Node/Vite |
| `/.dockerignore` | Exclusiones si alguien usa la raíz como contexto Docker |
| `/backend/.dockerignore` | Contexto real de `backend/Dockerfile` |
| `/frontend/.dockerignore` | Contexto real de `frontend/Dockerfile` |

Los `.dockerignore` locales son los importantes porque Compose construye con `./backend` y
`./frontend`. La raíz no usa `*.json` ni `*.md` como exclusiones globales: se ignoran rutas de
salida concretas para no ocultar configuración válida. Las plantillas seguras (`.env.example`,
`.env.*.example`, `.env.*.template`) son visibles para Git, pero se excluyen de los contextos de
imagen porque no son necesarias en runtime.

## Gates

```powershell
# Antes de commit: solo contenido stageado
pwsh -File C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\pre-commit-secrets.ps1 -Staged

# Antes de push: repositorio y estado real
pwsh -File C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Test-DevBrainRepoHygiene.ps1 -Path . -SingleRepository -FailOnViolations
```

Los hooks ya instalados en `.git/hooks` ejecutan estos controles. `--no-verify` no es una solución:
si hay un falso positivo, se corrige el clasificador y su prueba en DevBrain.

## Hallazgo pendiente de rotación

La auditoría encontró una credencial literal histórica asociada al stress test en los commits
`7be9ae97` y `70750f4f`. Fue retirada del archivo activo, pero sigue expuesta en el historial
alcanzable. Antes de desplegar o reutilizar esa cuenta, el operador debe rotarla y revocar sesiones
o tokens derivados. La reescritura del historial requiere respaldo y coordinación explícita.
