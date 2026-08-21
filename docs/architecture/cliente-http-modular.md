# Cliente HTTP modular (`shared/api/client`)

Fecha: 2026-08-17

## Problema

`shared/api/client.ts` concentraba 1231 líneas: instancias axios, gate de
autenticación, refresh con mutex, cierre de sesión forzado, backoff de rate
limit, caché dual (memoria + IndexedDB), coalescing de GET, reintentos de red y
encolado offline. El archivo ya excedía el presupuesto de 400 líneas, así que
cada cambio de consistencia de datos volvía a hacerlo crecer y el gate 6.1
bloqueaba el commit.

## Decisión

Se extrajeron las capacidades a `shared/api/client/`, una por archivo, y
`client.ts` quedó como punto de composición: instala interceptores, reemplaza
`api.get` por la versión con caché y expone la superficie pública
(`api` por defecto, `apiClient`, `refreshClient`, `invalidateHttpCache`,
`forceLogoutFromApiError`, `unwrapApi`). Las rutas de importación de los 55
módulos consumidores no cambian.

| Archivo | Responsabilidad |
| --- | --- |
| `client/settings.ts` | Constantes de entorno y `logDebugError`. |
| `client/toastDedup.ts` | Aviso único por ventana de deduplicación. |
| `client/session.ts` | Lectura, persistencia y limpieza de la sesión local. |
| `client/headers.ts` | Encabezados JSON, CSRF y `Authorization`. |
| `client/instances.ts` | Instancias axios `api` y `refreshClient`. |
| `client/authGate.ts` | Normalización de rutas, endpoints públicos y espera a `/auth/me`. |
| `client/tokenRefresh.ts` | Mutex de `/auth/refresh` y detección de errores CSRF. |
| `client/forcedLogout.ts` | Política de cierre de sesión y redirección a login. |
| `client/rateLimit.ts` | Backoff por endpoint ante 429. |
| `client/httpCache.ts` | Caché dual, generación e invalidación tras escrituras. |
| `client/cacheKey.ts` | Clave canónica de GET con alcance de usuario/finca. |
| `client/cachedGet.ts` | GET con caché, coalescing, throttle y fallo rápido sin red. |
| `client/requestInterceptor.ts` | Interceptores de solicitud de ambas instancias. |
| `client/responseInterceptor.ts` | Interceptor de respuesta y orden de las políticas de error. |
| `client/unauthorizedFlow.ts` | Política de 401: refrescar, reintentar o cerrar sesión. |
| `client/transportFailure.ts` | Reintentos de red, encolado offline y `ApiFetchError`. |

Dirección de dependencias: `client.ts` → capacidades → `instances`/`settings`.
Ningún módulo de capacidad importa `client.ts`, de modo que no hay ciclos
nuevos. El ciclo preexistente `client → offlineQueue → apiFetch → client` se
conserva tal cual: se resuelve en tiempo de ejecución porque el uso es diferido.

La cola offline recibió el mismo tratamiento en `shared/api/offline/queue/`
(`types`, `queueDb`, `queueConflicts`, `queueIdentity`, `queueSync`,
`queuePull`), y `offlineQueue.ts` conserva la clase, el singleton y los
reexportes que ya consumían las pruebas y los servicios de malla.

## Alternativas descartadas

1. **Adoptar el conjunto paralelo `base-client.ts` + `interceptors.ts` +
   `gate.ts` + `refresh.ts` + `auth-utils.ts` + `cache-manager.ts`.** Es una
   partición previa que nunca se cableó: `setupInterceptors` no lo importa
   nadie. Además diverge en reglas de autenticación —su `isPublicEndpoint`
   trata `auth/me` y `auth/logout` como protegidos, y `config.ts` usa
   `useBearerAuth: true` y `requestMinIntervalMs: 500` por defecto—, así que
   adoptarlo habría cambiado el modo de autenticación de toda la aplicación en
   un commit cuyo objetivo era desbloquear el gate.
2. **Subir el baseline de modularidad.** Convertiría la deuda en permiso
   permanente, que es justo lo que la regla 6.1 impide.

## Convergencia del cliente paralelo (2026-08-17)

La deuda que dejó la partición quedó saldada en el mismo día: los siete
consumidores de la instancia sin interceptores —`kb.service.ts`,
`GanaderiaOperativaPage.tsx`, `QuickMilk.tsx`, `QuickWater.tsx`,
`FieldReadyService.ts`, `useLivestockSubmit.ts` y
`CalendarioSanitarioWidget.tsx`— pasaron a `@/shared/api/client`, y con ellos
desaparecieron `base-client.ts`, `interceptors.ts`, `gate.ts`, `refresh.ts`,
`auth-error-handler.ts`, `auth-utils.ts` y `cache-manager.ts`.

Sus peticiones ahora atraviesan el gate de autenticación, CSRF, la caché HTTP,
la invalidación tras escritura y la cola offline. Ese último punto cambia el
contrato con la interfaz: sin red, el interceptor encola la escritura y responde
`202` con `__offlineQueued`. Como encolar no es persistir, `shared/api/
offlineResult.ts` expone `wasQueuedOffline()` y las cuatro pantallas de registro
en campo avisan «guardado sin señal» en vez de «registrado», y sólo emiten el
refresco de datos cuando el servidor confirmó.

`shared/api/config.ts` sobrevive porque lo usan la cola offline y los
transportes de malla; ya no compite con la configuración del cliente.

## Deuda registrada

- `hasClientSession` del cliente vivo exige marca de sesión activa **y** una
  evidencia legible (token guardado o cookie no HttpOnly, típicamente la de
  CSRF). El módulo retirado `auth-utils.ts` se conformaba con la marca activa
  porque, con cookies HttpOnly, exigir storage marcaba como anónima una sesión
  válida. Se conservó el comportamiento vivo —cambiarlo altera la política de
  reintento del 401— y la prueba se migró a `client/session.test.ts`, donde
  queda documentada la semántica real. Si alguna vez se sirven las cookies CSRF
  como HttpOnly, este punto se vuelve un fallo de sesión y hay que revisarlo.
- Los servicios que escriben vía `BaseService` (por ejemplo el traslado de
  potrero en `useLivestockSubmit`) todavía no distinguen el `202` encolado; al
  tocarlos conviene aplicarles `wasQueuedOffline()`.

## Verificación

- `npx tsc -p tsconfig.app.json --noEmit`: sin errores.
- `npx vitest run`: 69 archivos, 319 pruebas en verde, incluidas las de
  regresión `QuickMilk.test.tsx`, `offlineResult.test.ts` y
  `client/session.test.ts`.
- `Test-DevBrainModularity.ps1 -ChangedOnly`: 0 errores en los archivos de este
  cambio.
- `validate-rules.ps1 -Project villaluz`: sin violaciones.
