[CmdletBinding()]
param(
    [switch]$Staged
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$devBrainRoot = 'C:\Users\Miguel\Documents\Aplicaciones'
$secretHook = Join-Path $devBrainRoot '_infrastructure\devbraind\scripts\pre-commit-secrets.ps1'
$rulesValidator = Join-Path $devBrainRoot 'validate-rules.ps1'
$hygieneGate = Join-Path $devBrainRoot '_infrastructure\devbraind\scripts\Test-DevBrainRepoHygiene.ps1'

foreach ($required in @($secretHook, $rulesValidator, $hygieneGate)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw "Falta una herramienta DevBrain requerida: $required"
    }
}

Write-Host '🔍 Ejecutando auditoría DevBrain de VillaLuz...' -ForegroundColor Cyan

if ($Staged) {
    & $secretHook -Staged
} else {
    & $secretHook -Path $projectRoot
}
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $rulesValidator -Project 'villaluz'
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $hygieneGate -Path $projectRoot -SingleRepository -FailOnViolations
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host '✅ Auditoría DevBrain superada.' -ForegroundColor Green
