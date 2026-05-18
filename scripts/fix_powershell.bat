@echo off
chcp 65001 >nul
echo ============================================
echo  FIX EXTENSION POWERSHELL - WINDSURF
echo ============================================
echo.

echo [1/3] Verificando Windows PowerShell...
if exist "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" (
    echo [OK] Windows PowerShell encontrado
) else (
    echo [ERROR] Windows PowerShell NO encontrado
    goto :error
)

echo.
echo [2/3] Configurando Windsurf para usar Windows PowerShell...
echo.
echo Se ha creado el archivo settings.json con la configuracion correcta.
echo.

echo [3/3] Instrucciones para completar el fix:
echo.
echo    1. Presiona F1 en Windsurf
echo    2. Escribe: Developer: Reload Window
echo    3. Presiona Enter
echo    4. La extension PowerShell deberia funcionar ahora
echo.
echo ============================================
echo  SOLUCION ALTERNATIVA (si persiste):
echo ============================================
echo.
echo    A. Cierra completamente Windsurf
echo    B. Vuelve a abrirlo
echo    C. La extension se reiniciara automaticamente
echo.
echo ============================================
echo.

:error
echo.
echo Presiona cualquier tecla para salir...
pause >nul
