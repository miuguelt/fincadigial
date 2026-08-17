[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ProjectRoot
)

$defaultRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Backups\VillaLuz'
$backupRoot = if ([string]::IsNullOrWhiteSpace($env:VILLALUZ_BACKUP_ROOT)) { $defaultRoot } else { [IO.Path]::GetFullPath($env:VILLALUZ_BACKUP_ROOT) }
$resolvedProject = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\', '/')
$resolvedBackup = [IO.Path]::GetFullPath($backupRoot).TrimEnd('\', '/')
if ($resolvedBackup.Equals($resolvedProject, [StringComparison]::OrdinalIgnoreCase) -or $resolvedBackup.StartsWith("$resolvedProject\", [StringComparison]::OrdinalIgnoreCase)) {
    throw "VILLALUZ_BACKUP_ROOT no puede estar dentro del repositorio: $resolvedBackup"
}
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
Write-Output $backupRoot
