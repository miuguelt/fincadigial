#Requires -Version 7.0
[CmdletBinding()]
param(
    [ValidateSet('Audit', 'Release')]
    [string]$Mode = 'Audit'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$checks = [System.Collections.Generic.List[object]]::new()

function Add-ComplianceCheck {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][ValidateSet('PASS', 'WARN', 'BLOCKER')][string]$Status,
        [Parameter(Mandatory)][string]$Message,
        [string]$Evidence = ''
    )

    $checks.Add([pscustomobject]@{
        Id       = $Id
        Status   = $Status
        Message  = $Message
        Evidence = $Evidence
    })
}

function Resolve-ProjectPath {
    param([Parameter(Mandatory)][string]$RelativePath)
    return Join-Path $projectRoot ($RelativePath -replace '/', '\')
}

function Get-TextIfExists {
    param([Parameter(Mandatory)][string]$RelativePath)
    $path = Resolve-ProjectPath $RelativePath
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { return $null }
    return Get-Content -LiteralPath $path -Raw -ErrorAction Stop
}

function FindingStatus {
    param([Parameter(Mandatory)][bool]$Critical)
    if ($Mode -eq 'Release' -and $Critical) { return 'BLOCKER' }
    return 'WARN'
}

$requiredFiles = @(
    'rules/COLOMBIA_LEGAL_MINIMUM_RULES.md',
    'agents/colombia-legal-compliance-agent.md',
    'docs/legal/00_ESTANDAR_BASE_COMPLIANCE_COLOMBIA.md',
    'docs/legal/01_VILLALUZ_PLAN_CUMPLIMIENTO.md',
    'docs/legal/02_INVENTARIO_TRATAMIENTO_DATOS.md',
    'docs/legal/03_REGISTRO_PROVEEDORES_TRANSFERENCIAS.md',
    'docs/legal/04_PLAN_INCIDENTES_Y_DSAR.md',
    'docs/legal/05_CHECKLIST_COOLIFY_VPS.md',
    'docs/legal/06_SENA_PERFIL_JURIDICO_Y_REQUISITOS.md',
    'docs/legal/08_MATRIZ_CUMPLIMIENTO_SENA.md',
    'docs/legal/09_ANEXO_CONTRACTUAL_SENA_DATOS_SOFTWARE.md',
    'docs/legal/10_PROCEDIMIENTO_ALTA_SENA.md',
    'docs/legal/11_EVIDENCIA_APROBACION_SENA.md',
    'docs/legal/12_CONTINUIDAD_IMPLEMENTACION_LEGAL_IA.md',
    'docs/legal/13_GUIA_CICLO_VIDA_LEGAL_DEVBRAIN.md',
    'docs/legal/LEGAL_IMPLEMENTATION_STATE.json',
    'docs/legal/evidence/sena-approval/README.md',
    'docs/legal/evidence/sena-approval/metadata.json',
    'scripts/Register-SenaApprovalEvidence.ps1',
    'scripts/Test-DevBrainLegalLifecycle.ps1',
    'LICENSE',
    'CONTRIBUTING.md',
    'docs/legal/COMPLIANCE_MANIFEST.json'
)

foreach ($file in $requiredFiles) {
    $path = Resolve-ProjectPath $file
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        Add-ComplianceCheck -Id "file:$file" -Status 'PASS' -Message 'Documento de control presente.' -Evidence $file
    } else {
        Add-ComplianceCheck -Id "file:$file" -Status 'BLOCKER' -Message 'Falta un documento de control obligatorio.' -Evidence $file
    }
}

$manifestPath = Resolve-ProjectPath 'docs/legal/COMPLIANCE_MANIFEST.json'
$manifest = $null
if (Test-Path -LiteralPath $manifestPath -PathType Leaf) {
    try {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    } catch {
        Add-ComplianceCheck -Id 'manifest:valid-json' -Status 'BLOCKER' -Message 'El manifiesto de cumplimiento no es JSON válido.' -Evidence 'docs/legal/COMPLIANCE_MANIFEST.json'
    }
}

