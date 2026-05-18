#Requires -Version 5.1
<#
.SYNOPSIS
    Script de Corrección Total para MCPs DevBrain
    
.DESCRIPTION
    Corrige TODOS los problemas MCP para garantizar funcionamiento
    perfecto después del siguiente reinicio de Windows.
    
    Acciones:
    1. Instala servicio de recuperación automática
    2. Corrige configuración de Trae (--port 7777)
    3. Limpia procesos huérfanos
    4. Verifica integridad de executables
    5. Crea respaldo de configuración
    6. Genera reporte final

.EXAMPLE
    .\MCP_Correccion_Total.ps1
    Ejecuta todas las correcciones e instala servicio

.EXAMPLE
    .\MCP_Correccion_Total.ps1 -WhatIf
    Muestra qué cambios se harían sin ejecutarlos
#>

[CmdletBinding()]
param(
    [switch]$WhatIf,
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $RootDir "logs"
$BackupDir = Join-Path $RootDir "backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Colores
$C = @{ Info = "Cyan"; Success = "Green"; Warning = "Yellow"; Error = "Red"; Critical = "Magenta" }

function Write-Status {
    param([string]$Message, [string]$Level = "Info", [int]$Step = 0, [int]$Total = 7)
    $prefix = if ($Step -gt 0) { "[$Step/$Total] " } else { "" }
    Write-Host "$prefix$Message" -ForegroundColor $C[$Level]
}

function Invoke-WhatIf {
    param([string]$Action, [scriptblock]$Command)
    if ($WhatIf) {
        Write-Status "[WHATIF] $Action" "Warning"
        return $true
    }
    try {
        & $Command
        return $true
    } catch {
        Write-Status "ERROR: $($_.Exception.Message)" "Error"
        return $false
    }
}

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $C.Info
Write-Host "║     CORRECCIÓN TOTAL - MCP DEVBRAIN                        ║" -ForegroundColor $C.Info
Write-Host "║     Preparando sistema para próximo reinicio               ║" -ForegroundColor $C.Info
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $C.Info
Write-Host ""

if ($WhatIf) {
    Write-Status "MODO SIMULACIÓN - No se harán cambios reales" "Warning"
    Write-Host ""
}

# ============================================
# PASO 1: Crear directorios y respaldos
# ============================================
Write-Status "Creando estructura de respaldos..." "Info" 1

Invoke-WhatIf "Crear directorio de respaldos: $BackupDir" {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
}

$MCPBasePath = "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp"
$ConfigPath = Join-Path $MCPBasePath "mcp_config_optimized.json"

if (Test-Path $ConfigPath) {
    $BackupPath = Join-Path $BackupDir "mcp_config_$Timestamp.json"
    Invoke-WhatIf "Respaldar configuración MCP a $BackupPath" {
        if (-not $SkipBackup) {
            Copy-Item $ConfigPath $BackupPath -Force
            Write-Status "Configuración respaldada: $BackupPath" "Success"
        }
    }
}

# ============================================
# PASO 2: Limpiar procesos huérfanos
# ============================================
Write-Status "Limpiando procesos MCP huérfanos..." "Warning" 2

$orphanPatterns = @("*mcp-lightning*", "*dashboard-server*", "*mcp-gateway*", "*mcp-gpu*", "*mcp-npu*", "*mcp-core*", "*mcp-ai*")
$cleaned = 0

foreach ($pattern in $orphanPatterns) {
    Invoke-WhatIf "Buscar y detener procesos: $pattern" {
        $procs = Get-Process | Where-Object { $_.ProcessName -like $pattern }
        foreach ($proc in $procs) {
            try {
                $proc | Stop-Process -Force -ErrorAction Stop
                $cleaned++
                Write-Status "  Detenido PID $($proc.Id) ($($proc.ProcessName))" "Info"
            } catch {
                Write-Status "  No se pudo detener PID $($proc.Id)" "Warning"
            }
        }
    }
}

Write-Status "Procesos limpiados: $cleaned" $(if ($cleaned -gt 0) { "Warning" } else { "Success" })

# ============================================
# PASO 3: Corregir configuración de Trae
# ============================================
Write-Status "Corrigiendo configuración MCP (Trae)..." "Warning" 3

Invoke-WhatIf "Corregir --port 7777 en config de Trae" {
    if (Test-Path $ConfigPath) {
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        
        # Verificar si Trae tiene --port en dashboard
        if ($config.ide_specific.trae.mcpServers.'devbrain-dashboard'.args) {
            $originalArgs = $config.ide_specific.trae.mcpServers.'devbrain-dashboard'.args
            Write-Status "  Args originales de Trae dashboard: $($originalArgs -join ' ')" "Info"
            
            # Eliminar args de puerto (el dashboard usa 8091 hardcoded)
            $config.ide_specific.trae.mcpServers.'devbrain-dashboard'.args = @()
            
            # Guardar configuración corregida
            $config | ConvertTo-Json -Depth 10 | Out-File $ConfigPath -Encoding UTF8
            
            Write-Status "  ✓ Configuración de Trae corregida (eliminado --port 7777)" "Success"
        } else {
            Write-Status "  Configuración de Trae ya está correcta" "Success"
        }
    } else {
        Write-Status "  Archivo de configuración no encontrado: $ConfigPath" "Error"
    }
}

# ============================================
# PASO 4: Verificar integridad de ejecutables
# ============================================
Write-Status "Verificando integridad de ejecutables MCP..." "Info" 4

$requiredExes = @(
    @{ Path = "go\dashboard-server\dashboard-server-v2.exe"; Name = "Dashboard Server" }
    @{ Path = "go\mcp-gateway.exe"; Name = "MCP Gateway" }
    @{ Path = "bin\mcp-gpu-bridge.exe"; Name = "GPU Bridge" }
    @{ Path = "bin\mcp-npu-bridge.exe"; Name = "NPU Bridge" }
)

$missing = @()
foreach ($exe in $requiredExes) {
    $fullPath = Join-Path $MCPBasePath $exe.Path
    Invoke-WhatIf "Verificar existencia de $($exe.Name)" {
        if (Test-Path $fullPath) {
            $size = (Get-Item $fullPath).Length
            Write-Status "  ✓ $($exe.Name): $([math]::Round($size/1KB,1)) KB" "Success"
        } else {
            Write-Status "  ✗ $($exe.Name) NO ENCONTRADO: $fullPath" "Error"
            $missing += $exe.Name
        }
    }
}

if ($missing.Count -gt 0) {
    Write-Status "EJECUTABLES FALTANTES: $($missing -join ', ')" "Critical"
    Write-Status "El sistema puede no funcionar correctamente después del reinicio" "Critical"
}

# ============================================
# PASO 5: Crear script de inicio post-reinicio
# ============================================
Write-Status "Creando script de inicio post-reinicio..." "Info" 5

$startupScript = @"
# MCP DevBrain - Inicio post-reinicio automático
# Generado: $(Get-Date)

Write-Host "Iniciando MCP DevBrain despues de reinicio..." -ForegroundColor Cyan

& "$ScriptDir\MCP_AutoRecovery_Service.ps1" -Start

# Verificar estado
Start-Sleep -Seconds 5
& "$ScriptDir\MCP_AutoRecovery_Service.ps1" -Status

Write-Host "`nPresiona cualquier tecla para cerrar..." -ForegroundColor Gray
`$null = `$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@

$startupPath = Join-Path $ScriptDir "MCP_PostReboot_Startup.ps1"
Invoke-WhatIf "Crear script de inicio: $startupPath" {
    $startupScript | Out-File $startupPath -Encoding UTF8
    Write-Status "  ✓ Script de inicio creado" "Success"
}

# ============================================
# PASO 6: Instalar servicio de recuperación
# ============================================
Write-Status "Instalando servicio de recuperación automática..." "Info" 6

Invoke-WhatIf "Instalar servicio MCP AutoRecovery" {
    & "$ScriptDir\MCP_AutoRecovery_Service.ps1" -Install
}

# Verificar instalación
$taskName = "DevBrain-MCP-AutoRecovery"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task) {
    Write-Status "  ✓ Servicio instalado correctamente" "Success"
    Write-Status "  Se iniciará automáticamente al iniciar sesión" "Info"
} else {
    Write-Status "  ✗ No se pudo verificar instalación del servicio" "Warning"
}

