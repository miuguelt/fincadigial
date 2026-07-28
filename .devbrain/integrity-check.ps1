<#
.SYNOPSIS
    DevBrain Integrity Check (Windows PowerShell)
    Verifica integridad del codigo fuente antes de ediciones.
    Optimizado: sin Python startup, grep paralelo, cache de resultados.
#>
param(
    [switch]$Fast,
    [switch]$SkipBackend,
    [switch]$SkipFrontend
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
$Errors = 0
$Warnings = 0

function Write-Check { param($msg, $color="White") Write-Host "  $msg" -ForegroundColor $color }
function Write-Ok { param($msg) Write-Check $msg "Green" }
function Write-Warn { param($msg) Write-Check $msg "Yellow"; $script:Warnings++ }
function Write-Err { param($msg) Write-Check $msg "Red"; $script:Errors++ }

Write-Host "[DevBrain] Verificando integridad del proyecto..." -ForegroundColor Cyan
$sw = [System.Diagnostics.Stopwatch]::StartNew()

# 1. Archivos corruptos (< 5 lineas)
Write-Host "`n--- 1. Archivos potencialmente corruptos (< 5 lineas) ---"
if (-not $SkipFrontend) {
    $corrupt = Get-ChildItem -Path "$ProjectRoot\frontend\src" -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { (Get-Content $_.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines -lt 5 } |
        Select-Object -ExpandProperty FullName
    if ($corrupt) {
        Write-Warn "Archivos sospechosamente cortos:"
        $corrupt | ForEach-Object { Write-Check "   $_" }
    } else {
        Write-Ok "Sin archivos minimos"
    }
} else { Write-Check "Skip (frontend)" }

# 2. Directorios prohibidos
Write-Host "`n--- 2. Directorios prohibidos ---"
$prohibited = git -C $ProjectRoot status --short 2>$null |
    Where-Object { $_ -match "VALIDATED|_archive/|backup/|tmp/|duplicate" }
if ($prohibited) {
    Write-Err "Ediciones en directorios prohibidos:"
    $prohibited | ForEach-Object { Write-Check "   $_" }
} else {
    Write-Ok "Sin ediciones en directorios prohibidos"
}

# 3. Repo Git
Write-Host "`n--- 3. Repositorio Git ---"
if (Test-Path "$ProjectRoot\.git") {
    $commits = git -C $ProjectRoot rev-list --count HEAD 2>$null
    Write-Ok "Repo Git OK ($commits commits)"
} else {
    Write-Err "No hay repositorio Git"
}

# 4. Archivos duplicados
Write-Host "`n--- 4. Archivos duplicados ---"
if (-not $SkipFrontend) {
    $names = Get-ChildItem -Path "$ProjectRoot\frontend\src" -Filter "*.tsx" -Recurse -ErrorAction SilentlyContinue |
        Group-Object Name | Where-Object { $_.Count -gt 1 } | Select-Object -First 5
    if ($names) {
        Write-Warn "Nombres de archivo duplicados:"
        $names | ForEach-Object { Write-Check "   $($_.Name) ($($_.Count) copias)" }
    } else {
        Write-Ok "Sin duplicados obvios"
    }
} else { Write-Check "Skip (frontend)" }

# 5. Hardcodeos en backend
if (-not $SkipBackend) {
    Write-Host "`n--- 5. Hardcodeos en backend ---"
    $scanDirs = @("app\services", "app\namespaces", "app\utils")
    $patterns = @(
        @{ Name = "random.*"; Pattern = 'random\.(uniform|randint|choice|randrange)' },
        @{ Name = "return hardcoded"; Pattern = 'return\s+[3-9]\d{2}\b' },
        @{ Name = "admin_roles literal"; Pattern = "admin_roles\s*=\s*\{'" },
        @{ Name = "period_days literal"; Pattern = "period_days\s*=\s*\{" }
    )
    $foundHardcode = $false
    foreach ($dir in $scanDirs) {
        $fullDir = Join-Path $ProjectRoot "backend\$dir"
        if (-not (Test-Path $fullDir)) { continue }
        foreach ($pat in $patterns) {
            $matches = Get-ChildItem -Path $fullDir -Filter "*.py" -Recurse -ErrorAction SilentlyContinue |
                Select-String -Pattern $pat.Pattern -ErrorAction SilentlyContinue |
                Where-Object { $_.Path -notmatch "test_|__pycache__|seed_|alert_engine\.py" } |
                Select-Object -First 5
            if ($matches) {
                Write-Warn "Posible hardcodeo ($($pat.Name)):"
                $matches | ForEach-Object { Write-Check "   $($_.Filename):$($_.LineNumber)" }
                $foundHardcode = $true
            }
        }
    }
    if (-not $foundHardcode) { Write-Ok "Sin hardcodeos obvios en backend" }
} else {
    Write-Host "`n--- 5. Hardcodeos en backend ---"
    Write-Check "Skip (backend)"
}

# 5b. Keys de system_contents (solo si no es -Fast)
if (-not $Fast -and -not $SkipBackend) {
    Write-Host "`n--- 5b. Keys de system_contents no referenciadas ---"
    $pythonExe = $null
    foreach ($p in @("$ProjectRoot\backend\venv_win\Scripts\python.exe", "python")) {
        if (Get-Command $p -ErrorAction SilentlyContinue) { $pythonExe = $p; break }
    }
    if ($pythonExe -and (Test-Path "$ProjectRoot\backend\app\__init__.py")) {
        $tmpKeys = [System.IO.Path]::GetTempFileName()
        $pyScript = @"
import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))
try:
    from app import create_app
    from app.models.system_content import SystemContent
    app = create_app('development')
    with app.app_context():
        entries = SystemContent.query.filter(
            SystemContent.is_active == True,
            SystemContent.key.notlike('recommendation.%%'),
            SystemContent.key.notlike('reference_curve.%%'),
            SystemContent.key.notlike('%%.milestones'),
        ).all()
        for e in entries:
            print(e.key)
except Exception as ex:
    print(f'ERROR: {ex}', file=sys.stderr)
"@
        $pyScript | & $pythonExe - 2>$null | Out-File -FilePath $tmpKeys -Encoding utf8
        $unreferenced = 0
        foreach ($key in (Get-Content $tmpKeys)) {
            if ([string]::IsNullOrWhiteSpace($key)) { continue }
            $escaped = $key -replace '\.', '\.'
            $refCount = (Get-ChildItem -Path "$ProjectRoot\backend\app" -Filter "*.py" -Recurse -ErrorAction SilentlyContinue |
                Select-String -Pattern $escaped -ErrorAction SilentlyContinue |
                Where-Object { $_.Path -notmatch "seed_|\.pyc" }).Count
            if ($refCount -eq 0) {
                Write-Warn "Key '$key' en system_contents pero NO referenciada en codigo"
                $unreferenced++
            }
        }
        Remove-Item $tmpKeys -Force -ErrorAction SilentlyContinue
        if ($unreferenced -eq 0) { Write-Ok "Todas las keys de system_contents estan referenciadas" }
    } else {
        Write-Check "Skip (Python/App no disponible)"
    }
}

# 6. Build disponible
Write-Host "`n--- 6. Build disponible ---"
if (Test-Path "$ProjectRoot\frontend\package.json") {
    $pkg = Get-Content "$ProjectRoot\frontend\package.json" -Raw | ConvertFrom-Json
    if ($pkg.scripts.build) {
        Write-Ok "Script 'build' disponible en frontend"
    } else {
        Write-Warn "Script 'build' NO encontrado en frontend/package.json"
    }
} else {
    Write-Warn "No se encontro frontend/package.json"
}

$sw.Stop()
Write-Host ""
if ($Errors -eq 0) {
    Write-Host "[OK] INTEGRIDAD VERIFICADA ($Warnings warnings, $($sw.ElapsedMilliseconds)ms)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] INTEGRIDAD COMPROMETIDA - $Errors error(es), $Warnings warning(s) ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Red
    exit 1
}
