#Requires -Version 5.1
<#
.SYNOPSIS
    MCP Health Monitor v2 - Setup y Configuration Script
    
.DESCRIPTION
    Configura e inicia el monitor de salud MCP con manejo anti-zombie.
    Incluye verificación de dependencias, limpieza de procesos huérfanos,
    y configuración automática.

.EXAMPLE
    .\setup_mcp_monitor.ps1
    
.EXAMPLE
    .\setup_mcp_monitor.ps1 -ConfigPath "C:\ruta\mcp_config.json" -Interval 60

.EXAMPLE
    .\setup_mcp_monitor.ps1 -InstallTask  # Instala tarea programada
#>

[CmdletBinding()]
param(
    [string]$ConfigPath = $null,
    [int]$Interval = 30,
    [switch]$InstallTask,
    [switch]$UninstallTask,
    [switch]$NoClean,
    [int]$MaxFailures = 3
)

# Configuración
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $ProjectDir "logs"
$MonitorScript = Join-Path $ScriptDir "mcp_health_monitor_v2.py"

# Colores
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"
$ColorInfo = "Cyan"

function Write-Step {
    param([int]$Step, [int]$Total, [string]$Message)
    Write-Host "[$Step/$Total] $Message" -ForegroundColor $ColorInfo
}

function Write-Success {
    param([string]$Message)
    Write-Host "       OK: $Message" -ForegroundColor $ColorSuccess
}

function Write-Warning {
    param([string]$Message)
    Write-Host "       WARN: $Message" -ForegroundColor $ColorWarning
}

function Write-Error {
    param([string]$Message)
    Write-Host "       ERROR: $Message" -ForegroundColor $ColorError
}

function Test-Python {
    Write-Step -Step 1 -Total 5 -Message "Verificando Python..."
    
    try {
        $pythonVersion = python --version 2>&1
        Write-Success -Message $pythonVersion
        return $true
    }
    catch {
        Write-Error -Message "Python no está instalado o no está en PATH"
        Write-Host "       Instala Python desde: https://python.org" -ForegroundColor $ColorWarning
        return $false
    }
}

function Test-Dependencies {
    Write-Step -Step 2 -Total 5 -Message "Verificando dependencias..."
    
    try {
        python -c "import psutil" 2>&1 | Out-Null
        Write-Success -Message "psutil ya está instalado"
        return $true
    }
    catch {
        Write-Warning -Message "psutil no está instalado, instalando..."
        
        try {
            pip install psutil
            Write-Success -Message "psutil instalado correctamente"
            return $true
        }
        catch {
            Write-Error -Message "No se pudo instalar psutil"
            return $false
        }
    }
}

function Initialize-LogDirectory {
    Write-Step -Step 3 -Total 5 -Message "Preparando directorio de logs..."
    
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    Write-Success -Message "Directorio logs creado en: $LogDir"
}

function Find-MCPConfig {
    Write-Step -Step 4 -Total 5 -Message "Buscando configuración MCP..."
    
    $possiblePaths = @(
        "$env:USERPROFILE\.windsurf\mcp_config.json",
        "$env:USERPROFILE\.cursor\mcp_config.json",
        "$env:USERPROFILE\.vscode\mcp_config.json",
        "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp\mcp_config_optimized.json"
    )
    
    if ($ConfigPath) {
        if (Test-Path $ConfigPath) {
            Write-Success -Message "Usando configuración proporcionada"
            return $ConfigPath
        }
        else {
            Write-Warning -Message "Configuración proporcionada no existe: $ConfigPath"
        }
    }
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            Write-Success -Message "Configuración encontrada: $path"
            return $path
        }
    }
    
    Write-Warning -Message "No se encontró configuración MCP, usando detección automática"
    return $null
}

function Clear-OrphanedProcesses {
    Write-Step -Step 5 -Total 5 -Message "Limpiando procesos MCP huérfanos..."
    
    $processNames = @("mcp-lightning-proxy-v3", "mcp-lightning-proxy", "devbrain-universal")
    $killed = 0
    
    foreach ($procName in $processNames) {
        $processes = Get-Process -Name $procName -ErrorAction SilentlyContinue
        if ($processes) {
            $processes | Stop-Process -Force -ErrorAction SilentlyContinue
            $killed += $processes.Count
        }
    }
    
    if ($killed -gt 0) {
        Write-Success -Message "$killed proceso(s) huérfano(s) eliminado(s)"
    }
    else {
        Write-Success -Message "No había procesos huérfanos"
    }
}

