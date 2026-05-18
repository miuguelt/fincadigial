# MCP Health Monitor v2 - Anti-Zombie Edition

## 🎯 Objetivo

Monitor de salud MCP que **nunca genera procesos zombies** y garantiza auto-recuperación robusta de los servicios DevBrain.

---

## 🚀 Inicio Rápido

### Opción 1: Script Batch (Más Simple)
```batch
cd scripts
setup_mcp_monitor.bat
```

### Opción 2: PowerShell (Recomendado)
```powershell
cd scripts
.\setup_mcp_monitor.ps1
```

### Opción 3: Python Directo
```bash
cd scripts
python mcp_health_monitor_v2.py --config "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp\mcp_config_optimized.json"
```

---

## 🛡️ Características Anti-Zombie

| Característica | Descripción | Implementación |
|----------------|-------------|----------------|
| **Limpieza Inicial** | Elimina procesos huérfanos antes de iniciar | `ZombieProcessCleaner.clean_orphans()` |
| **Tracking con psutil** | Usa psutil en lugar de subprocess básico | Monitoreo robusto de PID |
| **Wait() Explícito** | Siempre llama `wait()` en procesos terminados | `process.wait(timeout=5)` |
| **Kill Tree** | Mata proceso + todos los hijos | `kill_process_tree(pid)` |
| **Graceful Shutdown** | Manejo de señales SIGTERM/SIGINT | `_signal_handler()` |
| **Emergency Cleanup** | Limpieza al salir inesperadamente | `atexit.register()` |
| **Cooldown Inteligente** | Evita reinicios infinitos | 5min cooldown tras 3 fallos |

---

## 📁 Archivos Creados

```
scripts/
├── mcp_health_monitor_v2.py      # Monitor principal (mejorado)
├── setup_mcp_monitor.bat         # Script batch simple
├── setup_mcp_monitor.ps1         # Script PowerShell completo
└── README_MONITOR_v2.md           # Esta guía
```

---

## ⚙️ Uso Avanzado

### Con Configuración Específica
```bash
python mcp_health_monitor_v2.py \
  --config "C:\ruta\mcp_config.json" \
  --interval 60 \
  --max-failures 5
```

### Sin Limpieza Inicial (si necesitas preservar procesos)
```bash
python mcp_health_monitor_v2.py --no-clean
```

### Instalar como Servicio Windows (Auto-inicio)
```powershell
# Ejecutar como Administrador
.\setup_mcp_monitor.ps1 -InstallTask

# Para desinstalar
.\setup_mcp_monitor.ps1 -UninstallTask
```

---

## 📊 Logs y Monitoreo

### Archivos Generados
```
logs/
├── mcp_monitor_v2.log           # Log de actividad
└── mcp_status_v2.json           # Estado en formato JSON
```

### Ejemplo de Log
```
[2026-04-27 16:50:12] [INFO] === Limpieza inicial de procesos huérfanos ===
[2026-04-27 16:50:13] [WARN] Limpiando huérfano: mcp-lightning-proxy-v3.exe (PID: 72888)
[2026-04-27 16:50:15] [INFO] Encontrados: 1, Eliminados: 1, Fallidos: 0
[2026-04-27 16:50:15] [INFO] ========================================
[2026-04-27 16:50:15] [INFO] MCP Health Monitor v2 - Anti-Zombie Edition
[2026-04-27 16:50:15] [INFO] MCPs a monitorear: ['devbrain-universal']
[2026-04-27 16:50:15] [INFO] Iniciando: C:/.../mcp-lightning-proxy-v3.exe...
[2026-04-27 16:50:18] [INFO] [devbrain-universal] Iniciado correctamente (PID: 89120)
[2026-04-27 16:50:18] [INFO] [devbrain-universal] ✓ Saludable
```

---

## 🔧 Cómo Funciona

### Flujo Anti-Zombie

