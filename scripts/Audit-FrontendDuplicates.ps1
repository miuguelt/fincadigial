param(
    [string]$FrontendRoot = ".\frontend",
    [string]$ArchiveRoot = ".\_archive\frontend_source_duplicates_2026-05-07",
    [switch]$ArchiveIdentical
)

$ErrorActionPreference = "Stop"

$resolvedFrontend = (Resolve-Path -LiteralPath $FrontendRoot).Path
$srcRoot = Join-Path $resolvedFrontend "src"

if (-not (Test-Path -LiteralPath $srcRoot)) {
    throw "No se encontro frontend/src en: $resolvedFrontend"
}

$duplicateFiles = Get-ChildItem -Recurse -File -LiteralPath $srcRoot |
    Where-Object {
        $_.Name -match "\(\d+\)(?=\.[^.]+$)" -and
        $_.FullName -notmatch "\\(node_modules|dist|coverage)\\"
    }

$rows = foreach ($file in $duplicateFiles) {
    $canonicalName = $file.Name -replace "\(\d+\)(?=\.[^.]+$)", ""
    $canonicalPath = Join-Path $file.DirectoryName $canonicalName
    $duplicateHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
    $canonicalExists = Test-Path -LiteralPath $canonicalPath
    $canonicalHash = if ($canonicalExists) {
        (Get-FileHash -Algorithm SHA256 -LiteralPath $canonicalPath).Hash
    } else {
        ""
    }

    [pscustomobject]@{
        Duplicate = $file.FullName
        CanonicalCandidate = $canonicalPath
        HasCanonical = $canonicalExists
        SameAsCanonical = ($canonicalHash -ne "" -and $duplicateHash -eq $canonicalHash)
        DuplicateSize = $file.Length
        CanonicalSize = if ($canonicalExists) { (Get-Item -LiteralPath $canonicalPath).Length } else { 0 }
    }
}

$identical = @($rows | Where-Object { $_.SameAsCanonical })
$divergent = @($rows | Where-Object { -not $_.SameAsCanonical })

Write-Host "Frontend source: $srcRoot"
Write-Host "Duplicados detectados: $($rows.Count)"
Write-Host "Identicos al candidato canonico: $($identical.Count)"
Write-Host "Divergentes o sin canonico directo: $($divergent.Count)"

if ($divergent.Count -gt 0) {
    Write-Host ""
    Write-Host "Primeros duplicados divergentes:"
    $divergent |
        Select-Object -First 30 Duplicate, CanonicalCandidate, HasCanonical, DuplicateSize, CanonicalSize |
        Format-Table -AutoSize -Wrap
}

if (-not $ArchiveIdentical) {
    Write-Host ""
    Write-Host "Dry-run: no se movio ningun archivo. Usa -ArchiveIdentical para archivar solo duplicados identicos."
    exit 0
}

$resolvedArchiveParent = Split-Path -Parent (Join-Path (Get-Location).Path $ArchiveRoot)
if (-not (Test-Path -LiteralPath $resolvedArchiveParent)) {
    New-Item -ItemType Directory -Path $resolvedArchiveParent | Out-Null
}

$archiveFull = Join-Path (Get-Location).Path $ArchiveRoot
if (-not (Test-Path -LiteralPath $archiveFull)) {
    New-Item -ItemType Directory -Path $archiveFull | Out-Null
}
$resolvedArchive = (Resolve-Path -LiteralPath $archiveFull).Path

foreach ($item in $identical) {
    $sourcePath = (Resolve-Path -LiteralPath $item.Duplicate).Path
    if (-not $sourcePath.StartsWith($srcRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Ruta fuera de frontend/src, se detiene por seguridad: $sourcePath"
    }

    $relative = [System.IO.Path]::GetRelativePath($srcRoot, $sourcePath)
    $targetPath = Join-Path $resolvedArchive $relative
    $targetDir = Split-Path -Parent $targetPath

    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }

    Move-Item -LiteralPath $sourcePath -Destination $targetPath
}

Write-Host "Archivados duplicados identicos: $($identical.Count)"
Write-Host "Destino: $resolvedArchive"
