# Lecciones Aprendidas - DevBrain

## Problema: conflictos de puerto con WSL y Docker
**Fecha:** 2026-05-09

El puerto 3003 quedo reservado para el frontend Docker de Villaluz. En Windows podia aparecer ocupado por `wslrelay.exe`, que no siempre es un zombie: muchas veces es el relay valido que publica un puerto de Docker/WSL hacia Windows.

## Solucion implementada

1. **Puerto dev seguro:** el frontend local de Vite usa el puerto **3005**.
   - `frontend/package.json`: `vite --port 3005`
   - `npm run dev` ejecuta primero el Guardian en modo `Dev`.

2. **Guardian con contexto real:** `scripts/DEVBRAIN_GUARDIAN.ps1` ahora cruza tres fuentes antes de decidir:
   - listeners de Windows con `Get-NetTCPConnection`;
   - puertos publicados por Docker desde WSL con `docker ps`;
   - listeners internos de WSL con `ss -ltnp`.

3. **Reparacion conservadora:** el Guardian solo termina `wslrelay.exe` si:
   - el puerto de desarrollo esta bloqueado;
   - el proceso es `wslrelay.exe`;
   - no existe un contenedor Docker ni listener WSL respaldando ese puerto.

4. **Auditoria reutilizable:** en la raiz del proyecto:
   - `npm run health` muestra el estado de puertos criticos;
   - `npm run guardian:repair` audita y permite limpiar relays huerfanos de forma segura.

## Lecciones tecnicas criticas

- `wslrelay.exe` no debe tratarse automaticamente como basura. Primero hay que confirmar si representa un puerto publicado por Docker/WSL.
- El puerto 3003 pertenece al frontend Docker; el puerto 3005 queda para desarrollo local en Windows.
- `$PID` es una variable reservada de PowerShell. Usar nombres como `$processId`, `$servicePid` o `$ownerPid`.
- `powershell` se mantiene en `predev` por compatibilidad con Windows base; `pwsh` se usa en scripts raiz cuando esta disponible.

## Prevencion

La estrategia correcta es convivir con WSL y Docker: reservar puertos estables, auditar antes de reparar y limpiar solo procesos huerfanos comprobados.

## Problema: Lentitud inicial y superposición visual en CRUD de Animales (/admin/animals)
**Fecha:** 2026-05-18

El panel de administración de animales presentaba una carga inicial muy lenta, bloqueos en la UI y superposición del menú de finca sobre el Header y la barra de búsqueda.

## Solución implementada

1. **Desacoplamiento de Carga Masiva (Non-blocking FKs):** En `useForeignKeySelect.ts`, la carga inicial de opciones (ej. 1000 razas, padres y madres) se envolvió en un `setTimeout` de 150ms. Esto libera el Main Thread durante el montaje inicial de la página principal (`AdminCRUDPage`), permitiendo que el Skeleton Loading y la tabla se rendericen de forma instantánea.
2. **Sincronización Asíncrona:** En `offlineQueue.ts`, se aumentaron los retardos de inicio automático de sincronización al detectar conexión online (de 100ms a 500ms y 1000ms), asegurando que la cola en segundo plano no compita con el renderizado de la UI.
3. **Jerarquía Z-Index Garantizada:** Se elevó el z-index del `<header>` principal en `Header.tsx` a `z-[1000]`, asegurando que la barra de búsqueda y el perfil del usuario permanezcan siempre accesibles por encima de tarjetas flotantes de finca o selectores.
4. **Prevención de Tooltip Invasivo:** En `GlobalSearchBar`, se condicionó la apertura de la caja flotante a `query.trim().length >= 2 || loading`, evitando que al hacer focus en el input vacío aparezca un modal innecesario indicando "Escribe al menos 2 caracteres...". Adicionalmente, se estableció el placeholder estándar `placeholder="Buscar animales..."`.

## Lecciones técnicas críticas

- Las consultas iniciales masivas de llaves foráneas (FKs) en modales de creación/edición no deben competir en el Main Thread con la carga de la vista principal. Ponerles un pequeño retardo asíncrono (`setTimeout`) mejora drásticamente el First Contentful Paint (FCP) y la percepción de velocidad.
- Para garantizar la accesibilidad continua de los controles globales (búsqueda y perfil), el Header principal debe poseer un z-index superior (`z-[1000]`) al de los contenedores de los layouts y tarjetas flotantes.
