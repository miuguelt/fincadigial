#Requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateSet('Audit', 'Release')][string]$Mode = 'Audit',
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$globalScript = 'C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\devbraind\scripts\Test-DevBrainLegalLifecycle.ps1'
if (Test-Path -LiteralPath $globalScript -PathType Leaf) {
    $forwardArgs = @('-ProjectPath', $root, '-Mode', $Mode)
    if ($Json) { $forwardArgs += '-Json' }
    & pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File $globalScript @forwardArgs
    exit $LASTEXITCODE
}

$statePath = Join-Path $root 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json'
$manifestPath = Join-Path $root 'docs/legal/COMPLIANCE_MANIFEST.json'
$findings = [System.Collections.Generic.List[object]]::new()

function Add-Finding {
    param([string]$Id, [ValidateSet('PASS', 'WARN', 'BLOCKER')][string]$Status, [string]$Message, [string]$Evidence = '')
    $findings.Add([pscustomobject]@{ id = $Id; status = $Status; message = $Message; evidence = $Evidence })
}

function Get-ModeStatus {
    param([bool]$Critical)
    if ($Critical -and $Mode -eq 'Release') { return 'BLOCKER' }
    return 'WARN'
}

if (-not (Test-Path -LiteralPath $statePath -PathType Leaf)) {
    Add-Finding 'state:missing' (Get-ModeStatus $true) 'Falta el estado de continuidad legal para IA.' 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json'
} else {
    try {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        foreach ($field in @('schema_version', 'project', 'jurisdiction', 'verdict', 'pending_blockers', 'ai_resume_contract')) {
            if ($null -eq $state.$field) { Add-Finding "state:$field" (Get-ModeStatus $true) 'Falta un campo obligatorio del estado de continuidad.' 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json' }
        }
    } catch { Add-Finding 'state:json' 'BLOCKER' 'El estado de continuidad no es JSON válido.' 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json' }
}

try {
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if (@($manifest.required_profiles).Count -eq 0) { Add-Finding 'manifest:profiles' (Get-ModeStatus $true) 'No se declararon perfiles de impacto legal.' 'docs/legal/COMPLIANCE_MANIFEST.json::required_profiles' }
    else { Add-Finding 'manifest:profiles' 'PASS' 'Los perfiles de impacto legal están declarados.' (($manifest.required_profiles -join ', ')) }
} catch { Add-Finding 'manifest:json' 'BLOCKER' 'El manifiesto legal no es JSON válido o no existe.' 'docs/legal/COMPLIANCE_MANIFEST.json' }

$projectGate = Join-Path $root 'scripts/Test-ColombiaLegalCompliance.ps1'
& pwsh -NoLogo -NoProfile -ExecutionPolicy Bypass -File $projectGate -Mode $Mode | Out-Null
$gateExit = $LASTEXITCODE
if ($gateExit -eq 0) { Add-Finding 'project:legal-gate' 'PASS' 'La compuerta legal específica terminó correctamente.' 'scripts/Test-ColombiaLegalCompliance.ps1' }
else { Add-Finding 'project:legal-gate' 'BLOCKER' 'La compuerta legal específica reportó bloqueadores.' 'scripts/Test-ColombiaLegalCompliance.ps1' }

$blockers = @($findings | Where-Object status -eq 'BLOCKER')
$result = [pscustomobject]@{
    schema_version = '1.0'
    project_root = $root
    mode = $Mode
    summary = [pscustomobject]@{ pass = @($findings | Where-Object status -eq 'PASS').Count; warn = @($findings | Where-Object status -eq 'WARN').Count; blocker = $blockers.Count }
    findings = @($findings)
    verdict = if ($blockers.Count -gt 0) { 'BLOCKED' } else { 'PASS' }
}

if ($Json) { $result | ConvertTo-Json -Depth 8 }
else {
    Write-Host "DevBrain legal lifecycle — modo $Mode — proyecto: $root"
    $findings | ForEach-Object { Write-Host "[$($_.status)] $($_.id): $($_.message) [$($_.evidence)]" }
    Write-Host "Resumen: PASS=$($result.summary.pass) WARN=$($result.summary.warn) BLOCKER=$($result.summary.blocker)"
}

if ($Mode -eq 'Release' -and $blockers.Count -gt 0) { exit 1 }
exit 0