if ($null -ne $manifest) {
    $controllerFields = @('legal_name', 'tax_id', 'address', 'privacy_contact', 'privacy_officer')
    foreach ($field in $controllerFields) {
        $value = [string]$manifest.controller.$field
        if ([string]::IsNullOrWhiteSpace($value) -or $value -match '<[^>]+>|TODO|POR_CONFIRMAR|por confirmar') {
            Add-ComplianceCheck -Id "controller:$field" -Status (FindingStatus -Critical $true) -Message 'La identidad del responsable sigue incompleta.' -Evidence "docs/legal/COMPLIANCE_MANIFEST.json::$field"
        } else {
            Add-ComplianceCheck -Id "controller:$field" -Status 'PASS' -Message 'Campo del responsable diligenciado.' -Evidence "docs/legal/COMPLIANCE_MANIFEST.json::$field"
        }
    }

    $criticalControls = @(
        'privacy_notice_visible_before_collection',
        'consent_evidence_versioned',
        'data_subject_requests_operational',
        'retention_and_deletion_implemented',
        'processor_and_transfer_register_approved',
        'private_file_access_enforced',
        'tenant_isolation_tested',
        'secrets_rotated',
        'encrypted_offsite_backups_tested',
        'incident_response_tested',
        'ip_and_open_source_review_approved',
        'electronic_acceptance_evidence_preserved'
    )
    foreach ($control in $criticalControls) {
        $rawValue = $manifest.controls.$control
        if ($rawValue -ne $true) {
            Add-ComplianceCheck -Id "control:$control" -Status (FindingStatus -Critical $true) -Message 'Control crítico pendiente.' -Evidence "docs/legal/COMPLIANCE_MANIFEST.json::$control"
        } else {
            Add-ComplianceCheck -Id "control:$control" -Status 'PASS' -Message 'Control crítico declarado como implementado.' -Evidence "docs/legal/COMPLIANCE_MANIFEST.json::$control"
        }
    }

    if ([string]$manifest.status -ne 'approved') {
        Add-ComplianceCheck -Id 'manifest:release-status' -Status (FindingStatus -Critical $true) -Message 'El manifiesto no está aprobado para producción.' -Evidence "status=$($manifest.status)"
    } else {
        Add-ComplianceCheck -Id 'manifest:release-status' -Status 'PASS' -Message 'El manifiesto declara aprobación.'
    }

    if ([string]$manifest.sector_profile -eq 'SENA_PUBLIC_ENTITY') {
        $approvalFields = @('approval_document_type', 'approval_document_number', 'approval_date', 'approval_body', 'approval_evidence_sha256', 'approval_evidence_file')
        $approvalMissing = @($approvalFields | Where-Object {
            $value = [string]$manifest.institutional_context.$_
            [string]::IsNullOrWhiteSpace($value) -or $value -match '<[^>]+>|TODO|POR_CONFIRMAR|por confirmar'
        })
        if ($approvalMissing.Count -gt 0) {
            Add-ComplianceCheck -Id 'sena:approval-evidence' -Status (FindingStatus -Critical $true) -Message 'La aprobación SENA fue reportada, pero falta evidencia documental verificable y su alcance.' -Evidence 'docs/legal/11_EVIDENCIA_APROBACION_SENA.md'
        } else {
            $approvalFile = [string]$manifest.institutional_context.approval_evidence_file
            $approvalPath = Resolve-ProjectPath $approvalFile
            if (-not (Test-Path -LiteralPath $approvalPath -PathType Leaf)) {
                Add-ComplianceCheck -Id 'sena:approval-evidence-file' -Status (FindingStatus -Critical $true) -Message 'El manifiesto referencia evidencia SENA, pero el archivo no existe en la ruta canónica.' -Evidence $approvalFile
            } else {
                $expectedHash = ([string]$manifest.institutional_context.approval_evidence_sha256).ToLowerInvariant()
                $actualHash = (Get-FileHash -LiteralPath $approvalPath -Algorithm SHA256).Hash.ToLowerInvariant()
                if ($expectedHash -ne $actualHash) {
                    Add-ComplianceCheck -Id 'sena:approval-evidence-hash' -Status (FindingStatus -Critical $true) -Message 'El SHA-256 de la evidencia SENA no coincide con el manifiesto.' -Evidence $approvalFile
                } else {
                    Add-ComplianceCheck -Id 'sena:approval-evidence' -Status 'PASS' -Message 'Evidencia documental de aprobación SENA registrada y verificada por hash.' -Evidence $approvalFile
                }
            }
        }
    }
}