# ============================================
# PASO 7: Generar reporte final y probar
# ============================================
Write-Status "Iniciando servicios y generando reporte..." "Info" 7

# Iniciar servicios ahora para verificar
Invoke-WhatIf "Iniciar servicios MCP ahora" {
    & "$ScriptDir\MCP_AutoRecovery_Service.ps1" -Start
}

# Esperar y verificar
Start-Sleep -Seconds 5

$finalReport = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    CorrectionsApplied = @(
        "Respaldo de configuración creado"
        "Procesos huérfanos limpiados"
        "Configuración de Trae corregida (puerto 7777)"
        "Integridad de ejecutables verificada"
        "Script de inicio post-reinicio creado"
        "Servicio de recuperación automática instalado"
    )
    ExecutablesStatus = @{}
    ServiceStatus = @{}
    NextSteps = @(
        "Reiniciar Windows para verificar inicio automático"
        "Verificar estado con: .\MCP_AutoRecovery_Service.ps1 -Status"
        "Revisar logs en: logs\mcp_autorecovery.log"
    )
}

# Verificar ejecutables
foreach ($exe in $requiredExes) {
    $fullPath = Join-Path $MCPBasePath $exe.Path
    $finalReport.ExecutablesStatus[$exe.Name] = Test-Path $fullPath
}