```
┌─────────────────────────────────────┐
│         INICIO                      │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 1. LIMPIEZA INICIAL                 │
│    - Busca procesos MCP huérfanos   │
│    - Mata árbol completo (PID+hijos)│
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 2. INICIAR MCP                      │
│    - Verifica no existe duplicado   │
│    - Inicia con psutil tracking     │
│    - Valida no es zombie inmediato  │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 3. LOOP MONITOREO                   │
│    - Cada 30s verifica salud        │
│    - Si falla → reinicia            │
│    - Max 3 fallos → cooldown 5min   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 4. SHUTDOWN (Ctrl+C)                │
│    - Detiene MCP gracefulmente      │
│    - Espera proceso termine         │
│    - Limpieza final de zombies      │
└─────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### "psutil no está instalado"
```bash
pip install psutil
```

### "No se encontró configuración MCP"
Especifica ruta manual:
```bash
python mcp_health_monitor_v2.py --config "C:\ruta\exacta\mcp_config.json"
```

### "Permiso denegado al matar proceso"
Ejecutar como Administrador:
- Click derecho → "Ejecutar como administrador"
- O en PowerShell: `Start-Process powershell -Verb runAs`

### "Proceso sigue como zombie"
El monitor automáticamente:
1. Detecta zombies en health check
2. Intenta `terminate()` → `wait(5s)`
3. Si persiste → `kill()` forzado
4. Limpieza final al shutdown

---

## 📊 Comparativa v1 vs v2

| Aspecto | v1 | v2 (Anti-Zombie) |
|---------|----|------------------|
| Detección de zombies | ❌ Básica | ✅ psutil completo |
| Limpieza inicial | ❌ No | ✅ Sí |
| Kill de procesos | Solo padre | Árbol completo |
| Wait() explícito | A veces | Siempre |
| Cooldown | No | 5min tras 3 fallos |
| Logs JSON | Sí | ✅ + estructurado |
| Config IDE-specific | No | ✅ Sí |

---

## 🎓 Arquitectura Anti-Zombie

### ¿Por qué los procesos se convierten en zombies?

```
Proceso Padre (IDE) ──fork──→ Proceso Hijo (MCP)
       │                           │
       │                           │
       │ (cierra sin wait)         │
       │                           │
       ▼                           ▼
    TERMINA                    ZOMBIE!
                               (ppid=1)
```

### Solución Implementada

```
Monitor ──fork──→ Proceso MCP
   │                  │
   │                  │
   │←─────────────────│ wait()
   │    (registra)     │
   │                  │
   ▼                  ▼
SIGTERM → terminate() → wait(5s) → kill() si persiste
   │
   ▼
kill_process_tree()  # Padre + hijos
```

---

## ✅ Verificación de Funcionamiento

### 1. Verificar que no hay zombies
```powershell
# Después de iniciar el monitor
Get-Process | Where-Object {$_.Parent.Id -eq 1 -and $_.Name -like "*mcp*"}
# Debe retornar vacío
```

### 2. Verificar monitor está corriendo
```powershell
Get-Process | Where-Object {$_.Name -eq "python" -and $_.CommandLine -like "*mcp_health_monitor*"}
```

### 3. Verificar logs
```powershell
type logs\mcp_monitor_v2.log -Tail 20
```

### 4. Verificar estado JSON
```powershell
Get-Content logs\mcp_status_v2.json | ConvertFrom-Json
```

---

## 🔗 Integración con VillaLuz

El sistema de **Alta Disponibilidad MCP** en VillaLuzFront ya está listo:

```typescript
// El widget detectará automáticamente cuando MCP esté disponible
import { MCPStatusWidget } from '@/widgets/dashboard/MCPStatusWidget';

// Uso
<MCPStatusWidget />
```

Cuando el monitor v2 está corriendo:
1. ✅ MCP se mantiene vivo
2. ✅ Si cae, se reinicia en < 30 segundos
3. ✅ El widget muestra estado actual
4. ✅ Si MCP no disponible → usa fallback automático

---

## 📞 Soporte

Si el monitor no funciona:

1. **Verificar Python**: `python --version`
2. **Verificar psutil**: `python -c "import psutil; print('OK')"`
3. **Verificar logs**: `logs\mcp_monitor_v2.log`
4. **Ejecutar con verbose**: Modificar script para log nivel DEBUG

---

**Estado**: ✅ Listo para producción  
**Versión**: 2.0.0  
**Última actualización**: 2026-04-27
