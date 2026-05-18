# VILLALUZ - Ejecución de Pruebas E2E Chat
# PowerShell Script

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  VILLALUZ - EJECUCION DE PRUEBAS E2E CHAT" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el backend está corriendo
Write-Host "[1/4] Verificando backend..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8181/api/v1/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Backend funcionando correctamente" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend no esta disponible en localhost:8181" -ForegroundColor Red
    Write-Host "Por favor inicia el backend primero:" -ForegroundColor Yellow
    Write-Host "  cd BackFinca && python run.py" -ForegroundColor White
    exit 1
}

# Ir al directorio del frontend
Write-Host ""
Write-Host "[2/4] Cambiando a directorio VillaLuzFront..." -ForegroundColor Yellow
$frontendPath = "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\VillaLuzFront"

try {
    Set-Location -Path $frontendPath -ErrorAction Stop
    Write-Host "✅ En directorio: $(Get-Location)" -ForegroundColor Green
} catch {
    Write-Host "❌ No se pudo cambiar al directorio del frontend" -ForegroundColor Red
    exit 1
}

# Verificar que existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ No se encontro package.json en este directorio" -ForegroundColor Red
    exit 1
}
Write-Host "✅ package.json encontrado" -ForegroundColor Green

# Ejecutar pruebas de chat
Write-Host ""
Write-Host "[3/4] Ejecutando pruebas E2E de chat..." -ForegroundColor Yellow
Write-Host "Comando: npx playwright test chat-simple.spec.ts" -ForegroundColor Gray

$npxPath = Join-Path $PWD "node_modules\.bin\npx.cmd"
if (Test-Path $npxPath) {
    & $npxPath playwright test chat-simple.spec.ts --reporter=line
} else {
    npx playwright test chat-simple.spec.ts --reporter=line
}

$chatExitCode = $LASTEXITCODE

if ($chatExitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ Pruebas de chat completadas exitosamente" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ Algunas pruebas de chat fallaron (codigo: $chatExitCode)" -ForegroundColor Yellow
}

# Ejecutar pruebas de stress-optimization
Write-Host ""
Write-Host "[4/4] Ejecutando pruebas de stress-optimization..." -ForegroundColor Yellow
Write-Host "Comando: npx playwright test stress-optimization.spec.ts" -ForegroundColor Gray

if (Test-Path $npxPath) {
    & $npxPath playwright test stress-optimization.spec.ts --reporter=line
} else {
    npx playwright test stress-optimization.spec.ts --reporter=line
}

$stressExitCode = $LASTEXITCODE

if ($stressExitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ Pruebas de stress completadas exitosamente" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ Algunas pruebas de stress fallaron (codigo: $stressExitCode)" -ForegroundColor Yellow
}

# Reporte final
Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumen de resultados:" -ForegroundColor White
Write-Host "  - Chat tests: $(if ($chatExitCode -eq 0) {'PASS ✅'} else {'FAIL ❌'})" -ForegroundColor $(if ($chatExitCode -eq 0) {'Green'} else {'Red'})
Write-Host "  - Stress tests: $(if ($stressExitCode -eq 0) {'PASS ✅'} else {'FAIL ❌'})" -ForegroundColor $(if ($stressExitCode -eq 0) {'Green'} else {'Red'})
Write-Host ""
Write-Host "Para ver reporte detallado:" -ForegroundColor Yellow
Write-Host "  cd VillaLuzFront" -ForegroundColor White
Write-Host "  npx playwright show-report" -ForegroundColor White
Write-Host ""

# Pausa
Read-Host "Presiona ENTER para salir"
