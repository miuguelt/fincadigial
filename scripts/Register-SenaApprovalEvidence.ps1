#Requires -Version 7.0
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ApprovalFile,
    [Parameter(Mandatory)][string]$DocumentType,
    [Parameter(Mandatory)][string]$DocumentNumber,
    [Parameter(Mandatory)][string]$ApprovalDate,
    [Parameter(Mandatory)][string]$ApprovalBody,
    [Parameter(Mandatory)][string]$Scope,
    [string]$OriginalLocation = '<UBICACION_INSTITUCIONAL_RESTRINGIDA>',
    [string]$AccessRestriction = 'Original bajo custodia institucional; copia pública redactada'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$targetRelativePath = 'docs/legal/evidence/sena-approval/ACTA_APROBACION_SENA_REDACTADA.pdf'
$metadataRelativePath = 'docs/legal/evidence/sena-approval/metadata.json'
$manifestRelativePath = 'docs/legal/COMPLIANCE_MANIFEST.json'
$targetPath = Join-Path $projectRoot ($targetRelativePath -replace '/', '\')
$metadataPath = Join-Path $projectRoot ($metadataRelativePath -replace '/', '\')
$manifestPath = Join-Path $projectRoot ($manifestRelativePath -replace '/', '\')

if (-not (Test-Path -LiteralPath $ApprovalFile -PathType Leaf)) {
    throw "No existe el archivo de aprobación: $ApprovalFile"
}

$source = Get-Item -LiteralPath $ApprovalFile
if ($source.Extension -ine '.pdf') {
    throw 'La evidencia debe ser un PDF.'
}
if ($source.BaseName -notmatch '(?i)redact|public|anonim') {
    throw 'Por seguridad, renombra la copia como redactada/publica/anonimizada antes de registrarla.'
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetPath) | Out-Null
Copy-Item -LiteralPath $source.FullName -Destination $targetPath -Force
$hash = (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash.ToLowerInvariant()

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$context = $manifest.institutional_context
$context.approval_status = 'documented_technical_pedagogical_pending_operational_release'
$context.approval_document_type = $DocumentType
$context.approval_document_number = $DocumentNumber
$context.approval_date = $ApprovalDate
$context.approval_body = $ApprovalBody
$context.approval_scope = $Scope
$context.approval_evidence_file = $targetRelativePath
$context.approval_evidence_sha256 = $hash
$context.approval_original_location = $OriginalLocation
$context.approval_access_restriction = $AccessRestriction
$manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $manifestPath -Encoding utf8

$metadata = [ordered]@{
    document_type = $DocumentType
    document_number = $DocumentNumber
    approval_date = $ApprovalDate
    approval_body = $ApprovalBody
    scope = $Scope
    redacted_file = 'ACTA_APROBACION_SENA_REDACTADA.pdf'
    sha256 = $hash
    original_location = $OriginalLocation
    access_restriction = $AccessRestriction
}
$metadata | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $metadataPath -Encoding utf8

Write-Host "Evidencia registrada: $targetRelativePath"
Write-Host "SHA-256: $hash"
Write-Host 'Nota: el manifiesto seguirá bloqueando la salida hasta completar la autorización operativa y los demás controles críticos.'
