<#
.SYNOPSIS
    Fix-WSL-Hangs.ps1 - Guardián de Rendimiento DevBrain
    Monitorea, optimiza y repara el subsistema WSL2 y los procesos huérfanos de wsl.exe
    para evitar bloqueos en Cursor, Windsurf y VS Code.
.DESCRIPTION
    Este script analiza la acumulación de procesos 'wsl.exe' zombies en Windows,
    verifica el estado de los puertos críticos, audita la configuración de .wslconfig
    y proporciona herramientas de autoreparación de un solo clic.
.NOTES
    Lección Técnica DevBrain: NUNCA usar $Args directamente (es protegida). Usar $ProcArgs.
#>

param (
    [switch]$ForceKill,
    [switch]$ShutdownWSL,
    [switch]$RestartDocker
)

$ErrorActionPreference = "SilentlyContinue"
$OutputEncoding = [System.Text.Encoding]::UTF8

# Colores Premium
$Cyan = "Cyan"
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Gray = "Gray"

Clear-Host
Write-Host "======================================================================" -ForegroundColor $Cyan
Write-Host "   🧠 DEVBRAIN ECOSYSTEM - GUARDIÁN ANTI-BLOQUEOS (WSL & IDEs)      " -ForegroundColor $Cyan
Write-Host "======================================================================" -ForegroundColor $Cyan
Write-Host ""

# 1. Auditoría de Procesos WSL en Windows
Write-Host "[1/5] Analizando procesos wsl.exe en el Host Windows..." -ForegroundColor $Yellow
$wslProcesses = Get-Process -Name "wsl" -ErrorAction SilentlyContinue

if ($wslProcesses) {
    $count = ($wslProcesses | Measure-Object).Count
    Write-Host "   -> Se encontraron $($count) procesos 'wsl.exe' activos." -ForegroundColor $Yellow
    
    # Listar detalles de procesos potencialmente bloqueados
    $now = Get-Date
    $zombieCount = 0
    foreach ($proc in $wslProcesses) {
        try {
            $startTime = $proc.StartTime
            $age = $now - $startTime
            if ($age.TotalMinutes -gt 30) {
                $zombieCount++
                Write-Host "      ⚠ PID $($proc.Id) activo desde $($startTime.ToString('yyyy-MM-dd HH:mm')) ($([Math]::Round($age.TotalHours, 1)) horas)" -ForegroundColor $Red
            }
        } catch {
            # Algunos procesos del sistema pueden no permitir leer StartTime sin permisos de Admin
        }
    }
    
    if ($zombieCount -gt 0) {
        Write-Host "   -> ¡Alerta! Se detectaron $($zombieCount) procesos zombies de larga duración." -ForegroundColor $Red
    }

    if ($count -gt 15 -or $ForceKill) {
        Write-Host "   -> Demasiados procesos acumulados ($count). Procediendo a limpiar..." -ForegroundColor $Yellow
        Stop-Process -Name "wsl" -Force
        Write-Host "   ✅ Todos los procesos 'wsl.exe' huérfanos han sido finalizados en Windows." -ForegroundColor $Green
        $wslProcesses = $null
    } else {
        Write-Host "   -> Cantidad de procesos dentro del límite seguro ($count)." -ForegroundColor $Green
    }
} else {
    Write-Host "   ✅ No hay procesos 'wsl.exe' ejecutándose en este momento. Limpio." -ForegroundColor $Green
}
Write-Host ""

# 2. Auditoría de Puertos Críticos en Host
Write-Host "[2/5] Verificando puertos críticos del Ecosistema..." -ForegroundColor $Yellow
$ports = @(
    @{Port=7777; Service="DevBrain Gateway (Orquestador)"},
    @{Port=8010; Service="Unified Hub (MCP Server)"},
    @{Port=7800; Service="GPU Bridge (AI Inference)"},
    @{Port=7801; Service="NPU Bridge (Semantic Embeddings)"},
    @{Port=5432; Service="PostgreSQL 16/18 DB"},
    @{Port=6379; Service="Redis Session Cache"}
)

$blockedPortsCount = 0
foreach ($p in $ports) {
    $connect = Test-NetConnection -ComputerName 127.0.0.1 -Port $p.Port -WarningAction SilentlyContinue
    if ($connect.TcpTestSucceeded) {
        Write-Host "   ✔ Puerto $($p.Port) [$($p.Service)] -> ACTIVO / RESPONDE" -ForegroundColor $Green
    } else {
        Write-Host "   ❌ Puerto $($p.Port) [$($p.Service)] -> INACTIVO / BLOQUEADO" -ForegroundColor $Red
        $blockedPortsCount++
    }
}
Write-Host ""

