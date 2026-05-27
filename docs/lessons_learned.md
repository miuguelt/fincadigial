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

## Problema: Puertos huérfanos (EACCES/EADDRINUSE) invisibles en Vite/Node debido a puertos efímeros dinámicos
**Fecha:** 2026-05-25

Vite fallaba al intentar enlazarse al puerto `3005` arrojando `Error: Port 3005 is already in use` o `EACCES: permission denied`, a pesar de que los scripts de limpieza (Guardian) indicaban que el puerto estaba libre y no había ningún listener activo.

## Solución implementada

Se identificó que el rango de puertos dinámicos (TCP ephemeral ports) en la máquina Windows iniciaba en `1025` (`netsh int ipv4 show dynamicport tcp`). Esto provocaba que cualquier conexión saliente (ej. un cliente conectándose a Redis en el puerto 6379 gestionado por WSL/WinNAT) pudiera recibir el puerto local `3005` de forma aleatoria. Al cerrarse la conexión, el socket quedaba temporalmente en `FIN_WAIT_2` / `CLOSE_WAIT` bloqueando el puerto de desarrollo sin que ningún proceso estuviera explícitamente "escuchando" en él.

Se creó el script global `scripts/DEVBRAIN_GLOBAL_NETWORK_FIX.ps1` que:
1. Restaura el rango de puertos dinámicos a los estándares de IANA (49152 - 65535) en IPv4 e IPv6.
2. Reinicia los servicios `winnat` y `LxssManager` (WSL) para limpiar de golpe las tablas TCP y liberar puertos en la pila del kernel.

## Lecciones técnicas críticas
- Si `netstat` no muestra ningún proceso escuchando (LISTENING) pero Node/Vite reporta `EADDRINUSE` o `EACCES`, es altamente probable que el puerto esté atrapado en estado `FIN_WAIT_2`/`CLOSE_WAIT` como origen de una conexión dinámica.
- ¡NUNCA permitir que el rango de puertos dinámicos de Windows incluya los puertos de desarrollo (3000-8000)! Siempre debe estar configurado desde `49152` hasta `65535`.

## Problema: Error 0x8007054f de WSL al arrancar contenedores (Red Mirrored)
**Fecha:** 2026-05-25

El arranque de contenedores multi-IDE con DevBrain fallaba con el mensaje: `wsl: Error interno. Código de error: CreateInstance/CreateVm/ConfigureNetworking/0x8007054f` y `wsl: No se pudo configurar la red (networkingMode Mirrored)`. Esto causaba una desconexión generalizada de la comunicación Docker-WSL y bloqueaba protocolos inter-servicios (`devbrain-universal: unsupported protocol version: ""`).

## Solución implementada

El error `0x8007054f` en el inicio de WSL con `networkingMode=mirrored` se debe casi siempre a un estado corrupto del Servicio de Red de Host de Windows (HNS) provocado por el "Inicio Rápido" (Fast Startup) de Windows. Al apagar Windows con Fast Startup activado, el kernel y el estado de la red se hibernan, y al volver a encender la máquina, los switches virtuales de WSL/Hyper-V fallan al reinicializarse.

Se generó el script automático `scripts/DEVBRAIN_WSL_MIRRORED_FIX.ps1` que:
1. Fuerz el apagado de la VM con `wsl --shutdown`.
2. Reinicia el Servicio de Red de Host con `Stop-Service hns -Force; Start-Service hns` (y `winnat`).
3. **Desactiva globalmente y permanentemente el Inicio Rápido (HiberbootEnabled = 0)** mediante el registro (`HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power`).

