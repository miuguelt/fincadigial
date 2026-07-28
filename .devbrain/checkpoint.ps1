<#
.SYNOPSIS
    DevBrain Checkpoint (Windows PowerShell)
    Guarda snapshot automatico del trabajo en sesion.
    Uso: .\.devbrain\checkpoint.ps1 [-Message "mensaje opcional"]
#>
param(
    [string]$Message
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $ProjectRoot

if (-not $Message) {
    $Message = "auto checkpoint $(Get-Date -Format 'yyyy-MM-dd_HH:mm:ss')"
}

Write-Host "[DevBrain] Guardando checkpoint..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "ERROR: No hay repositorio Git. Ejecutar 'git init' primero." -ForegroundColor Red
    exit 1
}

git add -A
git commit -m "checkpoint: $Message" --allow-empty 2>$null | Out-Null

Write-Host "Checkpoint guardado." -ForegroundColor Green
Write-Host "   Para revertir: git reset --hard HEAD~1" -ForegroundColor DarkGray
Write-Host "   Para ver diff: git diff HEAD~1 --stat" -ForegroundColor DarkGray
