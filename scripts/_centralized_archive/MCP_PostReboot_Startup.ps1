# MCP DevBrain - Inicio post-reinicio automático
# Generado: 04/28/2026 13:12:14

Write-Host "Iniciando MCP DevBrain despues de reinicio..." -ForegroundColor Cyan

& "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\MCP_AutoRecovery_Service.ps1" -Start

# Verificar estado
Start-Sleep -Seconds 5
& "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\MCP_AutoRecovery_Service.ps1" -Status

Write-Host "
Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
