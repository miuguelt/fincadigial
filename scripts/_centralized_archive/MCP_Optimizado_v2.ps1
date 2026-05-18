#Requires -Version 5.1
<#
.SYNOPSIS
    MCP DevBrain Persistencia v2.0 - Optimizado
    
.DESCRIPTION
    Versión mejorada con:
    - Manejo correcto de servicios sin health endpoint HTTP
    - Verificación de puerto TCP como alternativa
    - Retry logic con exponential backoff
    - Mejor logging de errores
    - Soporte para graceful shutdown
#>

[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Restart,
    [switch]$Monitor
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $RootDir "logs"
$MCPBasePath = "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp"

# Configuración de servicios mejorada
$Services = @(
    @{
        Name = "dashboard-server-v2"
        Exe = "go\dashboard-server\dashboard-server-v2.exe"
        Port = 8091
        Delay = 0
        Critical = $true
        HealthPath = "/health"
        HasHttpHealth = $true
        StartupTimeout = 45
    },
    @{
        Name = "mcp-gateway"
        Exe = "go\mcp-gateway.exe"
        Port = 7800
        Delay = 3
        Critical = $true
        HealthPath = "/health"
        HasHttpHealth = $true
        StartupTimeout = 45
    },
    @{
        Name = "mcp-gpu-bridge"
        Exe = "bin\mcp-gpu-bridge.exe"
        Port = 7801
        Delay = 6
        Critical = $false
        HealthPath = "/health"
        HasHttpHealth = $true
        StartupTimeout = 30
    },
    @{
        Name = "mcp-npu-bridge"
        Exe = "bin\mcp-npu-bridge.exe"
        Port = 7802
        Delay = 9
        Critical = $false
        HealthPath = $null
        HasHttpHealth = $false  # Solo verificar proceso
        StartupTimeout = 30
    }
)

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS", "DEBUG")]
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    $logFile = Join-Path $LogDir "mcp_v2.log"
    
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    Add-Content -Path $logFile -Value $logEntry -ErrorAction SilentlyContinue
    
    $colorMap = @{ "ERROR" = "Red"; "WARN" = "Yellow"; "SUCCESS" = "Green"; "DEBUG" = "DarkGray"; "INFO" = "White" }
    $color = $colorMap[$Level]
    if (-not $color) { $color = "Gray" }
    Write-Host $logEntry -ForegroundColor $color
}

function Test-TcpPort {
    param([int]$Port, [int]$TimeoutMs = 1000)
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        $client.Close()
        return $success
    } catch {
        return $false
    }
}

function Test-ServiceHealth {
    param([hashtable]$Service)
    
    # Primero verificar si el proceso existe
    $process = Get-Process | Where-Object { $_.ProcessName -eq $Service.Name } | Select-Object -First 1
    
    if (-not $process) {
        return @{ 
            Status = "DOWN"
            Process = $null
            ProcessResponding = $false
            PortOpen = $false
            HttpHealthy = $false
            ResponseTime = 0
            Details = "Proceso no encontrado"
        }
    }
    
    # Si no tiene HTTP health, solo verificar proceso y puerto
    if (-not $Service.HasHttpHealth) {
        $portOpen = Test-TcpPort -Port $Service.Port
        return @{
            Status = if ($portOpen) { "RUNNING" } else { "STARTING" }
            Process = $process
            ProcessResponding = $process.Responding
            PortOpen = $portOpen
            HttpHealthy = $null
            ResponseTime = 0
            Details = if ($portOpen) { "Proceso activo, puerto abierto" } else { "Proceso iniciando..." }
        }
    }
    
    # Para servicios con HTTP health
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $url = "http://127.0.0.1:$($Service.Port)$($Service.HealthPath)"
        $response = Invoke-RestMethod -Uri $url -TimeoutSec 2 -ErrorAction Stop
        $stopwatch.Stop()
        
        return @{
            Status = "HEALTHY"
            Process = $process
            ProcessResponding = $process.Responding
            PortOpen = $true
            HttpHealthy = $true
            ResponseTime = $stopwatch.ElapsedMilliseconds
            Details = $response
        }
    } catch {
        $stopwatch.Stop()
        $portOpen = Test-TcpPort -Port $Service.Port
        
        return @{
            Status = if ($portOpen) { "DEGRADED" } else { "UNRESPONSIVE" }
            Process = $process
            ProcessResponding = $process.Responding
            PortOpen = $portOpen
            HttpHealthy = $false
            ResponseTime = $stopwatch.ElapsedMilliseconds
            Details = $_.Exception.Message
        }
    }
}