function Install-ScheduledTask {
    Write-Host "`nInstalando tarea programada para auto-inicio..." -ForegroundColor $ColorInfo
    
    $taskName = "MCP Health Monitor v2"
    $taskDescription = "Monitorea y mantiene vivos los servicios MCP de DevBrain"
    
    # Crear acción
    $action = New-ScheduledTaskAction `
        -Execute "pythonw.exe" `
        -Argument "$MonitorScript --config `"$ConfigPath`" --interval $Interval" `
        -WorkingDirectory $ScriptDir
    
    # Crear trigger (al iniciar Windows)
    $trigger = New-ScheduledTaskTrigger -AtStartup
    
    # Crear configuración
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable:$false
    
    # Crear tarea
    try {
        Register-ScheduledTask `
            -TaskName $taskName `
            -Description $taskDescription `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -RunLevel Highest `
            -Force
        
        Write-Success -Message "Tarea '$taskName' instalada correctamente"
        Write-Host "       El monitor se iniciará automáticamente con Windows" -ForegroundColor $ColorSuccess
    }
    catch {
        Write-Error -Message "No se pudo instalar la tarea: $_"
    }
}

function Uninstall-ScheduledTask {
    Write-Host "`nDesinstalando tarea programada..." -ForegroundColor $ColorInfo
    
    $taskName = "MCP Health Monitor v2"
    
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Success -Message "Tarea '$taskName' eliminada"
    }
    catch {
        Write-Warning -Message "No se encontró la tarea o no se pudo eliminar"
    }
}

function Start-Monitor {
    param([string]$ConfigPath)
    
    Write-Host "`n========================================" -ForegroundColor $ColorInfo
    Write-Host "   MCP Health Monitor v2 - Iniciando" -ForegroundColor $ColorInfo
    Write-Host "========================================" -ForegroundColor $ColorInfo
    Write-Host ""
    Write-Host "Presiona Ctrl+C para detener el monitor" -ForegroundColor $ColorWarning
    Write-Host "Logs en: $LogDir\mcp_monitor_v2.log" -ForegroundColor $ColorInfo
    Write-Host ""
    
    $arguments = @()
    if ($ConfigPath) {
        $arguments += "--config"
        $arguments += "`"$ConfigPath`""
    }
    $arguments += "--interval"
    $arguments += $Interval
    $arguments += "--max-failures"
    $arguments += $MaxFailures
    
    if ($NoClean) {
        $arguments += "--no-clean"
    }
    
    $argString = $arguments -join " "
    
    try {
        Invoke-Expression "python `$MonitorScript $argString"
    }
    catch {
        Write-Error -Message "Error al ejecutar monitor: $_"
    }
}

# ============================================
# MAIN
# ============================================

Clear-Host
Write-Host "========================================" -ForegroundColor $ColorInfo
Write-Host "   MCP Health Monitor v2 Setup" -ForegroundColor $ColorInfo
Write-Host "   Anti-Zombie Edition" -ForegroundColor $ColorInfo
Write-Host "========================================" -ForegroundColor $ColorInfo
Write-Host ""

# Verificar modo tarea programada
if ($UninstallTask) {
    Uninstall-ScheduledTask
    exit 0
}

# Verificar Python
if (!(Test-Python)) {
    exit 1
}

# Verificar dependencias
if (!(Test-Dependencies)) {
    exit 1
}

# Preparar directorios
Initialize-LogDirectory

# Buscar configuración
$foundConfig = Find-MCPConfig

# Limpiar procesos huérfanos
Clear-OrphanedProcesses

Write-Host "`n========================================" -ForegroundColor $ColorSuccess
Write-Host "   Setup completado exitosamente!" -ForegroundColor $ColorSuccess
Write-Host "========================================" -ForegroundColor $ColorSuccess

# Instalar tarea si se solicitó
if ($InstallTask) {
    Install-ScheduledTask
}
else {
    # Iniciar monitor
    Start-Monitor -ConfigPath $foundConfig
}

Write-Host "`nMonitor detenido." -ForegroundColor $ColorInfo
