@echo off
chcp 65001 >nul
REM ============================================
REM MCP Health Monitor - Ejecución Estable
REM ============================================

echo.
echo ============================================
echo   MCP Health Monitor v2 - Estable
echo ============================================
echo.
echo Este script inicia el monitor en modo ESTABLE.
echo El monitor se mantendra corriendo indefinidamente.
echo.
echo Para detenerlo mas tarde, ejecuta:
echo   stop_mcp_monitor.bat
echo.
echo ============================================
echo.

REM Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no encontrado
    pause
    exit /b 1
)

REM Crear logs directory
if not exist "..\logs" mkdir "..\logs"

echo [OK] Iniciando monitor en modo background estable...
echo.

REM Iniciar con START /B para que no bloquee pero sea visible
REM Usamos python (no pythonw) para mejor estabilidad
REM Redirigimos output a los archivos de log

start "MCP Health Monitor v2" /B python "mcp_health_monitor_v2.py" --config "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp\mcp_config_optimized.json" --interval 30 >> "..\logs\mcp_monitor_v2.log" 2>&1

timeout /t 2 /nobreak >nul

echo [OK] Monitor iniciado!
echo.
echo Verificando estado...
echo.

REM Verificar que el proceso existe
tasklist /FI "WINDOWTITLE eq MCP Health Monitor v2" /FO CSV 2>nul | findstr "python" >nul
if %errorlevel% equ 0 (
    echo [OK] Proceso confirmado en ejecucion
    echo.
    echo Logs en tiempo real:
    echo   logs\mcp_monitor_v2.log
    echo.
    echo Para ver logs en vivo:
    echo   powershell -Command "Get-Content logs\mcp_monitor_v2.log -Wait"
    echo.
    echo ============================================
    echo   Monitor corriendo ESTABLE
    echo   Puedes cerrar esta ventana
    echo ============================================
) else (
    echo [WARN] No se pudo confirmar el proceso
    echo Revisa los logs para mas detalles
)

echo.
timeout /t 3 >nul
