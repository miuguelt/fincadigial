# Fix PowerShell Extension - Reinicio completo de Windsurf
# Este script arregla la extensión PowerShell cuando falla con exit code 15

Write-Host "=== FIX EXTENSION POWERSHELL - WINDSURF ===" -ForegroundColor Cyan
Write-Host ""

# 1. Matar procesos de Windsurf zombie
Write-Host "[1/4] Limpiando procesos residuales..." -ForegroundColor Yellow
$processes = @("windsurf", "node", "mcp-lightning-proxy", "devbrain")
foreach ($proc in $processes) {
    Get-Process -Name $proc -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "  - Detenido: $proc" -ForegroundColor Gray
}

# 2. Verificar que Windows PowerShell existe
Write-Host ""
Write-Host "[2/4] Verificando Windows PowerShell..." -ForegroundColor Yellow
$psPath = "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
if (Test-Path $psPath) {
    Write-Host "  [OK] Windows PowerShell encontrado: $psPath" -ForegroundColor Green
    & $psPath -Command "Write-Host '  [OK] PowerShell funciona correctamente' -ForegroundColor Green"
} else {
    Write-Host "  [ERROR] Windows PowerShell NO encontrado" -ForegroundColor Red
}

# 3. Verificar configuración
Write-Host ""
Write-Host "[3/4] Verificando configuración..." -ForegroundColor Yellow
$settingsPath = "$env:USERPROFILE\.windsurf\settings.json"
if (Test-Path $settingsPath) {
    Write-Host "  [OK] settings.json existe" -ForegroundColor Green
    $settings = Get-Content $settingsPath | ConvertFrom-Json
    Write-Host "  - Perfil terminal: $($settings.'terminal.integrated.defaultProfile.windows')" -ForegroundColor Gray
} else {
    Write-Host "  [X] settings.json NO existe" -ForegroundColor Red
}

# 4. Instrucciones finales
Write-Host ""
Write-Host "[4/4] ACCIONES REQUERIDAS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Cierra completamente Windsurf (Ctrl+Shift+P -> 'Reload Window')" -ForegroundColor White
Write-Host "  2. O presiona F1 y escribe 'Developer: Reload Window'" -ForegroundColor White
Write-Host "  3. Si persiste, cierra Windsurf y vuelve a abrirlo" -ForegroundColor White
Write-Host ""
Write-Host "=== FIX COMPLETADO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
