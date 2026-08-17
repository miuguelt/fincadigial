[CmdletBinding()]
param(
    [switch]$FailOnViolations,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$violations = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

function Add-Violation([string]$Message) {
    $script:violations.Add($Message)
}

function Add-Warning([string]$Message) {
    $script:warnings.Add($Message)
}

function Test-AllowedName([string]$Name, [string[]]$ExactNames, [string[]]$Patterns) {
    if ($ExactNames -contains $Name) { return $true }
    foreach ($pattern in $Patterns) {
        if ($Name -match $pattern) { return $true }
    }
    return $false
}

$rootFiles = @(
    '.antigravityrules', '.cbmignore', '.codexrules', '.cursorrules', '.dockerignore',
    '.env', '.env.production.example', '.env.test', '.gitattributes', '.gitignore',
    '.opencoderules', '.pre-commit-config.yaml', '.windsurfrules', 'AGENTS.md',
    'ARCHITECTURE.md', 'CHANGELOG.md', 'CLAUDE.md', 'CODING_RULES.md', 'DEV_CREDENTIALS.md',
    'ECOSYSTEM.md', 'GEMINI.md', 'LICENSE', 'PROJECT_GENOME.md', 'WEB-DESIGN-LEARNING.md',
    'README.md', 'codecov.yml', 'ecosystem.config.cjs', 'opencode.json', 'package.json', 'package-lock.json', 'playwright.config.ts',
    'pytest.ini', 'rules.md', 'ruff.toml', 'skills.json', 'start-windows.ps1', 'workflows.md'
)
$rootPatterns = @('^docker-compose.*\.ya?ml$', '^\.env(\..+)?$')

Get-ChildItem -LiteralPath $projectRoot -File -Force | ForEach-Object {
    if (-not (Test-AllowedName $_.Name $rootFiles $rootPatterns)) {
        Add-Violation "Archivo suelto en la raíz: $($_.Name). Mover a scripts/, docs/, maintenance/ o _archive/."
    }
}

$forbiddenDirectories = @(
    'BackFinca', 'VillaLuzFront', '4VillaLuz', 'frontend_VALIDATED_TMP',
    'backups', 'backups*', 'cleanup_backups', 'restored_*', '*_copy'
)
Get-ChildItem -LiteralPath $projectRoot -Directory -Force | ForEach-Object {
    foreach ($pattern in $forbiddenDirectories) {
        if ($_.Name -like $pattern) {
            Add-Violation "Raíz duplicada o backup local detectado: $($_.Name). Los backups deben vivir fuera del repositorio."
            break
        }
    }
}

$backendRoot = Join-Path $projectRoot 'backend'
$backendFiles = @(
    '.dockerignore', '.env', '.env.production.template', '.gitattributes', '.gitignore',
    'Dockerfile', 'LICENSE', 'Procfile', 'README.md', 'celery_worker.py', 'config.py',
    'docker-entrypoint.sh', 'docker-compose.yaml', 'mypy.ini', 'pyproject.toml',
    'pytest.ini', 'requirements-dev.txt', 'requirements-prod.txt', 'requirements.txt',
    'ruff.toml', 'run.py', 'wsgi.py'
)
$backendPatterns = @('^\.env(\..+)?$', '^requirements.*\.txt$')
if (Test-Path -LiteralPath $backendRoot) {
    Get-ChildItem -LiteralPath $backendRoot -File -Force | ForEach-Object {
        if ($_.Name -eq 'security.log') {
            Add-Warning 'backend/security.log sigue abierto por un proceso anterior; se eliminará tras reiniciar el backend porque el destino canónico es maintenance/security.log.'
        } elseif (-not (Test-AllowedName $_.Name $backendFiles $backendPatterns)) {
            Add-Violation "Archivo suelto en backend/: $($_.Name). Dejar solo runtime/configuración; mover operaciones a backend/maintenance/."
        }
    }
}

$frontendRoot = Join-Path $projectRoot 'frontend'
$frontendFiles = @(
    '.critical-manifest.json', '.dockerignore', '.env', '.env.development', '.env.production',
    '.env.production.template', '.gitattributes', '.gitignore', 'Dockerfile', 'LICENSE',
    'README.md', 'biome.json', 'docker-compose.yml', 'eslint-plugin-devbrain.js',
    'eslint.architecture.config.js', 'eslint.config.js', 'index.html', 'jest.config.mjs',
    'jest.transform.cjs', 'nginx.conf', 'package.json', 'package-lock.json',
    'playwright.config.ts', 'tailwind.config.js', 'tsconfig.app.json', 'tsconfig.jest.json',
    'tsconfig.json', 'tsconfig.node.json', 'vite.config.ts', 'vite.svg', 'vitest.config.ts'
)
$frontendPatterns = @('^\.env(\..+)?$', '^tsconfig.*\.json$')
if (Test-Path -LiteralPath $frontendRoot) {
    Get-ChildItem -LiteralPath $frontendRoot -File -Force | ForEach-Object {
        if (-not (Test-AllowedName $_.Name $frontendFiles $frontendPatterns)) {
            Add-Violation "Archivo suelto en frontend/: $($_.Name). Dejar solo configuración; mover reportes y scripts a carpetas."
        }
    }
}

$legacyRoots = @(
    (Join-Path $projectRoot 'scripts'),
    (Join-Path $projectRoot 'backend'),
    (Join-Path $projectRoot 'frontend'),
    (Join-Path $projectRoot '.github'),
    (Join-Path $projectRoot '.pre-commit-config.yaml'),
    (Join-Path $projectRoot 'docker-compose.staging.yml'),
    (Join-Path $projectRoot 'ECOSYSTEM.md')
) | Where-Object { Test-Path -LiteralPath $_ }
$legacyMatches = @(
    & rg -l --hidden --no-messages `
        --glob '!docs/**' --glob '!backend/docs/**' --glob '!_archive/**' `
        --glob '!node_modules/**' --glob '!backend/.venv/**' --glob '!backend/venv*/**' `
        --glob '!.git/**' --glob '!.gitignore' --glob '!*.json' `
        --glob '!scripts/Test-VillaLuzProjectHygiene.ps1' `
        'BackFinca([\\/._-]|$)|VillaLuzFront([\\/._-]|$)|frontend_VALIDATED_TMP([\\/._-]|$)' @legacyRoots 2>$null
)
foreach ($match in $legacyMatches) {
    Add-Violation "Referencia a una raíz eliminada: $match. Usar únicamente backend/ o frontend/."
}

$result = [ordered]@{
    project = Split-Path $projectRoot -Leaf
    status = if ($violations.Count -eq 0) { 'clean' } else { 'violations' }
    violations = $violations
    warnings = $warnings
}

if ($Json) {
    $result | ConvertTo-Json -Depth 4
} else {
    Write-Output "VillaLuz project hygiene: $($result.status)"
    foreach ($violation in $violations) { Write-Output "ERROR: $violation" }
    foreach ($warning in $warnings) { Write-Output "WARN: $warning" }
}

if ($FailOnViolations -and $violations.Count -gt 0) {
    exit 1
}

# Salida explícita: sin ella el script heredaba el código de rg, que devuelve 1
# cuando no encuentra coincidencias. El gate reportaba 'clean' y salía con 1, así
# que cualquier hook o CI encadenado veía un fallo permanente.
exit 0
