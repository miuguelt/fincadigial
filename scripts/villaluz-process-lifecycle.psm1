Set-StrictMode -Version Latest

$script:VillaluzAppNames = @(
    'villaluz-backend',
    'villaluz-celery',
    'villaluz-beat',
    'villaluz-frontend'
)

function ConvertTo-VillaluzProcessToken {
    param([AllowEmptyString()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) { return '' }
    return $Value.Replace('\', '/').TrimEnd('/').ToLowerInvariant()
}

function Test-VillaluzOwnedProcess {
    param(
        [Parameter(Mandatory)][object]$Process,
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$PythonExe
    )

    $name = [string]$Process.Name
    $executable = ConvertTo-VillaluzProcessToken ([string]$Process.ExecutablePath)
    $expectedPython = ConvertTo-VillaluzProcessToken $PythonExe
    if ($name -ieq 'python.exe' -and $executable -eq $expectedPython) {
        return $true
    }

    if ($name -ine 'node.exe') { return $false }
    $commandLine = ConvertTo-VillaluzProcessToken ([string]$Process.CommandLine)
    $project = ConvertTo-VillaluzProcessToken $ProjectRoot
    $vite = "$project/frontend/node_modules/vite/bin/vite.js"
    return $commandLine.Contains($vite) -or (
        $commandLine.Contains("$project/frontend/") -and
        $commandLine.Contains('/vite')
    )
}

function Get-VillaluzOwnedProcessIds {
    param(
        [Parameter(Mandatory)][object[]]$Processes,
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$PythonExe
    )

    $owned = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($process in $Processes) {
        if (Test-VillaluzOwnedProcess $process $ProjectRoot $PythonExe) {
            [void]$owned.Add([int]$process.ProcessId)
        }
    }

    do {
        $added = $false
        foreach ($process in $Processes) {
            if ($owned.Contains([int]$process.ParentProcessId) -and
                $owned.Add([int]$process.ProcessId)) {
                $added = $true
            }
        }
    } while ($added)

    return @($owned)
}

function Stop-VillaluzOwnedProcesses {
    param(
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$PythonExe
    )

    $stopped = [System.Collections.Generic.List[int]]::new()
    for ($pass = 1; $pass -le 3; $pass++) {
        $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
        $ownedIds = @(Get-VillaluzOwnedProcessIds $processes $ProjectRoot $PythonExe)
        if ($ownedIds.Count -eq 0) { return @($stopped) }

        $remaining = [System.Collections.Generic.HashSet[int]]::new()
        foreach ($processId in $ownedIds) { [void]$remaining.Add($processId) }
        while ($remaining.Count -gt 0) {
            $leaves = @($remaining | Where-Object {
                $candidate = $_
                -not ($processes | Where-Object {
                    $remaining.Contains([int]$_.ProcessId) -and
                    [int]$_.ParentProcessId -eq $candidate
                })
            })
            if ($leaves.Count -eq 0) { $leaves = @($remaining) }

            foreach ($processId in $leaves) {
                try {
                    Stop-Process -Id $processId -Force -ErrorAction Stop
                    $stopped.Add($processId)
                } catch {
                    if (Get-Process -Id $processId -ErrorAction SilentlyContinue) {
                        throw
                    }
                }
                [void]$remaining.Remove($processId)
            }
        }
        Start-Sleep -Milliseconds 500
    }

    $survivors = @(Get-VillaluzOwnedProcessIds `
        @(Get-CimInstance Win32_Process -ErrorAction Stop) `
        $ProjectRoot `
        $PythonExe)
    if ($survivors.Count -gt 0) {
        throw "Persisten procesos Villaluz después de la limpieza: $($survivors -join ', ')."
    }
    return @($stopped)
}

function Test-VillaluzAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-VillaluzElevatedStop {
    param([Parameter(Mandatory)][string]$ScriptPath)

    $pwsh = (Get-Command pwsh.exe -ErrorAction Stop).Source
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $pwsh
    $startInfo.Verb = 'RunAs'
    $startInfo.UseShellExecute = $true
    foreach ($argument in @(
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        $ScriptPath,
        '-Stop'
    )) {
        [void]$startInfo.ArgumentList.Add($argument)
    }

    $process = [Diagnostics.Process]::Start($startInfo)
    $process.WaitForExit()
    return $process.ExitCode
}

function Test-VillaluzPm2Daemon {
    param([Parameter(Mandatory)][string]$Pm2Home)

    $pidPath = Join-Path $Pm2Home 'pm2.pid'
    if (-not (Test-Path -LiteralPath $pidPath)) { return $false }
    $pm2ProcessId = 0
    $rawPid = Get-Content -LiteralPath $pidPath -Raw -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($rawPid)) { return $false }
    if (-not [int]::TryParse($rawPid.Trim(), [ref]$pm2ProcessId)) { return $false }
    return $null -ne (Get-Process -Id $pm2ProcessId -ErrorAction SilentlyContinue)
}

function Stop-VillaluzPm2Apps {
    param(
        [Parameter(Mandatory)][string]$NpxExe,
        [Parameter(Mandatory)][string[]]$Pm2Homes,
        [Parameter(Mandatory)][string]$ScopedPm2Home
    )

    $previousPm2Home = $env:PM2_HOME
    try {
        foreach ($pm2Home in $Pm2Homes | Select-Object -Unique) {
            if (-not (Test-VillaluzPm2Daemon $pm2Home)) { continue }
            $env:PM2_HOME = $pm2Home
            foreach ($appName in $script:VillaluzAppNames) {
                & $NpxExe pm2 delete $appName 2>&1 | Out-Null
            }
            if ($pm2Home -eq $ScopedPm2Home) {
                & $NpxExe pm2 kill 2>&1 | Out-Null
            }
        }
    } finally {
        $env:PM2_HOME = $previousPm2Home
    }
}

function Enter-VillaluzLifecycleLock {
    $mutex = [Threading.Mutex]::new($false, 'Local\DevBrain.Villaluz.Lifecycle')
    if (-not $mutex.WaitOne(0)) {
        $mutex.Dispose()
        throw 'Otra operacion de inicio o detencion de Villaluz esta en curso.'
    }
    return $mutex
}

function Exit-VillaluzLifecycleLock {
    param([Parameter(Mandatory)][Threading.Mutex]$Mutex)

    $Mutex.ReleaseMutex()
    $Mutex.Dispose()
}

Export-ModuleMember -Function @(
    'Enter-VillaluzLifecycleLock',
    'Exit-VillaluzLifecycleLock',
    'Get-VillaluzOwnedProcessIds',
    'Invoke-VillaluzElevatedStop',
    'Stop-VillaluzOwnedProcesses',
    'Stop-VillaluzPm2Apps',
    'Test-VillaluzAdministrator',
    'Test-VillaluzOwnedProcess'
)
