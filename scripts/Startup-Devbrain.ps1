#Requires -Version 7.0
<#
.SYNOPSIS
    Arranque compatible de DevBrain y Villaluz para Windows nativo.
.DESCRIPTION
    Este wrapper conserva el nombre histórico, pero delega en el arranque
    canónico. PostgreSQL y Memurai son servicios nativos; WSL y Docker no se
    consultan ni se inician.
.PARAMETER Villaluz
    Inicia también Villaluz en modo daemon después del núcleo DevBrain.
.EXAMPLE
    .\Startup-Devbrain.ps1 -Villaluz
#>
param(
    [switch]$Villaluz
)

$ErrorActionPreference = 'Stop'
$Root = 'C:\Users\Miguel\Documents\Aplicaciones'
$StartScript = Join-Path $Root '_infrastructure\devbraind\mcp\START-DEVBRAIN.ps1'
$VillaluzScript = Join-Path $Root '_projects\villaluz\start-windows.ps1'

if (-not (Test-Path -LiteralPath $StartScript)) {
    throw "No se encontró el arranque canónico de DevBrain: $StartScript"
}

Write-Host '=== DevBrain — Windows native startup ===' -ForegroundColor Cyan
Write-Host 'PostgreSQL: 127.0.0.1:5434 | Memurai: 127.0.0.1:6380' -ForegroundColor DarkGray

$startArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $StartScript, '-NoBrowser')
if ($Villaluz) { $startArgs += '-Projects' }
& 'pwsh.exe' @startArgs

if ($Villaluz -and (Test-Path -LiteralPath $VillaluzScript)) {
    Write-Host 'Villaluz se solicita mediante -Projects al arranque canónico.' -ForegroundColor Green
} elseif ($Villaluz) {
    Write-Warning "No se encontró el arranque de Villaluz: $VillaluzScript"
}

Write-Host 'Arranque finalizado. DevBrain no inicia proyectos implícitamente.' -ForegroundColor Green
