@echo off
chcp 65001 >nul
REM ============================================
REM Detener MCP Health Monitor
REM ============================================

title Detener MCP Monitor

echo.
echo ============================================
echo   Deteniendo MCP Health Monitor
echo ============================================
echo.

echo Buscando procesos del monitor...
echo.

REM Buscar y matar procesos python que ejecutan el monitor
tasklist /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq MCP Monitor" 2>nul | find "python.exe" >nul
if %errorlevel% equ 0 (
    echo Encontrado proceso python con titulo "MCP Monitor"
    taskkill /F /FI "WINDOWTITLE eq MCP Monitor" >nul 2>&1
    echo [OK] Proceso detenido
) else (
    REM Intentar buscar por nombre de ventana
    taskkill /F /IM pythonw.exe >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Proceso pythonw.exe detenido
    ) else (
        echo [INFO] No se encontraron procesos activos del monitor
    )
)

REM También limpiar cualquier proceso MCP huérfano
echo.
echo Limpiando procesos MCP residuales...
taskkill /F /IM mcp-lightning-proxy-v3.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Proceso MCP detenido
)

echo.
echo ============================================
echo   Monitor detenido
echo ============================================
echo.
pause
