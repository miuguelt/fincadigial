# Estrategia DevBrain: Prevención de Procesos Zombies y Gestión de Puertos

Este documento detalla el estándar técnico de arquitectura y desarrollo aplicado en el proyecto para evitar bloqueos de red y conflictos de CORS causados por procesos residuales de Node/Vite en entornos de desarrollo local en Windows.

---

## 1. El Problema del Puerto Flotante y CORS

En arquitecturas desacopladas (Frontend en Vite y Backend en Go/Python), el backend define una política estricta de `CORS_ORIGINS` (por ejemplo, `https://localhost:3005`). 

### Comportamiento Defectuoso (Por Defecto)
* **Vite con `strictPort: false`**: Si el puerto configurado (3005) está ocupado por una instancia previa que no se cerró correctamente (zombie), Vite autoincrementa el puerto a `3006`, `3007`, etc., e inicia el servidor dev con éxito aparente.
* **Consecuencia**: El frontend intenta comunicarse con el backend desde `localhost:3006`. El backend rechaza las peticiones por violación de políticas CORS, lo que produce pantallas en blanco y errores de autenticación silenciosos e indeterminados.

### Solución
* **Vite con `strictPort: true`**: Obliga a Vite a fallar inmediatamente en lugar de flotar de puerto. Esto da visibilidad instantánea del conflicto de puertos.

---

## 2. Estrategia DevBrain Guardian (`predev`)

Para evitar que el desarrollador tenga que intervenir manualmente, se integra un ciclo de auto-recuperación en el hook `predev` de npm.

```
[npm run dev] 
      │
      ▼
[predev hook] ──► Ejecuta DEVBRAIN_GUARDIAN.ps1
                        │
                        ├─► 1. Detecta si el puerto 3005 está en uso
                        ├─► 2. Identifica PIDs bloqueantes en Windows (CIM/WMI y TCP)
                        ├─► 3. Ejecuta matanza agresiva (Stop-Process / taskkill)
                        └─► 4. Ejecuta barrido de node.exe zombies de 'villaluz'
      │
      ▼
[dev server] ──► Inicia Vite en puerto garantizado 3005
```

---

## 3. Mecanismos de Detección e Inferencia en Windows

El guardián ([DEVBRAIN_GUARDIAN.ps1](file:///C:/Users/Miguel/Documents/Aplicaciones/_infrastructure/devbraind/scripts/DEVBRAIN_GUARDIAN.ps1)) aplica los siguientes mecanismos en PowerShell:

### Detección Robusta de Puertos
Usa la API nativa de Windows `Get-NetTCPConnection` para buscar oyentes en el puerto dev:
```powershell
Get-NetTCPConnection -State Listen
```
Esto evita los fallos de parseo sintáctico mediante expresiones regulares sobre strings de IPv6 (`[::]:3005`) que ocurren con `netstat -ano`.

### Terminación Segura pero Agresiva
Si el puerto está ocupado por procesos no-críticos de sistema (se protegen PIDs de sistema y procesos como `svchost.exe`, `System`, etc.), se procede a:
1. `Stop-Process -Id $PID -Force`
2. Si falla por nivel de elevación, se cae al fallback: `taskkill.exe /F /PID $PID`.

### Limpieza de Zombies Específica del Proyecto
Para evitar que procesos de Vite acumulados saturen la memoria y la CPU del sistema, se filtran las instancias del proyecto:
```powershell
Get-CimInstance -ClassName Win32_Process -Filter "Name = 'node.exe'"
```
Se inspecciona la línea de comandos (`CommandLine`) del proceso. Si contiene `vite` y hace referencia a la ruta del proyecto `villaluz`, se elimina el proceso de forma proactiva.

---

## 4. Comandos de Soporte y Operación Manual

Si se requiere realizar un mantenimiento de red sin levantar el servidor de desarrollo, se puede ejecutar el comando:

```bash
npm run dev:clean
```

Esto ejecutará el guardián en modo de reparación directa, imprimiendo en pantalla los procesos eliminados y liberando los puertos.