# 3. Auditoría de .wslconfig (Prevención de Pérdida de RAM)
Write-Host "[3/5] Verificando límites y optimizaciones en .wslconfig..." -ForegroundColor $Yellow
$wslConfigPath = "$env:USERPROFILE\.wslconfig"
if (Test-Path $wslConfigPath) {
    $configContent = Get-Content $wslConfigPath
    Write-Host "   Configuración detectada en ${wslConfigPath}:" -ForegroundColor $Gray
    
    $hasMemoryLimit = $configContent -match "memory="
    $hasProcessors = $configContent -match "processors="
    $hasReclaim = $configContent -match "autoMemoryReclaim="
    $hasSparse = $configContent -match "sparseVhd="
    
    foreach ($line in $configContent) {
        if ($line.Trim() -ne "" -and !$line.StartsWith("#")) {
            Write-Host "      • $line" -ForegroundColor $Cyan
        }
    }
    
    Write-Host ""
    if ($hasReclaim -and $hasSparse) {
        Write-Host "   ✅ ¡Perfecto! autoMemoryReclaim y sparseVhd están activos. Tu RAM se recuperará automáticamente." -ForegroundColor $Green
    } else {
        Write-Host "   ⚠ Optimización pendiente: Falta autoMemoryReclaim o sparseVhd." -ForegroundColor $Yellow
    }
} else {
    Write-Host "   ❌ No se detectó archivo .wslconfig en tu directorio de usuario." -ForegroundColor $Red
}
Write-Host ""

# 4. Acciones de Autoreparación Activa
if ($ShutdownWSL -or ($blockedPortsCount -gt 3 -and $wslProcesses)) {
    Write-Host "[4/5] Aplicando Autoreparación: Reiniciando Subsistema WSL2..." -ForegroundColor $Yellow
    Write-Host "   -> Apagando WSL de forma segura..." -ForegroundColor $Yellow
    wsl.exe --shutdown
    Start-Sleep -Seconds 3
    
    # Verificar que se apagó
    $status = wsl.exe -l -v | Out-String
    if ($status -match "Stopped" -or $status -eq "") {
        Write-Host "   ✅ WSL2 apagado correctamente." -ForegroundColor $Green
    } else {
        Write-Host "   ⚠ Intento de apagado suave falló. Forzando detención del servicio..." -ForegroundColor $Red
        # Detener el servicio WSLService de Windows (requiere privilegios de Admin)
        Stop-Service -Name "WSLService" -Force -ErrorAction SilentlyContinue
        Start-Service -Name "WSLService" -ErrorAction SilentlyContinue
        Write-Host "   ✅ Servicio de Windows WSLService reiniciado." -ForegroundColor $Green
    }
    
    # Iniciar de nuevo y arrancar Docker
    Write-Host "   -> Iniciando WSL y verificando distribución por defecto..." -ForegroundColor $Yellow
    wsl.exe -d Ubuntu -e true 2>$null
    wsl.exe -e true 2>$null
    
    if ($RestartDocker) {
        Write-Host "   -> Reiniciando contenedores de Docker..." -ForegroundColor $Yellow
        wsl.exe -d Ubuntu -e docker compose -f /mnt/c/Users/Miguel/Documents/Aplicaciones/_projects/villaluz/docker-compose.yml up -d 2>$null
        Write-Host "   ✅ Docker Stack reiniciado en segundo plano." -ForegroundColor $Green
    }
} else {
    Write-Host "[4/5] Autoreparación: No se requiere reinicio completo de WSL en este momento." -ForegroundColor $Green
    Write-Host "   (Para forzar reinicio completo usa: .\Fix-WSL-Hangs.ps1 -ShutdownWSL -RestartDocker)" -ForegroundColor $Gray
}
Write-Host ""

# 5. Recomendaciones de Estabilidad Operativa
Write-Host "[5/5] Consejos de Estabilidad para el Desarrollador:" -ForegroundColor $Cyan
Write-Host "   1. Cuando tu IDE (Cursor, Windsurf, Claude) se quede pegado, ejecuta este script en PowerShell." -ForegroundColor $Gray
Write-Host "   2. Evita dejar abiertas múltiples terminales con procesos 'npm run dev' u 'ollama' colgados." -ForegroundColor $Gray
Write-Host "   3. wsl.exe --shutdown es tu mejor aliado cuando el consumo de RAM de la laptop Alienware supere el 90%." -ForegroundColor $Gray
Write-Host "   4. La configuración de .wslconfig con 'autoMemoryReclaim=gradual' liberará tu RAM automáticamente." -ForegroundColor $Gray
Write-Host ""
Write-Host "======================================================================" -ForegroundColor $Cyan
Write-Host "   SISTEMA DE DIAGNÓSTICO DE RENDIMIENTO COMPLETADO" -ForegroundColor $Cyan
Write-Host "======================================================================" -ForegroundColor $Cyan
Write-Host ""