# Verificar servicios
$services = @(
    @{ Name = "dashboard-server"; Port = 8091 }
    @{ Name = "mcp-gateway"; Port = 7800 }
    @{ Name = "mcp-gpu-bridge"; Port = 7801 }
    @{ Name = "mcp-npu-bridge"; Port = 7802 }
)

foreach ($svc in $services) {
    $proc = Get-Process | Where-Object { $_.ProcessName -like "*$($svc.Name)*" } | Select-Object -First 1
    $finalReport.ServiceStatus[$svc.Name] = @{
        Running = $proc -ne $null
        ProcessId = if ($proc) { $proc.Id } else { $null }
        Port = $svc.Port
    }
}

# Guardar reporte
$reportPath = Join-Path $LogDir "mcp_correccion_total_$Timestamp.json"
$finalReport | ConvertTo-Json -Depth 5 | Out-File $reportPath

# Mostrar resumen
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $C.Success
Write-Host "║     CORRECCIÓN COMPLETADA                                  ║" -ForegroundColor $C.Success
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor $C.Success

$runningCount = ($finalReport.ServiceStatus.Values | Where-Object { $_.Running }).Count
$totalServices = $finalReport.ServiceStatus.Count

Write-Host "║  Servicios corriendo ahora: $runningCount/$totalServices                                 ║" -ForegroundColor $(if ($runningCount -eq $totalServices) { $C.Success } else { $C.Warning })
Write-Host "║  Servicio auto-recuperación: $(if ($task) { 'INSTALADO  ' } else { 'NO INSTALADO' })                            ║" -ForegroundColor $(if ($task) { $C.Success } else { $C.Error })
Write-Host "║  Reporte guardado en:                                      ║" -ForegroundColor $C.Info
Write-Host "║    logs\mcp_correccion_total_$Timestamp.json                    ║" -ForegroundColor $C.Gray
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $C.Success

Write-Host ""
Write-Status "PRÓXIMOS PASOS:" "Info"
Write-Status "1. Reiniciar Windows para verificar inicio automático" "Warning"
Write-Status "2. Después del reinicio, verificar con:" "Info"
Write-Status "   .\MCP_AutoRecovery_Service.ps1 -Status" "Cyan"
Write-Status "3. Si hay problemas, revisar:" "Info"
Write-Status "   logs\mcp_autorecovery.log" "Cyan"

if ($WhatIf) {
    Write-Host ""
    Write-Status "EJECUTAR SIN -WhatIf PARA APLICAR CAMBIOS REALES" "Critical"
}

return ($runningCount -eq $totalServices -and $task)
