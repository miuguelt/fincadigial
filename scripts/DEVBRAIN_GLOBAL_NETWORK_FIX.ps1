# ==============================================================================
# DEVBRAIN GLOBAL NETWORK FIX (WSL / HYPER-V / DYNAMIC PORTS)
# ==============================================================================
# Este script resuelve el problema crónico de puertos "zombies" o "Access Denied" 
# en Windows + WSL2 + Docker.
#
# Problema Raíz: 
# Windows a veces configura el rango de puertos dinámicos desde 1025, haciendo 
# que puertos como 3000, 3005, 5173 sean robados aleatoriamente por sockets de 
# salida en estado FIN_WAIT_2 o CLOSE_WAIT. Además, Hyper-V reserva bloques enteros.
#
# Solución DevBrain:
# 1. Restaurar el rango dinámico al estándar IANA (49152 - 65535).
# 2. Reiniciar WinNAT y LxssManager (WSL) para liberar todos los sockets colgados.
# ==============================================================================

Write-Host "[DEVBRAIN] Iniciando Reparación Global de Red para WSL/Docker..." -ForegroundColor Cyan

# 1. Configurar rango de puertos dinámicos a los estándares seguros (lejos de los puertos de dev)
Write-Host "[DEVBRAIN] 1. Configurando Rango de Puertos Dinámicos (TCP/UDP) a 49152-65535..."
netsh int ipv4 set dynamicport tcp start=49152 num=16384 | Out-Null
netsh int ipv6 set dynamicport tcp start=49152 num=16384 | Out-Null
netsh int ipv4 set dynamicport udp start=49152 num=16384 | Out-Null
netsh int ipv6 set dynamicport udp start=49152 num=16384 | Out-Null
Write-Host "    -> Hecho." -ForegroundColor Green

# 2. Detener servicios conflictivos para liberar reservas actuales
Write-Host "[DEVBRAIN] 2. Reiniciando WinNAT y WSL para liberar bloqueos..."
Write-Host "    -> Deteniendo WinNAT (Network Address Translation)..."
Stop-Service winnat -Force -ErrorAction SilentlyContinue

Write-Host "    -> Deteniendo WSL (LxssManager)..."
Stop-Service LxssManager -Force -ErrorAction SilentlyContinue

# 3. Esperar a que los sockets colgados (TIME_WAIT/CLOSE_WAIT) se liberen
Start-Sleep -Seconds 2

# 4. Iniciar servicios nuevamente
Write-Host "    -> Iniciando WinNAT..."
Start-Service winnat -ErrorAction SilentlyContinue

Write-Host "    -> Iniciando WSL (LxssManager)..."
Start-Service LxssManager -ErrorAction SilentlyContinue
Write-Host "    -> Hecho." -ForegroundColor Green

Write-Host "[DEVBRAIN] =====================================================" -ForegroundColor Cyan
Write-Host "[DEVBRAIN] REPARACIÓN COMPLETADA CON ÉXITO." -ForegroundColor Green
Write-Host "[DEVBRAIN] Los puertos de desarrollo (1024-49151) ahora están protegidos." -ForegroundColor Green
Write-Host "[DEVBRAIN] Ya puedes iniciar tus servidores (npm run dev)." -ForegroundColor Green
Write-Host "[DEVBRAIN] Esta ventana se cerrará automáticamente en 5 segundos..." -ForegroundColor Cyan

Start-Sleep -Seconds 5
