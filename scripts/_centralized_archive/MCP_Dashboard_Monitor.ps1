#Requires -Version 5.1
<#
.SYNOPSIS
    Dashboard de Monitoreo MCP DevBrain en Tiempo Real
    
.DESCRIPTION
    Interfaz visual para monitorear estado de MCPs con:
    - Actualización en tiempo real
    - Historial de health checks
    - Alertas visuales
    - Controles de reinicio
#>

param(
    [switch]$AutoRefresh,
    [int]$RefreshInterval = 5
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# Servicios a monitorear
$Services = @(
    @{ Name = "dashboard-server-v2"; DisplayName = "Dashboard"; Port = 8091; Type = "HTTP"; Color = "Cyan" },
    @{ Name = "mcp-gateway"; DisplayName = "Gateway"; Port = 7800; Type = "HTTP"; Color = "Green" },
    @{ Name = "mcp-gpu-bridge"; DisplayName = "GPU Bridge"; Port = 7801; Type = "HTTP"; Color = "Blue" },
    @{ Name = "mcp-npu-bridge"; DisplayName = "NPU Bridge"; Port = 7802; Type = "PROCESS_ONLY"; Color = "Yellow" }
)

function Clear-Screen {
    # Alternativa compatible con Windows Terminal
    $lines = 30
    for ($i = 0; $i -lt $lines; $i++) { Write-Host "" }
}

function Test-Health {
    param([hashtable]$Service)
    
    $process = Get-Process | Where-Object { $_.ProcessName -eq $Service.Name } | Select-Object -First 1
    
    if (-not $process) {
        return @{ Status = "DOWN"; Process = $null; Health = $null; ResponseTime = 0 }
    }
    
    # Para servicios tipo PROCESS_ONLY, solo verificar que el proceso existe
    if ($Service.Type -eq "PROCESS_ONLY") {
        return @{ 
            Status = "RUNNING"; 
            Process = $process; 
            Health = "N/A (no HTTP endpoint)"; 
            ResponseTime = 0 
        }
    }
    
    # Para servicios HTTP, hacer health check
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$($Service.Port)/health" -TimeoutSec 2 -ErrorAction Stop
        $stopwatch.Stop()
        return @{ 
            Status = "HEALTHY"; 
            Process = $process; 
            Health = $health; 
            ResponseTime = $stopwatch.ElapsedMilliseconds 
        }
    } catch {
        $stopwatch.Stop()
        return @{ 
            Status = "UNRESPONSIVE"; 
            Process = $process; 
            Health = $_.Exception.Message; 
            ResponseTime = $stopwatch.ElapsedMilliseconds 
        }
    }
}