$statePath = Resolve-ProjectPath 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json'
if (Test-Path -LiteralPath $statePath -PathType Leaf) {
    try {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        foreach ($field in @('schema_version', 'project', 'jurisdiction', 'verdict', 'pending_blockers', 'ai_resume_contract')) {
            if ($null -eq $state.$field) {
                Add-ComplianceCheck -Id "state:$field" -Status (FindingStatus -Critical $true) -Message 'El estado de continuidad para IA no tiene un campo obligatorio.' -Evidence 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json'
            }
        }
        if ([string]$state.verdict.production_with_real_personal_data -ne 'BLOCKED') {
            Add-ComplianceCheck -Id 'state:real-data-safe-default' -Status (FindingStatus -Critical $true) -Message 'El estado de continuidad no conserva el bloqueo preventivo de datos reales.' -Evidence 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json::verdict.production_with_real_personal_data'
        } else {
            Add-ComplianceCheck -Id 'state:real-data-safe-default' -Status 'PASS' -Message 'El estado de continuidad conserva el bloqueo preventivo de datos reales.' -Evidence 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json'
        }
    } catch {
        Add-ComplianceCheck -Id 'state:valid-json' -Status 'BLOCKER' -Message 'El estado de continuidad para IA no es JSON válido.' -Evidence 'docs/legal/LEGAL_IMPLEMENTATION_STATE.json'
    }
}

try {
    $trackedEnv = @(& git -C $projectRoot ls-files --error-unmatch .env .env.production 2>$null)
    if ($trackedEnv.Count -gt 0) {
        Add-ComplianceCheck -Id 'secrets:tracked-env' -Status 'BLOCKER' -Message 'Hay archivos de entorno sensibles rastreados por Git.' -Evidence ($trackedEnv -join ', ')
    } else {
        Add-ComplianceCheck -Id 'secrets:tracked-env' -Status 'PASS' -Message 'No se detectaron .env de producción rastreados por Git.'
    }
} catch {
    Add-ComplianceCheck -Id 'secrets:git-check' -Status 'WARN' -Message 'No fue posible comprobar el índice Git; ejecutar el detector de secretos antes de comprometer.'
}

$registrationFiles = @(
    'frontend/src/pages/auth/register/index.tsx',
    'frontend/src/pages/auth/register-user/index.tsx'
)
foreach ($relative in $registrationFiles) {
    $text = Get-TextIfExists $relative
    if ($null -eq $text) { continue }
    if ($text -notmatch '(?i)consent|autoriz|privacidad|tratamiento|terms|términos') {
        Add-ComplianceCheck -Id "collection:$relative" -Status (FindingStatus -Critical $true) -Message 'Formulario de registro sin evidencia textual de aviso o autorización.' -Evidence $relative
    } else {
        Add-ComplianceCheck -Id "collection:$relative" -Status 'PASS' -Message 'Formulario contiene referencias de aviso/autorización; aún requiere prueba funcional.' -Evidence $relative
    }
}

$apiText = Get-TextIfExists 'backend/app/api/__init__.py'
if ($apiText -match '(?i)public/images|static/uploads') {
    $fileSignatureText = Get-TextIfExists 'backend/app/utils/private_file_urls.py'
    $isSigned = $apiText -match '(?i)verify_file_url_signature' -and $fileSignatureText -match '(?i)URLSafeTimedSerializer|create_file_url_signature'
    if ($isSigned) {
        Add-ComplianceCheck -Id 'files:public-route' -Status 'PASS' -Message 'La ruta de archivos exige una firma temporal ligada al archivo.' -Evidence 'backend/app/api/__init__.py'
    } else {
        Add-ComplianceCheck -Id 'files:public-route' -Status (FindingStatus -Critical $true) -Message 'Existe una ruta de archivos potencialmente pública; debe probar autorización por archivo.' -Evidence 'backend/app/api/__init__.py'
    }
} else {
    Add-ComplianceCheck -Id 'files:public-route' -Status 'PASS' -Message 'No se detectó la firma conocida de ruta pública de archivos.'
}

$frontendSource = Get-TextIfExists 'frontend/src/pages/auth/register/index.tsx'
if ($null -ne $frontendSource -and $frontendSource -match '(?i)localStorage\.(setItem|getItem).*?(access_token|refresh_token)|(access_token|refresh_token).*?localStorage\.') {
    Add-ComplianceCheck -Id 'auth:browser-token-storage' -Status (FindingStatus -Critical $true) -Message 'Se detectó persistencia de tokens en localStorage; revisar XSS, rotación y alternativa con cookie protegida.' -Evidence 'frontend/src/pages/auth/register/index.tsx'
} else {
    Add-ComplianceCheck -Id 'auth:browser-token-storage' -Status 'PASS' -Message 'No se detectó el patrón conocido de tokens en localStorage en el registro.'
}

