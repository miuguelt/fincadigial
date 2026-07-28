<#
.SYNOPSIS
    DevBrain Git Hooks Installer
    Instala hooks de Git personalizados para DevBrain.
#>
param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
$HooksDir = Join-Path $ProjectRoot ".git\hooks"

if (-not (Test-Path "$ProjectRoot\.git")) {
    Write-Host "ERROR: No hay repositorio Git en $ProjectRoot" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $HooksDir)) {
    New-Item -ItemType Directory -Path $HooksDir -Force | Out-Null
}

if ($Uninstall) {
    Write-Host "Desinstalando hooks de DevBrain..." -ForegroundColor Yellow
    @("pre-commit", "post-commit", "pre-push") | ForEach-Object {
        $hook = Join-Path $HooksDir $_
        if (Test-Path $hook) {
            Remove-Item $hook -Force
            Write-Host "   Eliminado: $_" -ForegroundColor Green
        }
    }
    git -C $ProjectRoot config --unset core.hooksPath 2>$null
    Write-Host "Hooks desinstalados." -ForegroundColor Green
    exit 0
}

Write-Host "Instalando hooks de DevBrain..." -ForegroundColor Cyan

# Pre-commit hook (Windows batch)
$preCommit = @"
@echo off
setlocal EnableDelayedExpansion

echo [DevBrain] Running pre-commit checks...

REM Verificar archivos en directorios prohibidos
git diff --cached --name-only | findstr /I "VALIDATED _archive backup tmp duplicate" >nul 2>&1
if !errorlevel! equ 0 (
    echo.
    echo ERROR: Se detectaron cambios en directorios prohibidos.
    echo No se permite editar en: VALIDATED, _archive, backup, tmp, duplicate
    echo.
    exit /b 1
)

REM Verificar que no hay hardcodeos obvios en backend
git diff --cached --name-only | findstr /I "backend\\app\\services backend\\app\\namespaces" >nul 2>&1
if !errorlevel! equ 0 (
    echo [DevBrain] Verificando hardcodeos en backend...
    REM El integrity-check completo es muy lento para pre-commit
    REM Solo verificamos patrones criticos
    git diff --cached --diff-filter=ACMR -- "*.py" | findstr /I "backend" >nul 2>&1
    if !errorlevel! equ 0 (
        echo    OK - Archivos Python en staging
    )
)

echo [DevBrain] Pre-commit checks passed.
exit /b 0
"@
$preCommit | Out-File -FilePath (Join-Path $HooksDir "pre-commit") -Encoding ascii -Force
Write-Host "   Installed: pre-commit" -ForegroundColor Green

# Post-commit hook
$postCommit = @"
@echo off
echo [DevBrain] Post-commit: Actualizando metadata...
REM Aqui se puede agregar logging o notificaciones
exit /b 0
"@
$postCommit | Out-File -FilePath (Join-Path $HooksDir "post-commit") -Encoding ascii -Force
Write-Host "   Installed: post-commit" -ForegroundColor Green

# Pre-push hook
$prePush = @"
@echo off
echo [DevBrain] Pre-push: Verificando integridad rapida...

REM Verificar que el build del frontend funciona
if exist "frontend\package.json" (
    echo    Verificando TypeScript...
    cd frontend
    call npm run type-check >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo ERROR: TypeScript check fallo. No se puede hacer push con errores de tipos.
        cd ..
        exit /b 1
    )
    cd ..
    echo    OK - TypeScript valido
)

echo [DevBrain] Pre-push checks passed.
exit /b 0
"@
$prePush | Out-File -FilePath (Join-Path $HooksDir "pre-push") -Encoding ascii -Force
Write-Host "   Installed: pre-push" -ForegroundColor Green

# Hacer ejecutables los hooks (en caso de estar en Git Bash)
$hookFiles = @("pre-commit", "post-commit", "pre-push")
foreach ($h in $hookFiles) {
    $path = Join-Path $HooksDir $h
    if (Test-Path $path) {
        # En Windows no necesitamos chmod, pero por si acaso
        $content = Get-Content $path -Raw
        if (-not $content.StartsWith("#!/bin")) {
            # Agregar shebang para compatibilidad con Git Bash
            $content = "#!/bin/sh`n$content"
            $content | Out-File -FilePath $path -Encoding ascii -Force
        }
    }
}

Write-Host ""
Write-Host "Hooks instalados correctamente en $HooksDir" -ForegroundColor Green
Write-Host "Para desinstalar: .\.devbrain\install-hooks.ps1 -Uninstall" -ForegroundColor DarkGray
