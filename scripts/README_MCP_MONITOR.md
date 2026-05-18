# MCP Health Monitor - Guía de Uso

## 🚨 Por Qué Se Caen los MCPs

Los servicios MCP (Model Context Protocol) de DevBrain se caen por estas razones principales:

### 1. Transporte STDIO Frágil
```
Error: transport error: transport closed
```
- Los MCPs usan pipes STDIO para comunicarse con el IDE
- Cuando el IDE se cierra o reinicia, los pipes se rompen
- Los procesos MCP quedan huérfanos sin conexión

### 2. Procesos No Persistentes
- Los MCPs se inician como hijos del proceso IDE
- No son servicios independientes/demonios
- Al cerrar el IDE → los MCPs mueren

### 3. Timeouts de Inactividad
- Algunos MCPs cierran conexión tras período sin actividad
- El IDE no siempre reconecta automáticamente

### 4. Sin Health Checks
- No hay mecanismo para verificar si MCP está vivo
- El IDE intenta usar MCPs muertos (zombies)
- Resultado: "transport closed"

---

## 🛠️ Solución: MCP Health Monitor

Este sistema implementa:
1. **Monitoreo continuo** de procesos MCP
2. **Auto-reinicio** cuando detecta fallos
3. **Graceful degradation** en la aplicación
4. **Persistencia** de estado para análisis

---

## 📁 Archivos Creados

```
docs/
  └── MCP_HA_STRATEGY.md          # Documentación completa de arquitectura

scripts/
  ├── mcp_health_monitor.py         # Monitor principal (Python)
  └── README_MCP_MONITOR.md         # Esta guía

VillaLuzFront/src/shared/api/
  └── mcpResilientClient.ts       # Cliente resiliente TypeScript
```

---

## 🚀 Uso Rápido

### 1. Verificar Estado Actual
```bash
# Ver si hay procesos MCP corriendo
# Windows:
Get-Process | Where-Object {$_.ProcessName -like "*devbrain*"}
Get-Process | Where-Object {$_.ProcessName -like "*mcp*"}

# Ver logs recientes
Get-Content logs/mcp_monitor.log -Tail 50
```

### 2. Iniciar Monitor
```bash
# Desde la carpeta del proyecto
cd scripts

# Modo básico (foreground)
python mcp_health_monitor.py

# Con configuración personalizada
python mcp_health_monitor.py --config ~/.windsurf/mcp_config.json --interval 60

# Ver reporte de estado
cat ../logs/mcp_status.json
```

### 3. Configurar Auto-Inicio (Windows)

#### Opción A: Task Scheduler
1. Abrir Task Scheduler (`taskschd.msc`)
2. Crear nueva tarea:
   - **Nombre**: `MCP DevBrain Monitor`
   - **Trigger**: At startup
   - **Action**: Start a program
   - **Program**: `pythonw.exe`
   - **Arguments**: `C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\mcp_health_monitor.py`
   - **Start in**: `C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz`

#### Opción B: Startup Folder
```powershell
# Crear acceso directo en startup
$startupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
$target = "pythonw.exe"
$arguments = "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\mcp_health_monitor.py"

$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut("$startupPath\MCP Monitor.lnk")
$shortcut.TargetPath = $target
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz"
$shortcut.Save()
```

---

## 🔧 Integración en VillaLuzFront

### Uso del Cliente Resiliente

```typescript
import { mcpResilientClient } from '@/shared/api/mcpResilientClient';

// Ejemplo: Obtener estado del dashboard
async function getDashboardData() {
  return await mcpResilientClient.executeWithFallback({
    mcpName: 'devbrain-universal',
    toolName: 'dashboard_status',
    params: {},
    // Fallback: usar API REST directamente
    fallbackFn: async () => {
      const response = await fetch('/api/v1/health');
      return await response.json();
    }
  });
}

// Ejemplo con timeout personalizado
const result = await mcpResilientClient.executeWithFallback({
  mcpName: 'devbrain-universal',
  toolName: 'proxy_health',
  params: {},
  timeout: 10000, // 10 segundos
  fallbackFn: async () => {
    // Implementación alternativa
    return { status: 'fallback', data: [] };
  }
});

// El resultado indica qué fuente se usó
console.log(result.source); // 'mcp' o 'fallback'
console.log(result.duration); // tiempo en ms
```

### Verificar Estado de MCPs

```typescript
// Obtener estado de todos los MCPs
const allStatus = mcpResilientClient.getAllStatus();
console.log(allStatus);
// {
//   'devbrain-universal': {
//     available: false,
//     fallbackActive: true,
//     consecutiveFailures: 3,
//     lastError: 'MCP transport closed',
//     cooldownUntil: Date
//   }
// }

// Verificar disponibilidad específica
if (mcpResilientClient.isAvailable('devbrain-universal')) {
  // Usar MCP
} else {
  // Usar fallback
}

// Intentar recuperación manual
await mcpResilientClient.attemptRecovery('devbrain-universal');
```

---

## 📊 Monitoreo y Logs

### Archivos de Log
```
logs/
  ├── mcp_monitor.log       # Log de actividad del monitor
  └── mcp_status.json       # Estado actual en formato JSON
```

### Formato de Log
```
[2024-01-15 10:30:45] [INFO] [devbrain-universal] ✓ Saludable
[2024-01-15 10:31:15] [WARN] [devbrain-universal] ✗ No saludable, reiniciando...
[2024-01-15 10:31:18] [INFO] [devbrain-universal] ✓ Reinicio exitoso
```

