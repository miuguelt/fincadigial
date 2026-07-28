<#
.SYNOPSIS
    DevBrain Process Manager Module
    Funciones reutilizables para gestion de procesos Windows.
#>

function Write-Log {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor $Color
}

function Load-EnvFile {
    param([string]$Path)
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line -like "*=*") {
                $idx = $line.IndexOf("=")
                $key = $line.Substring(0, $idx).Trim()
                $val = $line.Substring($idx + 1).Trim()
                if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
                elseif ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
                [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
            }
        }
    }
}

function Kill-ProcessesByCommandLine {
    param([string]$ProcessName, [string]$Pattern)
    Get-CimInstance Win32_Process -Filter "name='$ProcessName'" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -match $Pattern
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Test-PortReachable {
    param([int]$Port, [string]$Host = "127.0.0.1")
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect($Host, $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(2000)
        if ($success) { $tcp.EndConnect($result) }
        $tcp.Close()
        return $success
    } catch { return $false }
}

function Start-TransparentProcess {
    param(
        [string]$FilePath,
        [string]$Arguments,
        [string]$WorkingDir,
        [string]$LogPath,
        [string]$Label,
        [ConsoleColor]$Color = "Gray"
    )
    $logParent = Split-Path $LogPath -Parent
    if (-not (Test-Path $logParent)) { New-Item -ItemType Directory -Path $logParent -Force | Out-Null }
    Remove-Item -LiteralPath $LogPath -Force -ErrorAction SilentlyContinue

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FilePath
    $psi.Arguments = $Arguments
    $psi.WorkingDirectory = $WorkingDir
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    Get-ChildItem -Path Env:* | ForEach-Object { $psi.EnvironmentVariables[$_.Name] = $_.Value }

    $p = New-Object System.Diagnostics.Process
    $p.StartInfo = $psi

    $logWriter = $null
    $fs = $null
    for ($retry = 0; $retry -lt 5; $retry++) {
        try {
            $fs = [System.IO.FileStream]::new($LogPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
            $logWriter = [System.IO.StreamWriter]::new($fs, [System.Text.UTF8Encoding]::new($false))
            break
        } catch {
            if ($retry -eq 4) {
                Write-Warning "No se pudo abrir log ${LogPath}: $_"
                $tempLog = [System.IO.Path]::GetTempFileName()
                $fs = [System.IO.FileStream]::new($tempLog, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
                $logWriter = [System.IO.StreamWriter]::new($fs, [System.Text.UTF8Encoding]::new($false))
            }
            Start-Sleep -Milliseconds 500
        }
    }

    $p.add_OutputDataReceived({
        param($sender, $e)
        if ($e.Data) {
            if (-not [Console]::IsOutputRedirected) {
                Write-Host "[$Label] $($e.Data)" -ForegroundColor $Color
            }
            try { $logWriter.WriteLine($e.Data); $logWriter.Flush() } catch {}
        }
    })
    $p.add_ErrorDataReceived({
        param($sender, $e)
        if ($e.Data) {
            if (-not [Console]::IsOutputRedirected) {
                Write-Host "[$Label] $($e.Data)" -ForegroundColor "Red"
            }
            try { $logWriter.WriteLine($e.Data); $logWriter.Flush() } catch {}
        }
    })

    $p.EnableRaisingEvents = $true
    $p.add_Exited({
        try { $logWriter.Close(); $fs.Close() } catch {}
    })

    $p.Start() | Out-Null
    $p.BeginOutputReadLine()
    $p.BeginErrorReadLine()
    Write-Log "$Label started (PID $($p.Id))" "Green"
    return $p
}

function Stop-DockerContainers {
    $job = Start-Job -ScriptBlock {
        wsl docker compose -f /mnt/c/Users/Miguel/Documents/Aplicaciones/_projects/villaluz/docker-compose.yml down --remove-orphans 2>$null | Out-Null
        wsl docker rm villaluz_frontend villaluz_backend villaluz_celery_worker villaluz_celery_beat 2>$null | Out-Null
    }
    Wait-Job $job -Timeout 8 | Out-Null; Remove-Job $job -Force -ErrorAction SilentlyContinue
}

function Ensure-Dependencies {
    param([string]$LogDir)
    Write-Log "Checking database and cache dependencies..." "Yellow"
    
    $pgOk = $false
    foreach ($p in @($env:DB_PORT, "5434", "5432", "5433")) {
        if ($p -and $p -gt 0 -and (Test-PortReachable -Port $p)) {
            $env:DB_PORT = $p; $pgOk = $true; break
        }
    }
    if (-not $pgOk) {
        Write-Log "PostgreSQL not reachable. Starting container..." "Yellow"
        wsl docker start postgres_prod_central_v18 2>&1 | Out-Null
        $maxWait = 12; $waited = 0
        while ($waited -lt $maxWait) {
            foreach ($p in @("5434", "5432", "5433")) {
                if (Test-PortReachable -Port $p) { $env:DB_PORT = $p; $pgOk = $true; break }
            }
            if ($pgOk) { break }
            Start-Sleep -Seconds 1; $waited++
        }
        if ($pgOk) { Write-Log "PostgreSQL started on port $env:DB_PORT" "Green" }
        else { Write-Log "WARNING: PostgreSQL could not be started." "Yellow" }
    } else {
        Write-Log "PostgreSQL online on port $env:DB_PORT" "Green"
    }

    $redisOk = Test-PortReachable -Port 6380
    if (-not $redisOk) {
        Write-Log "Redis not reachable. Starting Docker devbrain-redis..." "Yellow"
        wsl docker start devbrain-redis 2>$null
        if (-not (Test-PortReachable -Port 6380)) {
            wsl docker compose -f /mnt/c/Users/Miguel/Documents/Aplicaciones/_infrastructure/devbraind/mcp/docker-compose.infra.yml up -d redis 2>$null | Out-Null
        }
        $maxWait = 10; $waited = 0
        while ($waited -lt $maxWait) {
            if (Test-PortReachable -Port 6380) { $redisOk = $true; break }
            Start-Sleep -Seconds 1; $waited++
        }
        if ($redisOk) { Write-Log "Redis started (Docker devbrain-redis) on port 6380" "Green" }
        else { Write-Log "WARNING: Redis could not be started via Docker." "Yellow" }
    } else {
        Write-Log "Redis online on port 6380" "Green"
    }
}

Export-ModuleMember -Function Write-Log, Load-EnvFile, Kill-ProcessesByCommandLine, Test-PortReachable, Start-TransparentProcess, Stop-DockerContainers, Ensure-Dependencies