function Show-Dashboard {
    Clear-Screen
    
    $now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor White
    Write-Host "║         MCP DEVBRAIN - DASHBOARD DE MONITOREO                  ║" -ForegroundColor White
    Write-Host "║              $now                          ║" -ForegroundColor Gray
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor White
    Write-Host ""
    
    $results = @()
    $healthyCount = 0
    
    foreach ($svc in $Services) {
        $result = Test-Health -Service $svc
        $results += [PSCustomObject]@{
            Service = $svc
            Result = $result
        }
        
        # Color según estado
        $statusColor = switch ($result.Status) {
            "HEALTHY" { "Green"; $healthyCount++ }
            "RUNNING" { "Yellow" }
            "UNRESPONSIVE" { "Red" }
            "DOWN" { "Red" }
            default { "Gray" }
        }
        
        $icon = switch ($result.Status) {
            "HEALTHY" { "✅" }
            "RUNNING" { "🟡" }
            "UNRESPONSIVE" { "⚠️" }
            "DOWN" { "❌" }
        }
        
        $statusText = switch ($result.Status) {
            "HEALTHY" { "SALUDABLE" }
            "RUNNING" { "CORRIENDO" }
            "UNRESPONSIVE" { "SIN RESPUESTA" }
            "DOWN" { "CAÍDO" }
        }
        
        Write-Host "  $icon " -NoNewline
        Write-Host "$($svc.DisplayName.PadRight(15))" -ForegroundColor $svc.Color -NoNewline
        Write-Host " │ " -NoNewline
        Write-Host "$statusText.PadRight(15)" -ForegroundColor $statusColor -NoNewline
        Write-Host " │ " -NoNewline
        
        if ($result.Process) {
            Write-Host "PID: $($result.Process.Id.ToString().PadRight(6))" -ForegroundColor Gray -NoNewline
            Write-Host " │ " -NoNewline
            Write-Host "Mem: $([math]::Round($result.Process.WorkingSet64/1MB,1)) MB" -ForegroundColor Gray -NoNewline
        } else {
            Write-Host "PID: N/A       │ Mem: N/A".PadRight(25) -ForegroundColor DarkGray -NoNewline
        }
        
        if ($result.ResponseTime -gt 0) {
            Write-Host " │ ${result.ResponseTime}ms" -ForegroundColor $(if ($result.ResponseTime -lt 100) { "Green" } else { "Yellow" })
        } else {
            Write-Host ""
        }
        
        # Mostrar health response si existe
        if ($result.Health -and $result.Health -ne "N/A (no HTTP endpoint)") {
            $healthStr = $result.Health.ToString()
            if ($healthStr.Length -gt 40) { $healthStr = $healthStr.Substring(0, 40) + "..." }
            Write-Host "      └─ Health: $healthStr" -ForegroundColor DarkGray
        }
    }
    
    # Resumen
    Write-Host ""
    Write-Host "  ──────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    $total = $Services.Count
    $percent = [math]::Round(($healthyCount / $total) * 100)
    
    $summaryColor = if ($percent -eq 100) { "Green" } elseif ($percent -ge 75) { "Yellow" } else { "Red" }
    Write-Host "  Servicios Saludables: $healthyCount/$total ($percent%)" -ForegroundColor $summaryColor
    
    # Controles
    Write-Host ""
    Write-Host "  CONTROLES:" -ForegroundColor Cyan
    Write-Host "    [R] Refrescar    [A] Auto-refresh (5s)    [Q] Salir    [S] Iniciar servicios" -ForegroundColor Gray
    
    return $results
}

function Show-Header {
    Write-Host ""
    Write-Host "  MCP DevBrain Monitor v2.0" -ForegroundColor Cyan
    Write-Host "  Presiona Q para salir, R para refrescar" -ForegroundColor DarkGray
    Write-Host ""
}

# Main loop
Show-Header
$running = $true
$autoRefresh = $AutoRefresh

while ($running) {
    $results = Show-Dashboard
    
    if ($autoRefresh) {
        # Modo auto-refresh
        for ($i = $RefreshInterval; $i -gt 0; $i--) {
            Write-Host "`r  Próxima actualización en ${i}s... (Presiona Q para salir)" -NoNewline -ForegroundColor DarkGray
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if ($key.Key -eq "Q") { $running = $false; break }
                if ($key.Key -eq "R") { break }
                if ($key.Key -eq "S") { 
                    Write-Host "`r  Iniciando servicios...               " -ForegroundColor Yellow
                    & "$ScriptDir\MCP_Persistencia_Definitiva.ps1" -Start
                    Start-Sleep -Seconds 2
                    break 
                }
            }
            Start-Sleep -Seconds 1
        }
        Write-Host "`r                                          `r" -NoNewline
    } else {
        # Modo manual
        Write-Host ""
        $choice = Read-Host "  Opción"
        switch ($choice.ToUpper()) {
            "Q" { $running = $false }
            "A" { $autoRefresh = $true }
            "R" { continue }
            "S" { 
                & "$ScriptDir\MCP_Persistencia_Definitiva.ps1" -Start
                Start-Sleep -Seconds 2
            }
        }
    }
}

Write-Host "`n  Dashboard detenido." -ForegroundColor Gray
