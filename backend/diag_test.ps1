# Script de diagnóstico de tests — corre SOLO test_auth_endpoints.py con traceback completo
param([string]$TestFile = 'tests/test_auth_endpoints.py')

# 1. Cargar el .env del backend primero (para JWT_SECRET_KEY, DB_*, etc.)
$EnvPath = Join-Path $PSScriptRoot '.env'
if (Test-Path $EnvPath) {
    Get-Content $EnvPath | ForEach-Object {
        if ($_ -match '^([A-Z][A-Z0-9_]+)=(.+)$') {
            $key = $Matches[1]
            $val = $Matches[2]
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
    Write-Host "[Diag] Env cargado desde .env"
} else {
    Write-Warning "[Diag] No se encontró .env en $EnvPath"
}

# 2. FORZAR config de testing DESPUÉS de cargar .env (para que testing tenga prioridad)
$env:FLASK_CONFIG = 'testing'
$env:FLASK_ENV = 'testing'
$env:TEST_SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

Write-Host "[Diag] JWT_SECRET_KEY present: $([bool]$env:JWT_SECRET_KEY)"
Write-Host "[Diag] FLASK_CONFIG: $env:FLASK_CONFIG"
Write-Host "[Diag] TEST_SQLALCHEMY_DATABASE_URI: $env:TEST_SQLALCHEMY_DATABASE_URI"
Write-Host ""

$Py = Join-Path $PSScriptRoot 'venv_win\Scripts\python.exe'
if (-not (Test-Path $Py)) {
    $Py = Join-Path $PSScriptRoot 'venv\Scripts\python.exe'
}
if (-not (Test-Path $Py)) { $Py = 'python' }

Write-Host "[Diag] Python: $Py"
Write-Host "[Diag] Corriendo: $TestFile"
Write-Host ""

& $Py -m pytest $TestFile -v --tb=long --no-header
