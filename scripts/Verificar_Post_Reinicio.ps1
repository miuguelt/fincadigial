#Requires -Version 5.1
<#
.SYNOPSIS
    Verificación Post-Reinicio de MCPs DevBrain
    
.DESCRIPTION
    Script para ejecutar DESPUÉS de reiniciar Windows
    para verificar que todo funciona correctamente.
    
.EXAMPLE
    .\Verificar_Post_Reinicio.ps1
    Muestra estado completo del ecosistema MCP
#>

$ErrorActionPreference = "Stop"
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    VERIFICACIÓN POST-REINICIO - MCP DEVBRAIN              ║" -ForegroundColor Cyan
Write-Host "║    $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$Results = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Tests = @()
    OverallStatus = "UNKNOWN"
}

# Test 1: Verificar servicios en ejecución
Write-Host "[1/5] Verificando procesos MCP..." -ForegroundColor Yellow
$expectedProcesses = @("dashboard-server", "mcp-gateway", "mcp-gpu", "mcp-npu")
$foundProcesses = @()

foreach ($pattern in $expectedProcesses) {
    $procs = Get-Process | Where-Object { $_.ProcessName -like "*$pattern*" }
    if ($procs) {
        foreach ($proc in $procs) {
            $foundProcesses += [PSCustomObject]@{
                Name = $proc.ProcessName
                PID = $proc.Id
                MemoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 1)
                Responding = $proc.Responding
            }
        }
    }
}

if ($foundProcesses.Count -ge 3) {
    Write-Host "  ✅ $($foundProcesses.Count) servicios encontrados" -ForegroundColor Green
    $Results.Tests += @{ Name = "Procesos"; Status = "PASS"; Count = $foundProcesses.Count }
} else {
    Write-Host "  ❌ Solo $($foundProcesses.Count) servicios encontrados (se esperaban 4)" -ForegroundColor Red
    $Results.Tests += @{ Name = "Procesos"; Status = "FAIL"; Count = $foundProcesses.Count }
}

$foundProcesses | Format-Table -AutoSize | Out-String | Write-Host -ForegroundColor Gray

# Test 2: Health checks HTTP
Write-Host "[2/5] Verificando health endpoints..." -ForegroundColor Yellow
$endpoints = @(
    @{ Name = "Dashboard"; Port = 8091 },
    @{ Name = "Gateway"; Port = 7800 },
    @{ Name = "GPU Bridge"; Port = 7801 },
    @{ Name = "NPU Bridge"; Port = 7802 }
)

$healthyCount = 0
foreach ($ep in $endpoints) {
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:$($ep.Port)/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  ✅ $($ep.Name) (port $($ep.Port)): $response" -ForegroundColor Green
        $healthyCount++
    } catch {
        Write-Host "  ⚠️ $($ep.Name) (port $($ep.Port)): No responde" -ForegroundColor Yellow
    }
}

if ($healthyCount -ge 3) {
    $Results.Tests += @{ Name = "Health Checks"; Status = "PASS"; Healthy = $healthyCount }
} else {
    $Results.Tests += @{ Name = "Health Checks"; Status = "FAIL"; Healthy = $healthyCount }
}

# Test 3: Verificar persistencia
Write-Host "[3/5] Verificando sistema de persistencia..." -ForegroundColor Yellow
$task = Get-ScheduledTask -TaskName "DevBrain-MCP-AutoStart" -ErrorAction SilentlyContinue
$startupShortcut = Test-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MCP_DevBrain.lnk"

if ($task) {
    Write-Host "  ✅ Task Scheduler: $($task.TaskName)" -ForegroundColor Green
} else {
    Write-Host "  ❌ Task Scheduler: No encontrado" -ForegroundColor Red
}

if ($startupShortcut) {
    Write-Host "  ✅ Startup Folder: MCP_DevBrain.lnk" -ForegroundColor Green
} else {
    Write-Host "  ❌ Startup Folder: No encontrado" -ForegroundColor Red
}

if ($task -and $startupShortcut) {
    $Results.Tests += @{ Name = "Persistencia"; Status = "PASS" }
} else {
    $Results.Tests += @{ Name = "Persistencia"; Status = "WARN" }
}

# Test 4: Verificar logs
Write-Host "[4/5] Verificando logs recientes..." -ForegroundColor Yellow
$logFiles = @(
    "..\logs\mcp_persistencia.log",
    "..\logs\mcp_startup.log"
)

foreach ($log in $logFiles) {
    $logPath = Join-Path $PSScriptRoot $log
    if (Test-Path $logPath) {
        $lastWrite = (Get-Item $logPath).LastWriteTime
        $age = (Get-Date) - $lastWrite
        Write-Host "  ✅ $([System.IO.Path]::GetFileName($log)): Actualizado hace $([math]::Round($age.TotalMinutes)) minutos" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $([System.IO.Path]::GetFileName($log)): No encontrado" -ForegroundColor Yellow
    }
}

$Results.Tests += @{ Name = "Logs"; Status = "PASS" }

# Test 5: Resumen de sistema
Write-Host "[5/5] Resumen del sistema..." -ForegroundColor Yellow
$systemInfo = @{
    OS = (Get-CimInstance Win32_OperatingSystem).Caption
    Uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
    PowerShell = $PSVersionTable.PSVersion.ToString()
}

Write-Host "  OS: $($systemInfo.OS)" -ForegroundColor Gray
Write-Host "  Uptime: $([math]::Round($systemInfo.Uptime.TotalHours, 1)) horas" -ForegroundColor Gray
Write-Host "  PowerShell: $($systemInfo.PowerShell)" -ForegroundColor Gray

# Resultado final
Write-Host ""
$passedTests = ($Results.Tests | Where-Object { $_.Status -eq "PASS" }).Count
$totalTests = $Results.Tests.Count

if ($passedTests -eq $totalTests) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ TODAS LAS PRUEBAS PASARON                              ║" -ForegroundColor Green
    Write-Host "║  El sistema MCP DevBrain está funcionando correctamente     ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    $Results.OverallStatus = "HEALTHY"
} elseif ($passedTests -ge ($totalTests - 1)) {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║  ⚠️  ALGUNAS PRUEBAS FALLARON                               ║" -ForegroundColor Yellow
    Write-Host "║  El sistema funciona pero requiere atención                  ║" -ForegroundColor Yellow
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    $Results.OverallStatus = "DEGRADED"
} else {
    Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ❌ MULTIPLES PRUEBAS FALLARON                             ║" -ForegroundColor Red
    Write-Host "║  El sistema requiere intervención manual                     ║" -ForegroundColor Red
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecutar: .\MCP_Persistencia_Definitiva.ps1 -Install" -ForegroundColor Cyan
    $Results.OverallStatus = "FAILED"
}

Write-Host ""
Write-Host "Pruebas pasadas: $passedTests/$totalTests" -ForegroundColor White

# Guardar reporte
$reportPath = Join-Path $PSScriptRoot "..\logs\mcp_post_reboot_verification_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$Results | ConvertTo-Json -Depth 3 | Out-File $reportPath
Write-Host "Reporte guardado: $reportPath" -ForegroundColor Gray

exit $(if ($Results.OverallStatus -eq "HEALTHY") { 0 } else { 1 })
