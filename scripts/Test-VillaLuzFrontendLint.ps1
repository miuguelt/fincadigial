<#!
.SYNOPSIS
    Ejecuta ESLint del frontend de forma compatible con Windows y CI.
#>
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
    npm --prefix frontend run lint -- --max-warnings=0
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
