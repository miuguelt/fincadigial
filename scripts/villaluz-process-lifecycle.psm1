Set-StrictMode -Version Latest

$script:VillaluzAppNames = @(
    'villaluz-backend',
    'villaluz-celery',
    'villaluz-beat',
    'villaluz-frontend'
)

$script:VillaluzManagedLogNames = @(
    'backend.out.log',
    'backend.error.log',
    'celery_worker.out.log',
    'celery_worker.error.log',
    'celery_beat.out.log',
    'celery_beat.error.log',
    'frontend.out.log',
    'frontend.error.log',
    # Legacy combined files. They are rotated once after upgrading so old
    # tracebacks cannot leak into a new runtime session.
    'backend.log',
    'celery_worker.log',
    'celery_beat.log',
    'frontend.log'
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
    if ($name -in @('python.exe', 'pythonw.exe') -and $executable -eq $expectedPython) {
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

function Get-VillaluzRuntimeProcessIds {
    param(
        [Parameter(Mandatory)][object[]]$Processes,
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$PythonExe,
        [Parameter(Mandatory)][string]$PidDir
    )

    $owned = [System.Collections.Generic.HashSet[int]]::new()
    foreach ($processId in @(Get-VillaluzOwnedProcessIds $Processes $ProjectRoot $PythonExe)) {
        [void]$owned.Add([int]$processId)
    }

    # Elevated PM2 children expose neither ExecutablePath nor CommandLine to a
    # normal shell. Project-scoped PID files remain readable, so use them as a
    # second ownership signal while validating the expected process name.
    if (Test-Path -LiteralPath $PidDir) {
        foreach ($pidFile in @(Get-ChildItem -LiteralPath $PidDir -Filter '*.pid' -File -ErrorAction SilentlyContinue)) {
            $rawPid = Get-Content -LiteralPath $pidFile.FullName -Raw -ErrorAction SilentlyContinue
            $processId = 0
            if (-not $rawPid -or -not [int]::TryParse($rawPid.Trim(), [ref]$processId)) { continue }
            $process = $Processes | Where-Object { [int]$_.ProcessId -eq $processId } | Select-Object -First 1
            if (-not $process) { continue }
            $expectedName = if ($pidFile.Name -like 'frontend*') { 'node.exe' } else { 'pythonw.exe' }
            if ([string]$process.Name -ieq $expectedName -or
                ($expectedName -eq 'pythonw.exe' -and [string]$process.Name -ieq 'python.exe')) {
                [void]$owned.Add($processId)
            }
        }
    }

    do {
        $added = $false
        foreach ($process in $Processes) {
            if ($owned.Contains([int]$process.ParentProcessId) -and $owned.Add([int]$process.ProcessId)) {
                $added = $true
            }
        }
    } while ($added)

    return @($owned)
}

function Stop-VillaluzOwnedProcesses {
    param(
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$PythonExe,
        [Parameter(Mandatory)][string]$PidDir
    )

    $stopped = [System.Collections.Generic.List[int]]::new()
    for ($pass = 1; $pass -le 3; $pass++) {
        $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
        $ownedIds = @(Get-VillaluzRuntimeProcessIds $processes $ProjectRoot $PythonExe $PidDir)
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

    $survivors = @(Get-VillaluzRuntimeProcessIds `
        @(Get-CimInstance Win32_Process -ErrorAction Stop) `
        $ProjectRoot `
        $PythonExe `
        $PidDir)
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
            foreach ($appName in $script:VillaluzAppNames) {
                [void](Invoke-VillaluzPm2Command `
                    -NpxExe $NpxExe `
                    -Pm2Home $pm2Home `
                    -Arguments @('pm2', 'delete', $appName) `
                    -TimeoutSeconds 8)
            }
            if ($pm2Home -eq $ScopedPm2Home) {
                [void](Invoke-VillaluzPm2Command `
                    -NpxExe $NpxExe `
                    -Pm2Home $pm2Home `
                    -Arguments @('pm2', 'kill') `
                    -TimeoutSeconds 8)

                # PM2 can leave an inaccessible named pipe on Windows. The PID
                # file belongs to this project-scoped PM2_HOME, so terminating
                # that exact daemon is a safe fallback and cannot affect other
                # projects or the user's global PM2 instance.
                $pidPath = Join-Path $pm2Home 'pm2.pid'
                $pm2ProcessId = 0
                $rawPid = Get-Content -LiteralPath $pidPath -Raw -ErrorAction SilentlyContinue
                if ($rawPid -and [int]::TryParse($rawPid.Trim(), [ref]$pm2ProcessId)) {
                    Stop-Process -Id $pm2ProcessId -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } finally {
        $env:PM2_HOME = $previousPm2Home
    }
}

function Invoke-VillaluzPm2Command {
    param(
        [Parameter(Mandatory)][string]$NpxExe,
        [Parameter(Mandatory)][string]$Pm2Home,
        [Parameter(Mandatory)][string[]]$Arguments,
        [int]$TimeoutSeconds = 10
    )

    $argumentsJson = ConvertTo-Json -InputObject @($Arguments) -Compress
    $job = Start-Job -ScriptBlock {
        param($Executable, $HomePath, $CommandArgumentsJson)
        $env:PM2_HOME = $HomePath
        $CommandArguments = @(ConvertFrom-Json -InputObject $CommandArgumentsJson)
        & $Executable @CommandArguments 2>&1 | Out-Null
        [pscustomobject]@{ ExitCode = $LASTEXITCODE }
    } -ArgumentList $NpxExe, $Pm2Home, $argumentsJson

    try {
        $completed = Wait-Job -Job $job -Timeout ([Math]::Max(1, $TimeoutSeconds))
        if (-not $completed) {
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            return $false
        }
        $result = Receive-Job -Job $job | Select-Object -Last 1
        return $null -ne $result -and [int]$result.ExitCode -eq 0
    } finally {
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-VillaluzLogRotation {
    param(
        [Parameter(Mandatory)][string]$LogDir,
        [int]$RetentionDays = 7,
        [int]$MaxArchives = 10
    )

    $resolvedLogDir = [IO.Path]::GetFullPath($LogDir)
    if (-not (Test-Path -LiteralPath $resolvedLogDir)) {
        New-Item -ItemType Directory -Path $resolvedLogDir -Force | Out-Null
    }

    $archiveRoot = Join-Path $resolvedLogDir 'archive'
    $archiveRootFull = [IO.Path]::GetFullPath($archiveRoot)
    if (-not $archiveRootFull.StartsWith($resolvedLogDir, [StringComparison]::OrdinalIgnoreCase)) {
        throw "La ruta de archivo de logs salió del directorio permitido: $archiveRootFull"
    }
    New-Item -ItemType Directory -Path $archiveRootFull -Force | Out-Null

    $candidates = [System.Collections.Generic.List[IO.FileInfo]]::new()
    foreach ($name in $script:VillaluzManagedLogNames) {
        $path = Join-Path $resolvedLogDir $name
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $file = Get-Item -LiteralPath $path
            if ($file.Length -gt 0) { $candidates.Add($file) }
        }
    }

    $pm2Logs = Join-Path $resolvedLogDir 'pm2\logs'
    if (Test-Path -LiteralPath $pm2Logs) {
        foreach ($file in @(Get-ChildItem -LiteralPath $pm2Logs -Filter '*.log' -File -ErrorAction SilentlyContinue)) {
            if ($file.Length -gt 0) { $candidates.Add($file) }
        }
    }

    $moved = [System.Collections.Generic.List[string]]::new()
    $sessionDir = $null
    if ($candidates.Count -gt 0) {
        $sessionName = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss-fff'), ([guid]::NewGuid().ToString('N').Substring(0, 8))
        $sessionDir = Join-Path $archiveRootFull $sessionName
        New-Item -ItemType Directory -Path $sessionDir -Force | Out-Null

        try {
            foreach ($file in @($candidates | Sort-Object FullName -Unique)) {
                $relativePath = [IO.Path]::GetRelativePath($resolvedLogDir, $file.FullName)
                if ($relativePath.StartsWith('..')) {
                    throw "El log administrado salió del directorio permitido: $($file.FullName)"
                }
                $destination = Join-Path $sessionDir $relativePath
                $destinationParent = Split-Path $destination -Parent
                if (-not (Test-Path -LiteralPath $destinationParent)) {
                    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
                }
                Move-Item -LiteralPath $file.FullName -Destination $destination -Force -ErrorAction Stop
                $moved.Add($relativePath)
            }
        } catch {
            if ($moved.Count -eq 0 -and (Test-Path -LiteralPath $sessionDir)) {
                Remove-Item -LiteralPath $sessionDir -Recurse -Force -ErrorAction SilentlyContinue
            }
            throw
        }

        $manifest = [ordered]@{
            schema_version = 1
            archived_at = [DateTimeOffset]::Now.ToString('o')
            files = @($moved)
        }
        $manifest | ConvertTo-Json -Depth 4 | Set-Content `
            -LiteralPath (Join-Path $sessionDir 'archive.json') `
            -Encoding utf8
    }

    $cutoff = (Get-Date).AddDays(-[Math]::Max(1, $RetentionDays))
    $archives = @(Get-ChildItem -LiteralPath $archiveRootFull -Directory -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending)
    $removed = [System.Collections.Generic.List[string]]::new()
    for ($index = 0; $index -lt $archives.Count; $index++) {
        $archive = $archives[$index]
        if ($index -lt [Math]::Max(1, $MaxArchives) -and $archive.LastWriteTime -ge $cutoff) {
            continue
        }
        $archiveFull = [IO.Path]::GetFullPath($archive.FullName)
        $requiredPrefix = $archiveRootFull.TrimEnd('\') + '\'
        if (-not $archiveFull.StartsWith($requiredPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Se rechazó eliminar una ruta fuera del archivo de logs: $archiveFull"
        }
        Remove-Item -LiteralPath $archiveFull -Recurse -Force
        $removed.Add($archive.Name)
    }

    return [pscustomobject]@{
        ArchivePath = $sessionDir
        MovedCount = $moved.Count
        RemovedArchiveCount = $removed.Count
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
    'Get-VillaluzRuntimeProcessIds',
    'Invoke-VillaluzElevatedStop',
    'Invoke-VillaluzLogRotation',
    'Invoke-VillaluzPm2Command',
    'Stop-VillaluzOwnedProcesses',
    'Stop-VillaluzPm2Apps',
    'Test-VillaluzAdministrator',
    'Test-VillaluzPm2Daemon',
    'Test-VillaluzOwnedProcess'
)
