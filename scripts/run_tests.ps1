<#
.SYNOPSIS
    Script de ejecución de tests para VillaLuz (Windows / PowerShell).

.DESCRIPTION
    Corre la suite completa de tests en orden:
      1. Tests de integración del backend (pytest)
      2. Tests unitarios del frontend (Vitest)
      3. Tests E2E (Playwright)

.PARAMETER Layer
    Capa a correr: 'backend', 'frontend', 'e2e', o 'all' (default).

.PARAMETER Coverage
    Si se especifica, genera reporte de cobertura.

.PARAMETER Headed
    Si se especifica, corre Playwright en modo headed (con browser visible).

.PARAMETER Verbose
    Si se especifica, activa output verboso en pytest.

.EXAMPLE
    # Correr solo el backend
    .\scripts\run_tests.ps1 -Layer backend

    # Correr todo con cobertura
    .\scripts\run_tests.ps1 -Layer all -Coverage

    # Correr E2E con browser visible (para depuración)
    .\scripts\run_tests.ps1 -Layer e2e -Headed
#>

param(
    [ValidateSet('backend', 'frontend', 'e2e', 'all')]
    [string]$Layer = 'all',

    [switch]$Coverage,
    [switch]$Headed,
    [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ------------------------------------------------------------------ Helpers
$script:PassCount = 0
$script:FailCount = 0

function Write-Header([string]$Title) {
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
}

function Write-Success([string]$Msg) {
    Write-Host "✅ $Msg" -ForegroundColor Green
    $script:PassCount++
}

function Write-Failure([string]$Msg) {
    Write-Host "❌ $Msg" -ForegroundColor Red
    $script:FailCount++
}

function Invoke-Step([string]$Name, [scriptblock]$Block) {
    Write-Host "`n[→] $Name..." -ForegroundColor Yellow
    try {
        & $Block
        if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
            Write-Failure "$Name falló (exit code $LASTEXITCODE)"
            return $false
        }
        Write-Success "$Name pasó"
        return $true
    } catch {
        Write-Failure "$Name lanzó excepción: $_"
        return $false
    }
}

# ------------------------------------------------------------------ Cargar .env.test
$EnvTestPath = Join-Path (Join-Path $PSScriptRoot '..') '.env.test'
if (Test-Path $EnvTestPath) {
    Write-Host "[Setup] Cargando variables de .env.test..." -ForegroundColor DarkGray
    Get-Content $EnvTestPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $Matches[1].Trim()
            $val = $Matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
}

# ------------------------------------------------------------------ Detectar venv
$BackendDir = Join-Path (Join-Path $PSScriptRoot '..') 'backend'
$VenvPython = Join-Path (Join-Path (Join-Path $BackendDir 'venv_win') 'Scripts') 'python.exe'
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path (Join-Path (Join-Path $BackendDir 'venv') 'Scripts') 'python.exe'
}
if (-not (Test-Path $VenvPython)) {
    $VenvPython = 'python'   # Fallback al python del PATH
}
Write-Host "[Setup] Python: $VenvPython" -ForegroundColor DarkGray

# ------------------------------------------------------------------ Backend (pytest)
function Run-BackendTests {
    Write-Header "Capa 1 — Backend: pytest"

    # 1. Cargar el .env del backend para JWT_SECRET_KEY y otras vars base
    $BackendEnv = Join-Path $BackendDir '.env'
    if (Test-Path $BackendEnv) {
        Get-Content $BackendEnv | ForEach-Object {
            if ($_ -match '^([A-Z][A-Z0-9_]+)=(.+)$') {
                [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
            }
        }
        Write-Host "[Backend] .env cargado" -ForegroundColor DarkGray
    }

    # 2. FORZAR modo testing (sobreescribe lo que venga del .env)
    $env:FLASK_CONFIG = 'testing'
    $env:FLASK_ENV    = 'testing'
    $env:TEST_SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

    $PytestArgs = @('tests/', '--tb=short', '-q')
    if ($Verbose)   { $PytestArgs += '-v' }
    if ($Coverage)  {
        $PytestArgs += '--cov=app'
        $PytestArgs += '--cov-report=html:../test-results/coverage-backend'
        $PytestArgs += '--cov-report=term-missing'
    }

    Push-Location $BackendDir
    try {
        Invoke-Step "pytest (integración API)" {
            & $VenvPython -m pytest @PytestArgs
        }
    } finally {
        Pop-Location
    }
}

# ------------------------------------------------------------------ Frontend (Vitest)
function Run-FrontendTests {
    Write-Header "Capa 2 — Frontend: Vitest"

    $FrontendDir = Join-Path $PSScriptRoot '..' 'frontend'

    if ($Coverage) {
        Invoke-Step "Vitest (cobertura)" {
            npm run test:coverage --prefix $FrontendDir
        }
    } else {
        Invoke-Step "Vitest (rápido)" {
            npm run test:run --prefix $FrontendDir
        }
    }
}

# ------------------------------------------------------------------ E2E (Playwright)
function Run-E2ETests {
    Write-Header "Capa 3 — E2E: Playwright"

    $RootDir = Join-Path $PSScriptRoot '..'
    $PlaywrightArgs = @()

    if ($Headed) { $PlaywrightArgs += '--headed' }
    if ($Verbose) { $PlaywrightArgs += '--reporter=list' }

    # Cargar .env.test para Playwright
    $env:DOTENV_CONFIG_PATH = Join-Path $RootDir '.env.test'

    Invoke-Step "Playwright (E2E)" {
        npx playwright test @PlaywrightArgs
    }

    # Mostrar ruta al reporte HTML
    $ReportPath = Join-Path (Join-Path (Join-Path $RootDir 'test-results') 'playwright') 'index.html'
    if (Test-Path $ReportPath) {
        Write-Host "`n📊 Reporte HTML: file://$ReportPath" -ForegroundColor DarkCyan
    }
}

# ------------------------------------------------------------------ Main
Write-Host ""
Write-Host "🧪 VillaLuz — Suite de Tests" -ForegroundColor Magenta
Write-Host "   Capa: $Layer | Cobertura: $Coverage | Headed: $Headed"
Write-Host "   Hora: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

$StartTime = Get-Date

switch ($Layer) {
    'backend'  { Run-BackendTests }
    'frontend' { Run-FrontendTests }
    'e2e'      { Run-E2ETests }
    'all'      {
        Run-BackendTests
        Run-FrontendTests
        Run-E2ETests
    }
}

$Duration = (Get-Date) - $StartTime

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  Resultados: ✅ $($script:PassCount) pasos OK | ❌ $($script:FailCount) fallidos" -ForegroundColor $(if ($script:FailCount -eq 0) { 'Green' } else { 'Red' })
Write-Host "  Duración: $($Duration.ToString('mm\:ss'))" -ForegroundColor DarkGray
Write-Host "=" * 60 -ForegroundColor Cyan

if ($script:FailCount -gt 0) {
    exit 1
}