### Reporte de Estado (JSON)
```json
{
  "timestamp": "2024-01-15T10:31:45",
  "config_path": "C:/Users/Miguel/.windsurf/mcp_config.json",
  "interval": 30,
  "mcps": {
    "devbrain-universal": {
      "healthy": true,
      "running": true,
      "pid": 12345,
      "started_at": "2024-01-15T10:31:18",
      "last_check": "2024-01-15T10:31:45",
      "last_error": null
    }
  }
}
```

---

## ⚙️ Configuración

### Ubicaciones Buscadas (automático)
El monitor busca configuración MCP en:
1. `~/.windsurf/mcp_config.json`
2. `~/.cursor/mcp_config.json`
3. `~/.vscode/mcp_config.json`
4. `./.windsurf/mcp_config.json` (proyecto actual)
5. `C:\ProgramData\windsurf\mcp_config.json`

### Formato Esperado (mcp_config.json)
```json
{
  "mcpServers": {
    "devbrain-universal": {
      "command": "node",
      "args": [
        "/ruta/al/devbrain-universal/index.js"
      ],
      "env": {
        "PORT": "8010",
        "LOG_LEVEL": "info"
      }
    },
    "devbrain-skill-test-skill-v2": {
      "command": "node",
      "args": [
        "/ruta/al/devbrain-skill/index.js"
      ]
    }
  }
}
```

---

## 🔄 Flujo de Recuperación

```
┌─────────────┐
│ Health Check │
└──────┬──────┘
       │
       ▼
   ┌───────┐
   │ ¿OK?  │
   └───┬───┘
       │
   SÍ /   \ NO
      /     \
     ▼       ▼
┌───────┐  ┌──────────┐
│Log OK │  │+1 Failure │
└───────┘  └────┬─────┘
                │
                ▼
           ┌────────┐
           │≥ Max?  │
           └───┬────┘
               │
          NO / \ SÍ
            /   \
           ▼     ▼
      ┌────────┐ ┌──────────┐
      │Reintent│ │Cooldown  │
      │después │ │1 minuto  │
      └────────┘ └──────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │Usar Fallback│
                   └─────────────┘
```

---

## 🎯 Estrategia de Fallback

Cuando un MCP está caído, la aplicación debe usar alternativas:

| Funcionalidad MCP | Fallback Implementado |
|-------------------|----------------------|
| `dashboard_status` | API REST `/api/v1/health` |
| `proxy_health` | Herramientas nativas Cascade |
| `dashboard_registry` | Lectura directa de archivos |

### Ejemplo de Patrón de Fallback

```typescript
// En lugar de llamar MCP directamente:
// ❌ const result = await mcpClient.call('dashboard_status');

// Usar el cliente resiliente:
// ✅ const result = await mcpResilientClient.executeWithFallback({
//      mcpName: 'devbrain-universal',
//      toolName: 'dashboard_status',
//      params: {},
//      fallbackFn: async () => {
//        // Tu lógica alternativa aquí
//        return await fetch('/api/health').then(r => r.json());
//      }
//    });
```

---

## 🐛 Troubleshooting

### Problema: "Configuración MCP no encontrada"
**Solución**: Especificar ruta manualmente
```bash
python mcp_health_monitor.py --config "C:\Ruta\Exacta\mcp_config.json"
```

### Problema: "Comando no encontrado"
**Causa**: El ejecutable de Node/Python no está en PATH
**Solución**: Usar ruta absoluta en mcp_config.json
```json
{
  "command": "C:\\Program Files\\nodejs\\node.exe",
  "args": ["..."]
}
```

### Problema: "Reinicio fallido"
**Causa**: El MCP tiene errores de código o dependencias faltantes
**Solución**: Verificar logs del MCP específico en `logs/mcp_monitor.log`

### Problema: "MCP se reinicia constantemente"
**Causa**: Configuración inválida o error persistente
**Solución**: 
1. Verificar que el MCP funciona manualmente:
   ```bash
   node /ruta/al/mcp/index.js --version
   ```
2. Revisar que no haya puertos en conflicto
3. Verificar variables de entorno

---

## 📚 Referencias

- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [VillaLuz Docs - Estrategia HA](MCP_HA_STRATEGY.md)

---

## ✅ Checklist de Implementación

- [ ] Verificar que `mcp_health_monitor.py` funciona: `python scripts/mcp_health_monitor.py --help`
- [ ] Encontrar ubicación real de MCPs DevBrain en tu sistema
- [ ] Crear/verificar archivo `mcp_config.json` 
- [ ] Configurar auto-inicio con Task Scheduler
- [ ] Integrar `mcpResilientClient` en componentes que usan MCPs
- [ ] Implementar fallbacks específicos para cada herramienta MCP
- [ ] Monitorear logs por 24-48 horas para verificar estabilidad
- [ ] Documentar cualquier ajuste necesario para tu entorno

---

## 🆘 Soporte

Si el monitor no funciona:
1. Verificar logs: `logs/mcp_monitor.log`
2. Verificar Python: `python --version` (requiere 3.8+)
3. Verificar permisos: el monitor necesita poder iniciar procesos
4. Reportar issues con logs adjuntos

---

**Estado**: Listo para producción
**Versión**: 1.0.0
**Última actualización**: 2026-04-27
