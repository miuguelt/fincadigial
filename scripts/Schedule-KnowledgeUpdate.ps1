# Script para programar la actualización automática del "Cerebro" (Conocimiento Local)
# DevBrain AI Automation

$TaskName = "DevBrain_Cerebro_Update"
$ActionScript = "c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\index_local_knowledge.py"
$PythonExe = "c:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\BackFinca\venv_win\Scripts\python.exe"

# 1. Crear la acción (Ejecutar Python con el script de indexación)
$Action = New-ScheduledTaskAction -Execute $PythonExe -Argument $ActionScript

# 2. Crear el disparador (Diariamente a las 2:00 AM)
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

# 3. Configuraciones adicionales (Ejecutar con máxima prioridad y permitir ejecución si no hay corriente AC)
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# 4. Registrar la tarea (Sobrescribir si ya existe)
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName $TaskName -Description "Actualiza el índice semántico de conocimiento para la IA de DevBrain" -Settings $Settings -Force

Write-Host "✅ Tarea programada exitosamente: $TaskName"
Write-Host "📅 Frecuencia: Diaria a las 2:00 AM"
Write-Host "🚀 Ejecutable: $PythonExe"