## Lecciones técnicas críticas
- El "Inicio Rápido" (Fast Startup) de Windows es tóxico para entornos de desarrollo avanzados que dependen de contenedores, virtualización y redes Mirrored. Siempre debe estar desactivado.
- El servicio responsable de los fallos de red virtual en Windows 11 no es solo `winnat`, sino también el Host Network Service (`hns`). Reiniciar ambos suele resucitar a WSL sin necesidad de reiniciar la PC completa.
`n## Problema: Regresión de configuración en Gemini CLI por SYNC-MULTI-IDE-CONFIGS.ps1

**Fecha:** 2026-05-26

Gemini CLI fallaba repetidamente con el error `Unrecognized key(s) in object: '_comment'`. Aunque se corregía manualmente, el error volvía a aparecer tras reiniciar o ejecutar herramientas de sincronización de DevBrain.

### Causa Raíz
El script de infraestructura `C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\mcp\SYNC-MULTI-IDE-CONFIGS.ps1` tenía hardcodeada la inserción de la clave `_comment` en las definiciones de servidores MCP para todos los IDEs. Al ser Gemini CLI más estricto con el esquema JSON que otros IDEs (como Cursor o Windsurf), esta clave invalidaba la configuración.

### Solución Permanente
1. **Parche de Infraestructura:** Se eliminó la línea `_comment = "Multi-cliente DevBrain - Puerto $Port"` de `SYNC-MULTI-IDE-CONFIGS.ps1`.
2. **Sincronización Global:** Se ejecutó el script parcheado para limpiar preventivamente todos los archivos de configuración de IDEs.
3. **Validación:** Se verificó que el Guardian (`Cortex-Genome-Guardian.ps1`) ya no contenía referencias a esta clave, evitando futuras regresiones por "auto-recuperación".

### Lecciones Técnicas
- **Esquemas Estrictos:** No todas las herramientas MCP ignoran campos desconocidos. Los comentarios en JSON (`_comment`) deben evitarse en configuraciones de Gemini CLI.
- **SSoT (Single Source of Truth):** Cuando un cambio se revierte automáticamente, la causa siempre está en el script de sincronización o en un watchdog de inmutabilidad de la infraestructura.
- **Edición Segura de Scripts:** El uso de Python con base64 para reemplazar strings en scripts de PowerShell evita errores de escape de caracteres especiales.
`n**Fecha:** 2026-05-25`n`nLa CLI de Gemini fallaba al iniciar con el error `Unrecognized key(s) in object: '_comment'` en `settings.json`. Al intentar corregirlo manualmente eliminando la clave, el cambio se revertía automáticamente tras unos segundos o al reiniciar, volviendo a aparecer el error.`n`n## Solución implementada`n`nSe identificó que el sistema de protección **Cortex Genome Guardian** (`scripts/Cortex-Genome-Guardian.ps1` en infraestructura) estaba monitoreando activamente los archivos de configuración de los IDEs (`.gemini/settings.json`, `mcp_config.json`, etc.). El Guardian tenía hardcodeada la inserción de la clave `_comment` como metadato de inmutabilidad y restauraba cualquier cambio manual que la eliminara, considerando el archivo \"corrupto\".`n`nSe realizaron las siguientes acciones:`n1. **Parcheado de Infraestructura:** Se modificó `Cortex-Genome-Guardian.ps1` para eliminar la generación de claves `_comment` en las funciones de reparación (`Repair-SingleIde`).`n2. **Reparación Semántica:** Se ejecutó `pwsh -File Cortex-Genome-Guardian.ps1 -Repair` para regenerar todos los archivos de configuración de IDEs (Gemini, Cursor, Windsurf, Trae, Claude) sin las claves incompatibles.`n3. **Validación de SSoT:** Se verificó que `master-config.json` no contuviera estas claves para evitar su propagación futura.`n`n## Lecciones técnicas críticas`n- Los metadatos de comentarios (`_comment`) dentro de archivos JSON son útiles para humanos pero pueden romper validadores estrictos de esquemas en herramientas modernas como Gemini CLI.`n- Un sistema de \"Auto-Recuperación\" (como el Genome Guardian) es un arma de doble filo: si el Guardian tiene una definición obsoleta o incompatible del \"estado ideal\", impedirá cualquier corrección manual hasta que el propio Guardian sea actualizado.`n- Siempre auditar los scripts de inmutabilidad/watchdogs cuando un cambio en la configuración parece \"revertirse solo\".
