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
