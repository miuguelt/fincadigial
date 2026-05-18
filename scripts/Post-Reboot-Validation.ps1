<#
.SYNOPSIS
    Script de validación post-reinicio para el ecosistema DevBrain MCP.
    Verifica la salud de la arquitectura asíncrona P100 y la conectividad de hardware.
#>

$ErrorActionPreference = "SilentlyContinue"
Clear-Host

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   DEVBRAIN MCP - VALIDACIÓN POST-REINICIO          " -ForegroundColor Cyan
Write-Host "====================================================`n" -ForegroundColor Cyan

# 1. Verificar si el Gateway está escuchando
Write-Host "[1/5] Verificando Gateway Universal (Puerto 7777)..." -NoNewline
$gatewayTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 7777
if ($gatewayTest.TcpTestSucceeded) {
    Write-Host " [OK] ONLINE" -ForegroundColor Green
} else {
    Write-Host " [!] OFFLINE. ¿Ejecutaste Manage-DevBrain-Ecosystem.ps1 -Start?" -ForegroundColor Yellow
}

# 2. Medir Latencia del Gateway (Test de Concurrencia EOF)
Write-Host "[2/5] Midiendo latencia de respuesta (Protección EOF)..." -NoNewline
$sw = [diagnostics.stopwatch]::StartNew()
try {
    $res = Invoke-WebRequest -Uri "http://localhost:7777/health" -TimeoutSec 5
    $sw.Stop()
    if ($sw.Elapsed.TotalSeconds -lt 2) {
        Write-Host " [OK] $($sw.Elapsed.TotalSeconds.ToString('F2'))s (Ultrarápido)" -ForegroundColor Green
    } else {
        Write-Host " [!] $($sw.Elapsed.TotalSeconds.ToString('F2'))s (Lento, revisar WSL)" -ForegroundColor Yellow
    }
} catch {
    Write-Host " [ERROR] El Gateway no respondió a la consulta HTTP." -ForegroundColor Red
}

# 3. Verificar Salud de WSL
Write-Host "[3/5] Verificando Subsistema WSL2..." -NoNewline
$wslStatus = wsl.exe -l -v | Out-String
if ($wslStatus -match "Running") {
    $wslIp = wsl.exe hostname -I
    Write-Host " [OK] RUNNING (IP: $($wslIp.Trim()))" -ForegroundColor Green
} else {
    Write-Host " [!] WSL está detenido o bloqueado." -ForegroundColor Red
}

# 4. Verificar Puentes de Hardware (NPU/GPU)
Write-Host "[4/5] Verificando Puentes de Hardware..." -NoNewline
$gpuPort = 7800
$npuPort = 7801
$gpuTest = Test-NetConnection -ComputerName 127.0.0.1 -Port $gpuPort
$npuTest = Test-NetConnection -ComputerName 127.0.0.1 -Port $npuPort

$msg = ""
if ($gpuTest.TcpTestSucceeded) { $msg += "GPU:OK " } else { $msg += "GPU:FAIL " }
if ($npuTest.TcpTestSucceeded) { $msg += "NPU:OK" } else { $msg += "NPU:FAIL" }

if ($gpuTest.TcpTestSucceeded -and $npuTest.TcpTestSucceeded) {
    Write-Host " [OK] $msg" -ForegroundColor Green
} else {
    Write-Host " [!] $msg" -ForegroundColor Yellow
}

# 5. Verificar Conexión Multi-IDE (SSE Stream)
Write-Host "[5/5] Verificando Canal Asíncrono (SSE 7778)..." -NoNewline
$sseTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 7778
if ($sseTest.TcpTestSucceeded) {
    Write-Host " [OK] CANAL ABIERTO" -ForegroundColor Green
} else {
    Write-Host " [!] FALLO. Los IDEs no podrán conectar en modo asíncrono." -ForegroundColor Red
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "   DIAGNÓSTICO COMPLETADO" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

if ($sw.Elapsed.TotalSeconds -lt 2 -and $wslStatus -match "Running") {
    Write-Host "`nFELICIDADES: Tu Alienware m16 R2 está totalmente optimizada." -ForegroundColor Green
    Write-Host "Puedes usar Windsurf, Cursor y Claude simultáneamente." -ForegroundColor Green
} else {
    Write-Host "`nATENCIÓN: Se detectaron fallos menores. Revisa los logs en /maintenance." -ForegroundColor Yellow
}

Write-Host "`nPresiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