$nginxText = Get-TextIfExists 'frontend/nginx.conf'
if ($null -ne $nginxText -and $nginxText -match "unsafe-inline|unsafe-eval") {
    Add-ComplianceCheck -Id 'web:csp' -Status 'WARN' -Message 'La política CSP contiene excepciones que reducen la protección contra XSS; justificar y reducir.' -Evidence 'frontend/nginx.conf'
}

$workflowFiles = Get-ChildItem -LiteralPath (Resolve-ProjectPath '.github/workflows') -Filter '*.yml' -File -ErrorAction SilentlyContinue
foreach ($workflow in $workflowFiles) {
    $workflowText = Get-Content -LiteralPath $workflow.FullName -Raw
    if ($workflowText -match '\|\|\s*true') {
        Add-ComplianceCheck -Id "ci:$($workflow.Name)" -Status (FindingStatus -Critical $true) -Message 'El flujo CI ignora fallos; no puede ser evidencia de control de seguridad.' -Evidence ".github/workflows/$($workflow.Name)"
    }
}

$composeFiles = @('docker-compose.yaml', 'docker-compose.yml', 'docker-compose.coolify.yml') | Where-Object { Test-Path -LiteralPath (Resolve-ProjectPath $_) }
foreach ($compose in $composeFiles) {
    $composeText = Get-TextIfExists $compose
    if ($composeText -match '(?m)-\s*["'']?5432:|(?m)-\s*["'']?6379:|(?m)-\s*["'']?5433:') {
        Add-ComplianceCheck -Id "deploy:$compose-public-database" -Status (FindingStatus -Critical $true) -Message 'El archivo de composición parece publicar puertos de base de datos o Redis.' -Evidence $compose
    }
    if ($composeText -match '(?i)password\s*[:=]\s*(?!\$\{)[^\s\r\n]+|secret\s*[:=]\s*(?!\$\{)[^\s\r\n]+') {
        Add-ComplianceCheck -Id "deploy:$compose-inline-secret" -Status 'BLOCKER' -Message 'Posible secreto literal en Docker Compose; revisar sin imprimir el valor.' -Evidence $compose
    }
}

$coolifyComposeCandidate = if (Test-Path -LiteralPath (Resolve-ProjectPath 'docker-compose.yaml') -PathType Leaf) {
    'docker-compose.yaml'
} elseif (Test-Path -LiteralPath (Resolve-ProjectPath 'docker-compose.coolify.yml') -PathType Leaf) {
    'docker-compose.coolify.yml'
} else {
    $null
}

if ($null -eq $coolifyComposeCandidate) {
    Add-ComplianceCheck -Id 'deploy:coolify-compose' -Status (FindingStatus -Critical $true) -Message 'Falta el perfil de composición declarado para Coolify.' -Evidence 'docker-compose.yaml'
} else {
    $coolifyComposeText = Get-TextIfExists $coolifyComposeCandidate
    if ($coolifyComposeText -match '(?m)-\s*["'']?(5432|6379|5433):') {
        Add-ComplianceCheck -Id 'deploy:coolify-public-infra' -Status (FindingStatus -Critical $true) -Message 'El perfil Coolify publica puertos de infraestructura.' -Evidence $coolifyComposeCandidate
    } else {
        Add-ComplianceCheck -Id 'deploy:coolify-compose' -Status 'PASS' -Message 'Perfil Coolify presente sin publicación de puertos de base de datos o Redis.' -Evidence $coolifyComposeCandidate
    }
}

$blockers = @($checks | Where-Object Status -eq 'BLOCKER')
$warnings = @($checks | Where-Object Status -eq 'WARN')
$passes = @($checks | Where-Object Status -eq 'PASS')

Write-Host "Compuerta legal colombiana — modo $Mode — proyecto: $projectRoot"
foreach ($check in $checks) {
    $color = switch ($check.Status) { 'PASS' { 'Green' } 'WARN' { 'Yellow' } default { 'Red' } }
    $suffix = if ($check.Evidence) { " [$($check.Evidence)]" } else { '' }
    Write-Host ("[{0}] {1}: {2}{3}" -f $check.Status, $check.Id, $check.Message, $suffix) -ForegroundColor $color
}
Write-Host ("Resumen: PASS={0} WARN={1} BLOCKER={2}" -f $passes.Count, $warnings.Count, $blockers.Count)

if ($Mode -eq 'Release' -and $blockers.Count -gt 0) {
    Write-Error 'LIBERACIÓN BLOQUEADA: cierre los controles críticos y vuelva a ejecutar esta compuerta.'
    exit 1
}

exit 0
