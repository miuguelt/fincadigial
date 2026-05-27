# ==============================================================================
# DEVBRAIN WSL MIRRORED NETWORK FIX
# ==============================================================================
# Este script soluciona el error 0x8007054f (CreateInstance/ConfigureNetworking)
# que ocurre en WSL cuando se usa networkingMode=mirrored.
# 
# Solución:
# 1. Fuerza el apagado de WSL.
# 2. Reinicia el Servicio de Red de Host (HNS) que gestiona los switches virtuales.
# 3. Desactiva el Inicio Rápido (Fast Startup) de Windows. El Inicio Rápido 
#    hiberna el kernel y corrompe el estado de HNS entre reinicios, siendo la 
#    causa principal de que WSL falle al arrancar.
# ==============================================================================

Write-Host "[DEVBRAIN] Reparando red Mirrored de WSL (Error 0x8007054f)..." -ForegroundColor Cyan

Write-Host "    -> Deteniendo máquinas virtuales de WSL..."
wsl --shutdown

Write-Host "    -> Reiniciando el Servicio de Red de Host (HNS)..."
Stop-Service hns -Force -ErrorAction SilentlyContinue
Start-Service hns -ErrorAction SilentlyContinue

Write-Host "    -> Asegurando servicio WinNAT..."
Start-Service winnat -ErrorAction SilentlyContinue

Write-Host "    -> Desactivando el Inicio Rápido (Fast Startup) en el Registro de Windows..."
# Deshabilitar Hiberboot (Fast Startup) previene la corrupción de HNS al reiniciar
REG ADD "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f | Out-Null

Write-Host "[DEVBRAIN] =====================================================" -ForegroundColor Cyan
Write-Host "[DEVBRAIN] REPARACIÓN DE WSL COMPLETADA." -ForegroundColor Green
Write-Host "[DEVBRAIN] Al desactivar el Inicio Rápido, este problema no debería" -ForegroundColor Green
Write-Host "[DEVBRAIN] volver a ocurrir al apagar y encender tu computadora." -ForegroundColor Green
Write-Host "[DEVBRAIN] Vuelve a ejecutar tu comando de inicio normal." -ForegroundColor Green
Write-Host "[DEVBRAIN] Esta ventana se cerrará en 5 segundos..." -ForegroundColor Cyan

Start-Sleep -Seconds 5
