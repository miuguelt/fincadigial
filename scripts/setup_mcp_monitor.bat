@echo off
chcp 65001 >nul
REM ============================================
REM MCP Health Monitor v2 - Setup Script
REM Configura e inicia el monitor de salud MCP
REM ============================================

title MCP Health Monitor Setup

echo.
echo ============================================
echo   MCP Health Monitor v2 - Anti-Zombie
echo ============================================
echo.

REM Verificar Python
echo [1/5] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no está instalado o no está en PATH
    echo Instala Python desde: https://python.org
    pause
    exit /b 1
)
echo       OK: Python detectado

REM Verificar psutil
echo.
echo [2/5] Verificando dependencias...
python -c "import psutil" >nul 2>&1
if %errorlevel% neq 0 (
    echo       Instalando psutil...
    pip install psutil
    if %errorlevel% neq 0 (
        echo [ERROR] No se pudo instalar psutil
        pause
        exit /b 1
    )
)
echo       OK: psutil instalado

REM Crear directorio de logs
echo.
echo [3/5] Preparando directorio de logs...
if not exist "..\logs" mkdir "..\logs"
echo       OK: Directorio logs creado

REM Verificar configuración MCP
echo.
echo [4/5] Buscando configuración MCP...
set "CONFIG_PATH="

if exist "%USERPROFILE%\.windsurf\mcp_config.json" (
    set "CONFIG_PATH=%USERPROFILE%\.windsurf\mcp_config.json"
)
if exist "%USERPROFILE%\.cursor\mcp_config.json" (
    set "CONFIG_PATH=%USERPROFILE%\.cursor\mcp_config.json"
)
if exist "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp\mcp_config_optimized.json" (
    set "CONFIG_PATH=C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp\mcp_config_optimized.json"
)

if "%CONFIG_PATH%"=="" (
    echo [WARN] No se encontró configuración MCP
    echo       El monitor usará detección automática
) else (
    echo       OK: Configuración encontrada
    echo       %CONFIG_PATH%
)

REM Limpiar procesos huérfanos existentes
echo.
echo [5/5] Limpiando procesos MCP huérfanos...
taskkill /F /IM mcp-lightning-proxy-v3.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo       Procesos anteriores eliminados
) else (
    echo       No había procesos huérfanos
)

echo.
echo ============================================
echo   Setup completado exitosamente!
echo ============================================
echo.

REM Iniciar monitor
echo Iniciando MCP Health Monitor v2...
echo Presiona Ctrl+C para detener
echo.
echo Los logs se guardan en: logs\mcp_monitor_v2.log
echo.

if "%CONFIG_PATH%"=="" (
    python mcp_health_monitor_v2.py --interval 30
) else (
    python mcp_health_monitor_v2.py --config "%CONFIG_PATH%" --interval 30
)

echo.
echo Monitor detenido.
pause
