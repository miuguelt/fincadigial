<#
.SYNOPSIS
    DevBrain Session Start Protocol (Windows PowerShell)
    Protocolo de inicio de sesion de agente DevBrain.
#>
param(
    [switch]$SkipIntegrity,
    [switch]$Fast
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DevBrain Session Start Protocol" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verificar directorio prohibido
$CWD = Get-Location
if ($CWD.Path -match "VALIDATED|backup|archive|tmp|duplicate") {
    Write-Host "FATAL: Estás en un directorio prohibido: $CWD" -ForegroundColor Red
    Write-Host "   Debes estar en: villaluz/" -ForegroundColor Red
    exit 1
}

# 2. Verificar repo git
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    Write-Host "Repositorio Git inicializado; no se creará un commit automático." -ForegroundColor Yellow
}

# 3. Mostrar estado actual sin modificar staging ni historial
Write-Host "`n[1/5] Estado actual del repositorio..." -ForegroundColor Yellow
git status --short
Write-Host "   No se creó commit ni tag automático." -ForegroundColor DarkGray

# 4. Verificar integridad (version PowerShell optimizada)
if (-not $SkipIntegrity) {
    Write-Host "`n[2/5] Verificando integridad..." -ForegroundColor Yellow
    $intArgs = @()
    if ($Fast) { $intArgs += "-Fast" }
    & "$PSScriptRoot\integrity-check.ps1" @intArgs
} else {
    Write-Host "`n[2/5] Skip integrity check" -ForegroundColor DarkGray
}

# 5. Mostrar archivos criticos
Write-Host "`n[3/5] Archivos criticos activos:" -ForegroundColor Yellow
$criticalFiles = @(
    "frontend\src\shared\types\crud.ts",
    "frontend\src\widgets\admin-crud\ui"
)
foreach ($f in $criticalFiles) {
    $full = Join-Path $ProjectRoot $f
    if (Test-Path $full) {
        Write-Host "   [CRITICO] $f" -ForegroundColor DarkYellow
    }
}

# 6. Cargar lecciones aprendidas
Write-Host "`n[4/5] Cargando lecciones aprendidas..." -ForegroundColor Yellow
$lessons = Join-Path $PSScriptRoot "knowledge\lessons_learned.md"
if (Test-Path $lessons) {
    $ruleCount = (Select-String -Path $lessons -Pattern "^-" -ErrorAction SilentlyContinue).Count
    Write-Host "   Lecciones encontradas: $ruleCount reglas activas" -ForegroundColor Green
    Write-Host "   REGLA #1: PostgreSQL es la Unica Fuente de Verdad" -ForegroundColor Yellow
    Write-Host "   Toda configuracion en system_contents, no hardcodeada" -ForegroundColor Yellow
} else {
    Write-Host "   No se encontro $lessons" -ForegroundColor Yellow
}

# 7. Recordatorios
Write-Host "`n[5/5] Recordatorios:" -ForegroundColor Yellow
Write-Host "   - Solo editar en frontend/src/" -ForegroundColor White
Write-Host "   - Nunca crear carpetas duplicadas" -ForegroundColor White
Write-Host "   - Un cambio = un commit" -ForegroundColor White
Write-Host "   - Verificar build antes de terminar" -ForegroundColor White
Write-Host "   - PostgreSQL = Unica Fuente de Verdad" -ForegroundColor White
Write-Host "   - Actualizar FEATURE_MANIFEST.md si agregas funcionalidad critica" -ForegroundColor White

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Protocolo de inicio completado." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
