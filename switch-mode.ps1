# ⚠️ DEPRECATED: Docker mode removed per DevBrain rule "NO ejecutar docker compose up para aplicaciones en desarrollo"
# Usa .\start-windows.ps1 en su lugar (modo nativo Windows con hot-reload).
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║  DEPRECATED — Modo Docker eliminado                     ║" -ForegroundColor Red
Write-Host "║                                                        ║" -ForegroundColor Red
Write-Host "║  Desarrollo: usa .\start-windows.ps1                    ║" -ForegroundColor Yellow
Write-Host "║  Producción: Coolify CI/CD automático                  ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Red
exit 1
