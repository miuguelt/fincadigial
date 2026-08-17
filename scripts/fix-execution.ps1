# Script de corrección para ejecución de comandos
# Este script soluciona el problema de directorios

param(
    [string]$Action = "test"
)

$rootPath = "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz"
$backendPath = Join-Path $rootPath "backend"
$frontendPath = Join-Path $rootPath "frontend"

function Test-Backend {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8181/api/v1/health" -Method GET -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

function Start-Backend {
    Write-Host "Iniciando backend..." -ForegroundColor Yellow
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "python"
    $psi.Arguments = "run.py"
    $psi.WorkingDirectory = $backendPath
    $psi.UseShellExecute = $true
    $psi.CreateNoWindow = $false
    [System.Diagnostics.Process]::Start($psi) | Out-Null

    # Esperar a que inicie
    $attempts = 0
    while (-not (Test-Backend) -and $attempts -lt 30) {
        Start-Sleep -Seconds 1
        $attempts++
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
    Write-Host ""

    if (Test-Backend) {
        Write-Host "✅ Backend iniciado correctamente" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ No se pudo iniciar el backend" -ForegroundColor Red
        return $false
    }
}

function Run-Tests {
    Set-Location -Path $frontendPath

    Write-Host "Ejecutando pruebas de chat..." -ForegroundColor Cyan
    & npx playwright test chat-simple.spec.ts --reporter=line

    Write-Host "`nEjecutando pruebas de stress..." -ForegroundColor Cyan
    & npx playwright test stress-optimization.spec.ts --reporter=line
}

# Main execution
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  CORRECCION DE EJECUCION DE PRUEBAS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Backend)) {
    Write-Host "Backend no detectado. Iniciando..." -ForegroundColor Yellow
    $backendStarted = Start-Backend
    if (-not $backendStarted) {
        exit 1
    }
} else {
    Write-Host "✅ Backend ya está corriendo" -ForegroundColor Green
}

Run-Tests

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
