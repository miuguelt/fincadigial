#Requires -Version 5.1
<#
.SYNOPSIS
    Inicia MCP Health Monitor en modo estable (sin auto-inicio)
    
.DESCRIPTION
    Inicia el monitor de salud MCP garantizando:
    - No bloquea la consola (ejecución en background)
    - Estabilidad en ejecuciones prolongadas
    - Fácil de detener cuando sea necesario
    - Logs persistentes

.EXAMPLE
    .\Start-MCPMonitor.ps1
    Inicia en modo background (recomendado)

.EXAMPLE
    .\Start-MCPMonitor.ps1 -Foreground
    Inicia en modo consola (para ver logs en tiempo real)

.EXAMPLE
    .\Start-MCPMonitor.ps1 -Stop
    Detiene el monitor
#>

[CmdletBinding()]
param(
    [switch]$Foreground,
    [switch]$Stop,
    [int]$Interval = 30
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MonitorScript = Join-Path $ScriptDir "mcp_health_monitor_v2.py"
$ConfigPath = "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp\mcp_config_optimized.json"

# Colores
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"

function Write-Header {
    Write-Host "" -ForegroundColor $ColorInfo
    Write-Host "========================================" -ForegroundColor $ColorInfo
    Write-Host "   MCP Health Monitor - Modo Estable" -ForegroundColor $ColorInfo
    Write-Host "========================================" -ForegroundColor $ColorInfo
    Write-Host "" -ForegroundColor $ColorInfo
}

function Stop-Monitor {
    Write-Host "Deteniendo MCP Monitor..." -ForegroundColor $ColorWarning
    
    # Buscar procesos python que ejecutan el monitor usando CIM (más confiable para CommandLine)
    $processes = Get-CimInstance Win32_Process -Filter "Name LIKE 'python%.exe' AND CommandLine LIKE '%mcp_health_monitor_v2%'"
    
    if ($processes) {
        $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
        Write-Host "[OK] Monitor detenido ($($processes.Count) proceso(s))" -ForegroundColor $ColorSuccess
    } else {
        Write-Host "[INFO] No se encontraron procesos activos" -ForegroundColor $ColorWarning
    }
    
    # Limpiar procesos MCP
    Get-Process -Name "mcp-lightning-proxy*" -ErrorAction SilentlyContinue | Stop-Process -Force
}

function Start-Foreground {
    Write-Header
    Write-Host "Modo: CONSOLA (Foreground)" -ForegroundColor $ColorWarning
    Write-Host "- Verás todos los logs en tiempo real" -ForegroundColor $ColorInfo
    Write-Host "- Presiona Ctrl+C para detener" -ForegroundColor $ColorInfo
    Write-Host ""
    
    $arguments = @(
        $MonitorScript,
        "--config", $ConfigPath,
        "--interval", $Interval
    )
    
    & python @arguments
}

function Start-Background {
    Write-Header
    Write-Host "Modo: BACKGROUND (Segundo plano)" -ForegroundColor $ColorSuccess
    Write-Host "- Corre sin bloquear esta ventana" -ForegroundColor $ColorInfo
    Write-Host "- Para detener: .\Start-MCPMonitor.ps1 -Stop" -ForegroundColor $ColorInfo
    Write-Host "- O usa: taskkill /F /IM pythonw.exe" -ForegroundColor $ColorInfo
    Write-Host ""
    Write-Host "Logs en: logs\mcp_monitor_v2.log" -ForegroundColor $ColorInfo
    Write-Host ""
    
    $arguments = @(
        $MonitorScript,
        "--config", $ConfigPath,
        "--interval", $Interval
    )
    
    # Iniciar con Start-Process para que no bloquee
    $proc = Start-Process -FilePath "pythonw" -ArgumentList $arguments -WindowStyle Hidden -PassThru
    
    Write-Host "[OK] Monitor iniciado (PID: $($proc.Id))" -ForegroundColor $ColorSuccess
    Write-Host ""
    Write-Host "Estado inicial:" -ForegroundColor $ColorInfo
    Start-Sleep -Seconds 2
    
    # Mostrar estado inicial
    $logFile = Join-Path (Split-Path -Parent $ScriptDir) "logs\mcp_monitor_v2.log"
    if (Test-Path $logFile) {
        $lastLines = Get-Content $logFile -Tail 5
        $lastLines | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    }
}

# ============================================
# MAIN
# ============================================

if ($Stop) {
    Stop-Monitor
    exit 0
}

if ($Foreground) {
    Start-Foreground
} else {
    Start-Background
}
