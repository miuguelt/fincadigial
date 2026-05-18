# MCP Multi-IDE Concurrent Load Test
# Simula 4 IDEs (Windsurf, Cursor, Trae, Antigravity) haciendo peticiones simultáneas

param(
    [int]$DurationSeconds = 30,
    [int]$ConcurrentRequests = 20
)

$ErrorActionPreference = "Stop"
$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host "=== MCP MULTI-IDE STRESS TEST ===" -ForegroundColor Cyan
Write-Host "Duración: $DurationSeconds segundos | Peticiones concurrentes: $ConcurrentRequests`n" -ForegroundColor Gray

# Endpoints críticos
$endpoints = @(
    "http://127.0.0.1:8091/health",   # Dashboard
    "http://127.0.0.1:7800/health",   # Gateway
    "http://127.0.0.1:7801/health"    # GPU Bridge
)

$results = @{
    totalRequests = 0
    successCount = 0
    failCount = 0
    responseTimes = @()
    errors = @()
}

# Función de petición
function Test-Endpoint {
    param($Url, $IdeName)
    $start = Get-Date
    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 3 -ErrorAction Stop
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        return @{ Success = $true; Time = $elapsed; Error = $null }
    } catch {
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        return @{ Success = $false; Time = $elapsed; Error = $_.Exception.Message }
    }
}

Write-Host "[INICIANDO] Pressione Ctrl+C para detener prematuramente`n" -ForegroundColor Yellow

# Bucle principal de carga
while ($sw.Elapsed.TotalSeconds -lt $DurationSeconds) {
    $jobs = @()
    
    # Crear jobs concurrentes simulando múltiples IDEs
    for ($i = 0; $i -lt $ConcurrentRequests; $i++) {
        $ideNames = @("Windsurf", "Cursor", "Trae", "Antigravity")
        $ide = $ideNames[$i % 4]
        $endpoint = $endpoints[$i % 3]
        
        $jobs += Start-Job -ScriptBlock ${function:Test-Endpoint} -ArgumentList $endpoint, $ide
    }
    
    # Esperar resultados
    $jobs | Wait-Job -Timeout 10 | Out-Null
    
    foreach ($job in $jobs) {
        $result = Receive-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        
        $results.totalRequests++
        if ($result.Success) {
            $results.successCount++
            $results.responseTimes += $result.Time
        } else {
            $results.failCount++
            if ($results.errors.Count -lt 5) {
                $results.errors += $result.Error
            }
        }
    }
    
    # Progreso cada 5 segundos
    if ([math]::Floor($sw.Elapsed.TotalSeconds) % 5 -eq 0) {
        $elapsed = [math]::Round($sw.Elapsed.TotalSeconds, 0)
        $rps = [math]::Round($results.totalRequests / $sw.Elapsed.TotalSeconds, 1)
        $successRate = if ($results.totalRequests -gt 0) { [math]::Round(($results.successCount / $results.totalRequests) * 100, 1) } else { 0 }
        Write-Host "[$elapsed s] Requests: $($results.totalRequests) | Éxito: $successRate% | RPS: $rps" -ForegroundColor Cyan
    }
    
    Start-Sleep -Milliseconds 100
}

$sw.Stop()

# Reporte final
Write-Host "`n=== RESULTADOS FINALES ===" -ForegroundColor Green
Write-Host "Total Requests: $($results.totalRequests)" -ForegroundColor White
Write-Host "Exitosas: $($results.successCount)" -ForegroundColor Green
Write-Host "Fallidas: $($results.failCount)" -ForegroundColor $(if ($results.failCount -gt 0) { "Red" } else { "Green" })

if ($results.responseTimes.Count -gt 0) {
    $avg = [math]::Round(($results.responseTimes | Measure-Object -Average).Average, 2)
    $min = [math]::Round(($results.responseTimes | Measure-Object -Minimum).Minimum, 2)
    $max = [math]::Round(($results.responseTimes | Measure-Object -Maximum).Maximum, 2)
    Write-Host "`nTiempos de respuesta (ms):" -ForegroundColor Gray
    Write-Host "  Promedio: $avg | Mín: $min | Máx: $max" -ForegroundColor Gray
}

if ($results.errors.Count -gt 0) {
    Write-Host "`nErrores encontrados:" -ForegroundColor Red
    $results.errors | Select-Object -First 3 | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

$successRate = if ($results.totalRequests -gt 0) { ($results.successCount / $results.totalRequests) * 100 } else { 0 }
if ($successRate -ge 95) {
    Write-Host "`n✅ SISTEMA MCP ESTABLE BAJO CARGA MULTI-IDE" -ForegroundColor Green
} elseif ($successRate -ge 80) {
    Write-Host "`n⚠️ SISTEMA MCP DEGRADADO BAJO CARGA" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ SISTEMA MCP FALLANDO BAJO CARGA" -ForegroundColor Red
}

# Guardar resultados
$results.timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$results | ConvertTo-Json -Depth 3 | Out-File "c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\logs\mcp_stress_test_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
Write-Host "`n📄 Reporte guardado en logs\mcp_stress_test_*.json" -ForegroundColor Gray
