<#
.SYNOPSIS
    DevBrain Session End Protocol (Windows PowerShell)
    Protocolo de cierre de sesion de agente DevBrain.
#>
param(
    [switch]$SkipBuild,
    [switch]$SkipIntegrity
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  DevBrain Session End Protocol" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verificar archivos sin commitear
$uncommitted = git status --short 2>$null
if ($uncommitted) {
    Write-Host "`n[1/5] Archivos sin commit detectados:" -ForegroundColor Yellow
    Write-Host $uncommitted
    Write-Host "   No se hará commit automático. Revisa y confirma manualmente." -ForegroundColor Yellow
} else {
    Write-Host "`n[1/5] Sin archivos pendientes" -ForegroundColor Green
}

# 2. Verificar health del backend
Write-Host "`n[2/5] Verificando health del backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8092/api/v1/health/" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "   Backend saludable (HTTP $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "   Backend no responde correctamente (HTTP $($response.StatusCode))" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   Backend no responde - verificar backend/.env y puertos" -ForegroundColor Yellow
}

# 3. Verificar build del frontend
if (-not $SkipBuild -and (Test-Path "$ProjectRoot\frontend\package.json")) {
    Write-Host "`n[3/5] Verificando build del frontend..." -ForegroundColor Yellow
    Push-Location "$ProjectRoot\frontend"
    try {
        $buildOut = npm run build 2>&1 | Select-Object -Last 5
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   Build exitoso" -ForegroundColor Green
            $buildOut | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
        } else {
            Write-Host "   Build fallo o no disponible" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   Build no disponible" -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "`n[3/5] Skip build check" -ForegroundColor DarkGray
}

# 4. Verificar integridad
if (-not $SkipIntegrity) {
    Write-Host "`n[4/5] Verificando integridad..." -ForegroundColor Yellow
    & "$PSScriptRoot\integrity-check.ps1" -Fast
} else {
    Write-Host "`n[4/5] Skip integrity check" -ForegroundColor DarkGray
}

# 5. Recordatorios finales
Write-Host "`n[5/5] Si agregaste funcionalidad critica:" -ForegroundColor Yellow
Write-Host "   - Actualiza FEATURE_MANIFEST.md" -ForegroundColor White
Write-Host "   - Agrega header COMPONENTE CRITICO al archivo" -ForegroundColor White
Write-Host ""
Write-Host "   Si aprendiste algo nuevo, registralo en:" -ForegroundColor White
Write-Host "      .devbrain\knowledge\lessons_learned.md" -ForegroundColor DarkGray

# 6. No crear tags automáticos: el historial debe ser una decisión humana.
Write-Host "`n   No se creó tag automático." -ForegroundColor DarkGray

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Protocolo de cierre completado." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
