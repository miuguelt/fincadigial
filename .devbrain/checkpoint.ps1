<#
.SYNOPSIS
    DevBrain Checkpoint (Windows PowerShell)
    Guarda snapshot automatico del trabajo en sesion.
    Uso: .\.devbrain\checkpoint.ps1 [-Message "mensaje opcional"]
#>
param(
    [string]$Message,
    [switch]$Stage
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
Set-Location $ProjectRoot

Write-Host "[DevBrain] Revisando checkpoint sin crear commits..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "ERROR: No hay repositorio Git. Ejecutar 'git init' primero." -ForegroundColor Red
    exit 1
}

if ($Stage) {
    git add -A
    Write-Host "Cambios agregados al staging por solicitud explícita (-Stage)." -ForegroundColor Yellow
}

git status --short
Write-Host "No se creó ningún commit. Revisa y ejecuta git commit manualmente cuando corresponda." -ForegroundColor Green
