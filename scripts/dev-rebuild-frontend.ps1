<#
.SYNOPSIS
    ⚠️ DEPRECATED — Frontend native via Vite dev server (start-windows.ps1)
    
.DESCRIPTION
    Este script usaba Docker para rebuild del frontend.
    Ahora el frontend corre nativo via Vite (npm run dev) con HMR instantáneo.
    
    Para desarrollo: solo guarda el archivo → hot-reload automático.
    Para builds de producción: npm run build en frontend/.
#>
param(
    [switch]$Quick,       # Solo restart del contenedor, sin rebuild
    [switch]$TypeCheck,   # Ejecutar type-check antes de build
    [switch]$Follow,      # Seguir logs después de levantar
    [switch]$Force        # Bypass del lock check (emergencias)
)

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║  DEPRECATED                                                    ║
║  El frontend ahora corre nativo con Vite (npm run dev)         ║
║  en .\start-windows.ps1 — HMR instantáneo al guardar archivos  ║
╚══════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Red
exit 1
