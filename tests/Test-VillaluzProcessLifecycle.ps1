$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$modulePath = Join-Path $projectRoot 'scripts\villaluz-process-lifecycle.psm1'
$pythonPath = Join-Path $projectRoot 'backend\venv_win\Scripts\python.exe'

Import-Module $modulePath -Force

function Assert-Equal {
    param(
        [Parameter(Mandatory)]$Expected,
        [Parameter(Mandatory)]$Actual,
        [Parameter(Mandatory)][string]$Message
    )

    if ($Expected -ne $Actual) {
        throw "$Message (esperado=$Expected, actual=$Actual)"
    }
}

$ownedPython = [pscustomobject]@{
    Name = 'pythonw.exe'
    ProcessId = 101
    ParentProcessId = 1
    ExecutablePath = $pythonPath
    CommandLine = "`"$pythonPath`" -m celery -A celery_worker.celery worker"
}
$foreignPython = [pscustomobject]@{
    Name = 'python.exe'
    ProcessId = 102
    ParentProcessId = 1
    ExecutablePath = 'C:\Python312\python.exe'
    CommandLine = 'python wsgi.py'
}
$ownedVite = [pscustomobject]@{
    Name = 'node.exe'
    ProcessId = 103
    ParentProcessId = 1
    ExecutablePath = 'C:\Program Files\nodejs\node.exe'
    CommandLine = "node `"$projectRoot\frontend\node_modules\vite\bin\vite.js`" --port 3005"
}
$foreignNode = [pscustomobject]@{
    Name = 'node.exe'
    ProcessId = 104
    ParentProcessId = 1
    ExecutablePath = 'C:\Program Files\nodejs\node.exe'
    CommandLine = 'node C:\other\frontend\node_modules\vite\bin\vite.js --port 3005'
}
$ownedChild = [pscustomobject]@{
    Name = 'python.exe'
    ProcessId = 105
    ParentProcessId = 101
    ExecutablePath = 'C:\Python312\python.exe'
    CommandLine = 'python child.py'
}

Assert-Equal $true (Test-VillaluzOwnedProcess $ownedPython $projectRoot $pythonPath) `
    'El Python GUI del venv Villaluz debe ser propio'
Assert-Equal $false (Test-VillaluzOwnedProcess $foreignPython $projectRoot $pythonPath) `
    'Un Python externo con wsgi.py no debe ser propio'
Assert-Equal $true (Test-VillaluzOwnedProcess $ownedVite $projectRoot $pythonPath) `
    'El Vite exacto de Villaluz debe ser propio'
Assert-Equal $false (Test-VillaluzOwnedProcess $foreignNode $projectRoot $pythonPath) `
    'Un Vite externo no debe ser propio'

$ownedIds = @(Get-VillaluzOwnedProcessIds `
    @($ownedPython, $foreignPython, $ownedVite, $foreignNode, $ownedChild) `
    $projectRoot `
    $pythonPath)
Assert-Equal 3 $ownedIds.Count 'Debe incluir raíces propias y sus descendientes'
Assert-Equal $true ($ownedIds -contains 101) 'Falta el worker Villaluz'
Assert-Equal $true ($ownedIds -contains 103) 'Falta Vite Villaluz'
Assert-Equal $true ($ownedIds -contains 105) 'Falta un descendiente de Villaluz'

$pidRoot = Join-Path ([IO.Path]::GetTempPath()) ("villaluz-pid-test-" + [guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $pidRoot -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $pidRoot 'backend-0.pid') -Value '201'
    Set-Content -LiteralPath (Join-Path $pidRoot 'frontend-3.pid') -Value '202'
    Set-Content -LiteralPath (Join-Path $pidRoot 'stale.pid') -Value '999'
    $hiddenBackend = [pscustomobject]@{ Name = 'pythonw.exe'; ProcessId = 201; ParentProcessId = 1; ExecutablePath = ''; CommandLine = '' }
    $hiddenFrontend = [pscustomobject]@{ Name = 'node.exe'; ProcessId = 202; ParentProcessId = 1; ExecutablePath = ''; CommandLine = '' }
    $hiddenIds = @(Get-VillaluzRuntimeProcessIds `
        @($hiddenBackend, $hiddenFrontend) `
        $projectRoot `
        $pythonPath `
        $pidRoot)
    Assert-Equal 2 $hiddenIds.Count 'Debe recuperar procesos elevados desde PID files validados'
    Assert-Equal $true ($hiddenIds -contains 201) 'Falta backend elevado'
    Assert-Equal $true ($hiddenIds -contains 202) 'Falta frontend elevado'
} finally {
    if (Test-Path -LiteralPath $pidRoot) { Remove-Item -LiteralPath $pidRoot -Recurse -Force }
}

$rotationRoot = Join-Path ([IO.Path]::GetTempPath()) ("villaluz-log-test-" + [guid]::NewGuid().ToString('N'))
try {
    $pm2LogRoot = Join-Path $rotationRoot 'pm2\logs'
    New-Item -ItemType Directory -Path $pm2LogRoot -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $rotationRoot 'backend.log') -Value 'historical backend error'
    Set-Content -LiteralPath (Join-Path $pm2LogRoot 'villaluz-backend-error.log') -Value 'duplicate pm2 error'
    Set-Content -LiteralPath (Join-Path $rotationRoot 'unmanaged.log') -Value 'keep me'

    $rotation = Invoke-VillaluzLogRotation -LogDir $rotationRoot
    Assert-Equal 2 $rotation.MovedCount 'Debe rotar logs administrados y duplicados PM2'
    Assert-Equal $false (Test-Path (Join-Path $rotationRoot 'backend.log')) `
        'El log combinado heredado debe salir de la sesión activa'
    Assert-Equal $true (Test-Path (Join-Path $rotationRoot 'unmanaged.log')) `
        'No debe mover logs ajenos al runtime administrado'
    Assert-Equal $true (Test-Path (Join-Path $rotation.ArchivePath 'archive.json')) `
        'Cada rotación debe incluir un manifiesto'
} finally {
    if (Test-Path -LiteralPath $rotationRoot) {
        Remove-Item -LiteralPath $rotationRoot -Recurse -Force
    }
}

Write-Output 'PASS: process ownership and bounded log rotation are correct.'
