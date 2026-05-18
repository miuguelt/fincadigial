# Requires -RunAsAdministrator
# Fix-Alienware-Audio-Chirping.ps1
# Diagnóstico y Reparación de Chirridos en Audio para Alienware m16 R2

Write-Host "--- DIAGNÓSTICO DE AUDIO ALIENWARE ---" -ForegroundColor Cyan

# 1. Identificar IntelliGo
$igoTask = Get-ScheduledTask -TaskName "iGoAudioTaskSession" -ErrorAction SilentlyContinue
if ($igoTask) {
    Write-Host "[!] Detectada tarea de IntelliGo AI Noise Reduction." -ForegroundColor Yellow
    Write-Host "[+] Deteniendo tarea para prueba de silencio..." -NoNewline
    Stop-ScheduledTask -TaskName "iGoAudioTaskSession" -ErrorAction SilentlyContinue
    Disable-ScheduledTask -TaskName "iGoAudioTaskSession" -ErrorAction SilentlyContinue
    Write-Host " [DESACTIVADA]" -ForegroundColor Green
}

# 2. Reiniciar Motor de Audio (audiodg)
Write-Host "[+] Reiniciando motor de aislamiento de audio (audiodg)..." -NoNewline
Get-Process audiodg -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host " [REINICIADO]" -ForegroundColor Green

# 3. Verificar Servicios de Soporte Realtek
$services = @("RtkAudioService")
foreach ($srv in $services) {
    $s = Get-Service -Name $srv -ErrorAction SilentlyContinue
    if ($s) {
        Write-Host "[+] Reiniciando $srv..." -NoNewline
        Restart-Service -Name $srv -Force -ErrorAction SilentlyContinue
        Write-Host " [OK]" -ForegroundColor Green
    }
}

Write-Host "`n--- REPARACIÓN SUGERIDA COMPLETADA ---" -ForegroundColor Cyan
Write-Host "Si el chirrido persiste, sigue estos pasos manuales:" -ForegroundColor White
Write-Host "1. Abre la aplicación 'IntelliGo Neptune'."
Write-Host "2. En la sección de Altavoces, desactiva 'AI Noise Reduction'."
Write-Host "3. En AWCC, verifica que el perfil de audio sea 'Alienware' o 'Flat'."

Write-Log "Se aplicó corrección de emergencia para chirrido de audio Alienware m16 R2." "Success"