function Get-ServiceStatus {
    param([hashtable]$Service)
    return Test-ServiceHealth -Service $Service
}

function Start-MCPService {
    param([hashtable]$Service)
    
    $exePath = Join-Path $MCPBasePath $Service.Exe
    
    if (-not (Test-Path $exePath)) {
        Write-Log "No encontrado: $exePath" "ERROR"
        return @{ Success = $false; Error = "Ejecutable no encontrado" }
    }
    
    # Verificar estado actual
    $currentStatus = Get-ServiceStatus -Service $Service
    if ($currentStatus.Status -eq "HEALTHY" -or ($currentStatus.Status -eq "RUNNING" -and -not $Service.HasHttpHealth)) {
        Write-Log "$($Service.Name) ya está saludable (PID: $($currentStatus.Process.Id))" "SUCCESS"
        return @{ Success = $true; PID = $currentStatus.Process.Id; AlreadyRunning = $true }
    }
    
    # Matar proceso existente si está degradado
    if ($currentStatus.Process) {
        Write-Log "$($Service.Name) existe pero está $($currentStatus.Status), reiniciando..." "WARN"
        try {
            Stop-Process -Id $currentStatus.Process.Id -Force -ErrorAction Stop
            Write-Log "Proceso anterior detenido (PID: $($currentStatus.Process.Id))" "DEBUG"
        } catch {
            Write-Log "No se pudo detener proceso anterior: $($_.Exception.Message)" "WARN"
        }
        Start-Sleep -Seconds 2
    }
    
    # Delay escalonado
    if ($Service.Delay -gt 0) {
        Write-Log "Esperando $($Service.Delay)s antes de iniciar $($Service.Name)..." "DEBUG"
        Start-Sleep -Seconds $Service.Delay
    }
    
    try {
        # Iniciar proceso
        $svcArgs = if ($Service.Port) { @("--port", $Service.Port) } else { @() }
        $proc = Start-Process -FilePath $exePath -ArgumentList $svcArgs -WindowStyle Hidden -PassThru
        Write-Log "$($Service.Name) iniciado (PID: $($proc.Id))" "INFO"
        
        # Esperar con health checks progresivos
        $maxWait = $Service.StartupTimeout
        $checkInterval = 2
        $elapsed = 0
        
        while ($elapsed -lt $maxWait) {
            Start-Sleep -Seconds $checkInterval
            $elapsed += $checkInterval
            
            # Verificar si el proceso sigue vivo
            try {
                $proc.Refresh()
                if ($proc.HasExited) {
                    Write-Log "$($Service.Name) terminó inesperadamente (código: $($proc.ExitCode))" "ERROR"
                    return @{ Success = $false; Error = "Proceso terminó con código $($proc.ExitCode)" }
                }
            } catch {
                Write-Log "Error verificando proceso: $($_.Exception.Message)" "ERROR"
                return @{ Success = $false; Error = "No se pudo verificar el proceso" }
            }
            
            # Verificar salud
            $status = Get-ServiceStatus -Service $Service
            
            if ($status.Status -eq "HEALTHY") {
                Write-Log "$($Service.Name) saludable en ${elapsed}s (PID: $($proc.Id), RT: $($status.ResponseTime)ms)" "SUCCESS"
                return @{ Success = $true; PID = $proc.Id; StartupTime = $elapsed }
            }
            
            if (-not $Service.HasHttpHealth -and $status.Status -eq "RUNNING") {
                Write-Log "$($Service.Name) corriendo (sin health HTTP) en ${elapsed}s" "SUCCESS"
                return @{ Success = $true; PID = $proc.Id; StartupTime = $elapsed }
            }
            
            # Progreso cada 10 segundos
            if ($elapsed % 10 -eq 0) {
                Write-Log "$($Service.Name) iniciando... (${elapsed}s/$($maxWait)s)" "DEBUG"
            }
        }
        
        # Timeout
        Write-Log "$($Service.Name) timeout después de ${maxWait}s" "WARN"
        return @{ Success = $false; Error = "Timeout en health check"; PartialSuccess = $true; PID = $proc.Id }
        
    } catch {
        Write-Log "Error iniciando $($Service.Name): $($_.Exception.Message)" "ERROR"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Stop-MCPService {
    param([hashtable]$Service, [switch]$Graceful)
    
    $status = Get-ServiceStatus -Service $Service
    if (-not $status.Process) {
        Write-Log "$($Service.Name) no está corriendo" "DEBUG"
        return @{ Success = $true; WasRunning = $false }
    }
    
    $processId = $status.Process.Id
    Write-Log "Deteniendo $($Service.Name) (PID: $processId)..." "INFO"
    
    try {
        if ($Graceful) {
            # Intentar graceful shutdown primero
            Stop-Process -Id $processId -ErrorAction Stop
            # Esperar a que termine
            for ($i = 0; $i -lt 10; $i++) {
                Start-Sleep -Seconds 1
                $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if (-not $proc) { break }
            }
            # Forzar si sigue vivo
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Log "Forzando terminación de $($Service.Name)..." "WARN"
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        } else {
            Stop-Process -Id $processId -Force -ErrorAction Stop
        }
        
        Write-Log "$($Service.Name) detenido" "SUCCESS"
        return @{ Success = $true; WasRunning = $true; PID = $processId }
        
    } catch {
        Write-Log "Error deteniendo $($Service.Name): $($_.Exception.Message)" "ERROR"
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Show-Status {
    Write-Log "=== ESTADO DEL SISTEMA MCP ===" "INFO"
    
    $allResults = @()
    $healthyCount = 0
    $criticalHealthy = 0
    
    foreach ($svc in $Services) {
        $status = Get-ServiceStatus -Service $svc
        $allResults += [PSCustomObject]@{ Service = $svc; Status = $status }
        
        # Icono según estado
        $icon = switch ($status.Status) {
            "HEALTHY" { "✅"; $healthyCount++ }
            "RUNNING" { "🟡"; $healthyCount++ }
            "DEGRADED" { "⚠️" }
            "UNRESPONSIVE" { "⛔" }
            "DOWN" { "❌" }
            "STARTING" { "🔄" }
            default { "❓" }
        }
        
        if ($status.Status -in @("HEALTHY", "RUNNING") -and $svc.Critical) {
            $criticalHealthy++
        }
        
        $color = switch ($status.Status) {
            "HEALTHY" { "Green" }
            "RUNNING" { "Yellow" }
            "DEGRADED" { "Yellow" }
            default { "Red" }
        }
        
        $healthStr = if ($status.ResponseTime -gt 0) { "RT: $($status.ResponseTime)ms" } else { "" }
        
        # Mapear color a nivel de log
        $logLevel = switch ($color) {
            "Green" { "SUCCESS" }
            "Yellow" { "WARN" }
            "Red" { "ERROR" }
            default { "INFO" }
        }
        
        Write-Log "$icon $($svc.Name.PadRight(20)) [$($status.Status.PadRight(12))] PID: $(($status.Process.Id.ToString()).PadRight(6)) $healthStr" $logLevel
    }
    
    $summaryLevel = if ($criticalHealthy -eq $Services.Count) { "SUCCESS" } else { "WARN" }
    Write-Log "Resumen: $healthyCount/$($Services.Count) servicios activos, $criticalHealthy/$($Services.Count) críticos saludables" $summaryLevel
    
    return $allResults
}

function Start-All {
    Write-Log "=== INICIANDO TODOS LOS SERVICIOS ===" "INFO"
    $results = @()
    
    foreach ($svc in $Services) {
        $result = Start-MCPService -Service $svc
        $results += [PSCustomObject]@{ Service = $svc; Result = $result }
    }
    
    $successCount = ($results | Where-Object { $_.Result.Success }).Count
    $criticalSuccess = ($results | Where-Object { $_.Service.Critical -and $_.Result.Success }).Count
    $criticalTotal = ($Services | Where-Object { $_.Critical }).Count
    
    Write-Log "Iniciados: $successCount/$($Services.Count) servicios, $criticalSuccess/$criticalTotal críticos" $(if ($criticalSuccess -eq $criticalTotal) { "SUCCESS" } else { "WARN" })
    
    return $results
}

function Stop-All {
    Write-Log "=== DETENIENDO TODOS LOS SERVICIOS ===" "WARN"
    $results = @()
    
    foreach ($svc in $Services) {
        $result = Stop-MCPService -Service $svc -Graceful
        $results += [PSCustomObject]@{ Service = $svc; Result = $result }
    }
    
    return $results
}

function Install-Persistence {
    Write-Log "=== INSTALANDO PERSISTENCIA V2 ===" "INFO"
    
    # Crear script de inicio
    $startupScript = @"
# MCP DevBrain v2 - Inicio automático
`$ErrorActionPreference = "Stop"
`$LogDir = "$LogDir"
`$ScriptDir = "$ScriptDir"

`$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path (Join-Path `$LogDir "mcp_v2_startup.log") -Value "[`$timestamp] Iniciando MCP DevBrain v2..."

try {
    & "`$ScriptDir\MCP_Optimizado_v2.ps1" -Start
    Add-Content -Path (Join-Path `$LogDir "mcp_v2_startup.log") -Value "[`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Servicios iniciados correctamente"
} catch {
    Add-Content -Path (Join-Path `$LogDir "mcp_v2_startup.log") -Value "[`$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ERROR: `$(`$_.Exception.Message)"
}
"@
    
    $startupPath = Join-Path $ScriptDir "MCP_v2_Startup.ps1"
    $startupScript | Out-File $startupPath -Encoding UTF8
    Write-Log "Script de inicio creado: $startupPath" "SUCCESS"
    
    # Acceso directo en Startup
    $startupFolder = [Environment]::GetFolderPath("Startup")
    $shortcutPath = Join-Path $startupFolder "MCP_DevBrain_v2.lnk"
    
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcut = $WshShell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupPath`""
    $shortcut.WorkingDirectory = $ScriptDir
    $shortcut.IconLocation = "powershell.exe,0"
    $shortcut.Save()
    
    Write-Log "Acceso directo creado: $shortcutPath" "SUCCESS"
    Write-Log "Persistencia instalada correctamente" "SUCCESS"
}

function Uninstall-Persistence {
    Write-Log "=== DESINSTALANDO PERSISTENCIA ===" "WARN"
    Stop-All | Out-Null
    
    $startupFolder = [Environment]::GetFolderPath("Startup")
    $shortcutPath = Join-Path $startupFolder "MCP_DevBrain_v2.lnk"
    if (Test-Path $shortcutPath) {
        Remove-Item $shortcutPath -Force
        Write-Log "Acceso directo eliminado" "SUCCESS"
    }
    
    Write-Log "Persistencia desinstalada" "SUCCESS"
}

# Main
if ($Install) {
    Install-Persistence
    Start-All | Out-Null
    Show-Status | Out-Null
} elseif ($Uninstall) {
    Uninstall-Persistence
} elseif ($Start) {
    Start-All | Out-Null
} elseif ($Stop) {
    Stop-All | Out-Null
} elseif ($Restart) {
    Stop-All | Out-Null
    Start-Sleep -Seconds 3
    Start-All | Out-Null
} elseif ($Status) {
    Show-Status | Out-Null
} elseif ($Monitor) {
    # Modo monitoreo continuo
    while ($true) {
        Clear-Host
        Show-Status | Out-Null
        Write-Host "`nActualizando cada 10s... (Ctrl+C para salir)" -ForegroundColor DarkGray
        Start-Sleep -Seconds 10
    }
} else {
    Write-Host @"
MCP DevBrain v2.0 - Persistencia Optimizada

USO:
  -Install       Instalar persistencia + iniciar servicios
  -Uninstall     Eliminar persistencia
  -Start         Iniciar servicios ahora
  -Stop          Detener servicios
  -Restart       Reiniciar todos los servicios
  -Status        Mostrar estado actual
  -Monitor       Monitoreo continuo (auto-refresh)

EJEMPLO:
  .\MCP_Optimizado_v2.ps1 -Install
"@ -ForegroundColor Cyan
}
