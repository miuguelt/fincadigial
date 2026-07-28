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
    Name = 'python.exe'
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
    'El Python del venv Villaluz debe ser propio'
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

Write-Output 'PASS: Villaluz process ownership is exact and includes descendants.'
