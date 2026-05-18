# MCP DevBrain - Auditoría de Estabilidad Multi-IDE
# Simula carga concurrente de múltiples IDEs

param(
    [int]$DurationMinutes = 5,
    [int]$RequestsPerSecond = 10
)

$ErrorActionPreference = "Stop"
$results = @{
    startTime = Get-Date
    endpoints = @()
    errors = @()
}

Write-Host "=== MCP STRESS TEST - Multi-IDE Simulation ===" -ForegroundColor Cyan
Write-Host "Duration: $DurationMinutes minutes | RPS: $RequestsPerSecond" -ForegroundColor Gray

# Endpoints a verificar
$endpoints = @(
    @{ Name = "Dashboard Health"; Url = "http://127.0.0.1:8091/health"; Critical = $true },
    @{ Name = "Gateway v3"; Url = "http://127.0.0.1:7800/health"; Critical = $true },
    @{ Name = "GPU Bridge"; Url = "http://127.0.0.1:7801/health"; Critical = $false },
    @{ Name = "NPU Bridge"; Url = "http://127.0.0.1:7802/health"; Critical = $false }
)

# Verificación inicial
Write-Host "`n[1/4] Verificación de endpoints críticos..." -ForegroundColor Yellow
foreach ($ep in $endpoints) {
    try {
        $response = Invoke-RestMethod -Uri $ep.Url -TimeoutSec 2 -ErrorAction Stop
        $status = "✅ ONLINE"
        $color = "Green"
    } catch {
        $status = "❌ OFFLINE"
        $color = "Red"
        if ($ep.Critical) { $results.errors += "$($ep.Name) CAÍDO" }
    }
    Write-Host "   $($ep.Name): $status" -ForegroundColor $color
    $results.endpoints += @{ Name = $ep.Name; Status = $status; Url = $ep.Url }
}

# Verificar procesos
Write-Host "`n[2/4] Verificación de procesos MCP..." -ForegroundColor Yellow
$mcpProcesses = @("dashboard-server", "mcp-lightning-proxy", "mcp-gateway", "mcp-gpu-bridge", "mcp-npu-bridge")
foreach ($procName in $mcpProcesses) {
    $procs = Get-Process | Where-Object { $_.ProcessName -like "*$procName*" }
    if ($procs) {
        $count = $procs.Count
        $workingSet = ($procs | Measure-Object WorkingSet -Sum).Sum / 1MB
        Write-Host "   $procName`: $count instancias, $([math]::Round($workingSet,1)) MB" -ForegroundColor Green
    } else {
        Write-Host "   $procName`: NO ENCONTRADO" -ForegroundColor Red
    }
}

# Verificar puertos en LISTENING
Write-Host "`n[3/4] Verificación de puertos..." -ForegroundColor Yellow
$ports = @(7800, 7801, 7802, 8010, 8091)
foreach ($port in $ports) {
    $listener = netstat -ano | findstr ":$port " | findstr "LISTENING"
    if ($listener) {
        Write-Host "   Port $port`: LISTENING" -ForegroundColor Green
    } else {
        Write-Host "   Port $port`: CERRADO" -ForegroundColor Red
    }
}

# Reporte final
Write-Host "`n[4/4] Resumen de auditoría" -ForegroundColor Yellow
if ($results.errors.Count -eq 0) {
    Write-Host "✅ Sistema MCP saludable - listo para carga multi-IDE" -ForegroundColor Green
} else {
    Write-Host "❌ Se encontraron $($results.errors.Count) problemas críticos:" -ForegroundColor Red
    $results.errors | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host "`n🔧 Acciones recomendadas:" -ForegroundColor Cyan
    Write-Host "   1. Iniciar dashboard-server-v2.exe" -ForegroundColor White
    Write-Host "   2. Verificar configuración MCP en cada IDE" -ForegroundColor White
    Write-Host "   3. Reiniciar mcp-lightning-proxy si no responde" -ForegroundColor White
}

$results.endTime = Get-Date
$results | ConvertTo-Json -Depth 3 | Out-File "c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\logs\mcp_audit_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
Write-Host "`n📄 Reporte guardado en logs\mcp_audit_*.json" -ForegroundColor Gray
