# Script maestro para ejecutar pruebas E2E de VillaLuz
# Ejecutar desde: C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz

param(
    [switch]$SkipBackendCheck,
    [switch]$SkipFrontendStart,
    [string]$TestPattern = "*"
)

# Configuración de rutas
$RootPath = $PSScriptRoot
if (-not $RootPath) { $RootPath = Get-Location }

$BackendPath = Join-Path $RootPath "backend"
$FrontendPath = Join-Path $RootPath "frontend"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  VILLALUZ - SISTEMA DE PRUEBAS E2E" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Rutas configuradas:" -ForegroundColor Gray
Write-Host "  Root: $RootPath" -ForegroundColor Gray
Write-Host "  Backend: $BackendPath" -ForegroundColor Gray
Write-Host "  Frontend: $FrontendPath" -ForegroundColor Gray
Write-Host ""

# Función para verificar backend
function Test-BackendRunning {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8181/api/v1/health" -Method GET -TimeoutSec 3
        return $response.success -eq $true
    } catch {
        return $false
    }
}

# Función para verificar frontend
function Test-FrontendRunning {
    try {
        # Intentar HTTPS primero
        $response = Invoke-RestMethod -Uri "https://localhost:3000" -Method GET -TimeoutSec 3 -SkipCertificateCheck
        return $true
    } catch {
        try {
            # Intentar HTTP como fallback
            $response = Invoke-RestMethod -Uri "http://localhost:3000" -Method GET -TimeoutSec 3
            return $true
        } catch {
            return $false
        }
    }
}

# Verificar backend
if (-not $SkipBackendCheck) {
    Write-Host "[1/5] Verificando backend..." -ForegroundColor Yellow
    if (Test-BackendRunning) {
        Write-Host "  ✅ Backend corriendo en localhost:8181" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Backend NO está disponible" -ForegroundColor Red
        Write-Host "" -ForegroundColor Yellow
        Write-Host "  Para iniciar el backend ejecuta:" -ForegroundColor White
        Write-Host "    cd backend" -ForegroundColor Cyan
        Write-Host "    python run.py" -ForegroundColor Cyan
        Write-Host ""
        $startBackend = Read-Host "  ¿Deseas intentar iniciar el backend automáticamente? (S/N)"
        if ($startBackend -eq 'S' -or $startBackend -eq 's') {
            Write-Host "  Iniciando backend..." -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-Command", "cd '$BackendPath'; python run.py" -WindowStyle Normal
            Write-Host "  Esperando 10 segundos para que el backend inicie..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
            if (Test-BackendRunning) {
                Write-Host "  ✅ Backend iniciado correctamente" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ El backend puede tardar más en iniciar" -ForegroundColor Yellow
                Read-Host "Presiona ENTER cuando el backend esté listo (verifica en la otra ventana)"
            }
        } else {
            exit 1
        }
    }
} else {
    Write-Host "[1/5] Verificación de backend omitida" -ForegroundColor Gray
}

# Verificar/iniciar frontend
Write-Host ""
Write-Host "[2/5] Verificando frontend..." -ForegroundColor Yellow
if (Test-FrontendRunning) {
    Write-Host "  ✅ Frontend corriendo en localhost:3000" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend NO está disponible" -ForegroundColor Red
    if (-not $SkipFrontendStart) {
        Write-Host "" -ForegroundColor Yellow
        Write-Host "  Para iniciar el frontend ejecuta:" -ForegroundColor White
        Write-Host "    cd frontend" -ForegroundColor Cyan
        Write-Host "    npm start" -ForegroundColor Cyan
        Write-Host ""
        $startFrontend = Read-Host "  ¿Deseas intentar iniciar el frontend automáticamente? (S/N)"
        if ($startFrontend -eq 'S' -or $startFrontend -eq 's') {
            Write-Host "  Iniciando frontend..." -ForegroundColor Yellow
            Start-Process powershell -ArgumentList "-Command", "cd '$FrontendPath'; npm start" -WindowStyle Normal
            Write-Host "  Esperando 15 segundos para que el frontend inicie..." -ForegroundColor Yellow
            Start-Sleep -Seconds 15
            if (Test-FrontendRunning) {
                Write-Host "  ✅ Frontend iniciado correctamente" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️ El frontend puede tardar más en iniciar" -ForegroundColor Yellow
                Read-Host "Presiona ENTER cuando el frontend esté listo (verifica en la otra ventana)"
            }
        } else {
            exit 1
        }
    }
}

# Verificar que estamos en el directorio correcto para pruebas
Write-Host ""
Write-Host "[3/5] Preparando entorno de pruebas..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $FrontendPath "playwright-tests"))) {
    Write-Host "  ❌ No se encontró directorio playwright-tests" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Directorio de pruebas encontrado" -ForegroundColor Green

# Cambiar al directorio del frontend
Set-Location -Path $FrontendPath
Write-Host "  ✅ Ubicación actual: $(Get-Location)" -ForegroundColor Green

# Verificar que playwright está instalado
Write-Host ""
Write-Host "[4/5] Verificando Playwright..." -ForegroundColor Yellow
$npxPath = Join-Path $FrontendPath "node_modules\.bin\npx.cmd"
if (Test-Path $npxPath) {
    Write-Host "  ✅ Playwright encontrado" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ Playwright no encontrado, instalando..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Error instalando dependencias" -ForegroundColor Red
        exit 1
    }
}

# Ejecutar pruebas
Write-Host ""
Write-Host "[5/5] Ejecutando pruebas E2E..." -ForegroundColor Yellow
Write-Host "  Patrón de pruebas: $TestPattern" -ForegroundColor Gray
Write-Host ""

# Construir comando según el patrón
$testCommand = "playwright test"
if ($TestPattern -ne "*") {
    $testCommand += " $TestPattern"
}
$testCommand += " --reporter=line"

Write-Host "  Comando: npx $testCommand" -ForegroundColor Gray
Write-Host ""

# Ejecutar
& npx $testCommand.Split(' ')

$exitCode = $LASTEXITCODE

# Reporte final
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  ✅ TODAS LAS PRUEBAS PASARON" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ ALGUNAS PRUEBAS FALLARON" -ForegroundColor Yellow
}
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver reporte detallado:" -ForegroundColor Gray
Write-Host "  npx playwright show-report" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $RootPath
