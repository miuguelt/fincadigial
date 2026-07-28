#!/usr/bin/env pwsh
#Requires -Version 7.0
# Script de inicio para villaluz - flask
$ErrorActionPreference = "Stop"
$BackendDir = $PSScriptRoot
$VenvPython = "$BackendDir\.venv\Scripts\python.exe"

Write-Host "Iniciando villaluz (flask) en puerto 8092..." -ForegroundColor Cyan

if (-not (Test-Path $VenvPython)) {
    Write-Host "Error: Entorno virtual no encontrado. Ejecuta setup-backends.ps1 primero." -ForegroundColor Red
    exit 1
}

# Cambiar al directorio del backend
Set-Location $BackendDir
$env:FLASK_APP = "run.py"
$env:FLASK_ENV = "development"
& $VenvPython -m flask run --host 0.0.0.0 --port 8092 --reload
