@echo off
chcp 65001 >nul
echo =====================================================
echo   VILLALUZ - EJECUCIÓN DE PRUEBAS E2E CHAT
echo =====================================================
echo.

REM Verificar que el backend está corriendo
echo [1/4] Verificando backend...
curl -s http://localhost:8181/api/v1/health >nul
if %errorlevel% neq 0 (
    echo ❌ Backend no está disponible en localhost:8181
    echo Por favor inicia el backend primero:
    echo   cd backend ^&^& python run.py
    pause
    exit /b 1
)
echo ✅ Backend funcionando correctamente

REM Ir al directorio del frontend
echo.
echo [2/4] Cambiando a directorio frontend...
cd /d "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\frontend"
if %errorlevel% neq 0 (
    echo ❌ No se pudo cambiar al directorio del frontend
    pause
    exit /b 1
)
echo ✅ En directorio: %CD%

REM Verificar que existe package.json
if not exist package.json (
    echo ❌ No se encontró package.json en este directorio
    pause
    exit /b 1
)
echo ✅ package.json encontrado

REM Ejecutar pruebas de chat
echo.
echo [3/4] Ejecutando pruebas E2E de chat...
npx playwright test chat-simple.spec.ts --reporter=line

if %errorlevel% equ 0 (
    echo.
    echo ✅ Pruebas de chat completadas exitosamente
) else (
    echo.
    echo ⚠️ Algunas pruebas fallaron (ver detalles arriba)
)

echo.
echo [4/4] Pruebas de stress-optimization...
npx playwright test stress-optimization.spec.ts --reporter=line

echo.
echo =====================================================
echo   PRUEBAS COMPLETADAS
echo =====================================================
echo.
echo Para ver reporte detallado:
echo   cd frontend
echo   npx playwright show-report
echo.
pause
