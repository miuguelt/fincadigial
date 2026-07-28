<#
.SYNOPSIS
    DevBrain SDLC Audit Protocol (Windows PowerShell)
    Auditoria post-refactorizacion: verifica TypeScript + Python syntax.
    Optimizado: usa invocacion directa en vez de Start-Process.
#>
param(
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Fast
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
$sw = [System.Diagnostics.Stopwatch]::StartNew()

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  DevBrain SDLC Audit Protocol" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

$exitCode = 0

# 1. Frontend TypeScript Check
if (-not $SkipFrontend -and (Test-Path "$ProjectRoot\frontend")) {
    Write-Host "`n[1/2] Verificando Frontend (TypeScript Check)..." -ForegroundColor Yellow
    Push-Location "$ProjectRoot\frontend"
    try {
        if ($Fast) {
            # Fast mode: solo verificar que tsc existe
            $tscPath = Join-Path $ProjectRoot "frontend\node_modules\.bin\tsc.cmd"
            if (Test-Path $tscPath) {
                Write-Host "   tsc disponible" -ForegroundColor Green
            } else {
                Write-Host "   tsc no disponible - skip" -ForegroundColor Yellow
            }
        } else {
            $output = & npm run type-check 2>&1
            if ($LASTEXITCODE -ne 0) {
                Write-Host "   FALLO: Existen errores de TypeScript." -ForegroundColor Red
                $output | Select-Object -Last 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
                $exitCode = 1
            } else {
                Write-Host "   OK - Ninguna regresion de tipos." -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
        $exitCode = 1
    }
    Pop-Location
} else {
    Write-Host "`n[1/2] Skip Frontend" -ForegroundColor DarkGray
}

# 2. Backend Python syntax check
if (-not $SkipBackend -and (Test-Path "$ProjectRoot\backend")) {
    Write-Host "`n[2/2] Verificando Backend (Python syntax)..." -ForegroundColor Yellow
    $pythonExe = $null
    foreach ($p in @("$ProjectRoot\backend\venv_win\Scripts\python.exe", "python")) {
        if (Get-Command $p -ErrorAction SilentlyContinue) { $pythonExe = $p; break }
    }
    if ($pythonExe) {
        Push-Location "$ProjectRoot\backend"
        try {
            if ($Fast) {
                # Fast mode: solo verificar archivos modificados
                $changedPy = git diff --name-only HEAD~1 -- "*.py" 2>$null
                if ($changedPy) {
                    foreach ($f in $changedPy) {
                        if (Test-Path $f) {
                            $result = & $pythonExe -c "import py_compile; py_compile.compile('$f', doraise=True)" 2>&1
                            if ($LASTEXITCODE -ne 0) {
                                Write-Host "   ERROR en $f" -ForegroundColor Red
                                $exitCode = 1
                            }
                        }
                    }
                    Write-Host "   OK - $($changedPy.Count) archivos verificados" -ForegroundColor Green
                } else {
                    Write-Host "   OK - Sin cambios en Python" -ForegroundColor Green
                }
            } else {
                $result = & $pythonExe -m compileall app/ 2>&1
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "   FALLO: Errores de sintaxis en Python." -ForegroundColor Red
                    $result | Select-Object -Last 10 | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
                    $exitCode = 1
                } else {
                    Write-Host "   OK - Sintaxis validada." -ForegroundColor Green
                }
            }
        } catch {
            Write-Host "   ERROR: $_" -ForegroundColor Red
            $exitCode = 1
        }
        Pop-Location
    } else {
        Write-Host "   SKIP: Python no disponible" -ForegroundColor Yellow
    }
} else {
    Write-Host "`n[2/2] Skip Backend" -ForegroundColor DarkGray
}

$sw.Stop()
Write-Host "`n=========================================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "  AUDITORIA EXITOSA ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Green
} else {
    Write-Host "  AUDITORIA FALLIDA ($($sw.ElapsedMilliseconds)ms)" -ForegroundColor Red
}
Write-Host "=========================================================" -ForegroundColor Cyan
exit $exitCode
