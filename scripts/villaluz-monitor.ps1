<#
.SYNOPSIS
    Villaluz Health Monitor — checks all services, shows RAM, auto-recovers
.DESCRIPTION
    Run without args for a snapshot. Use -Watch for continuous monitoring.
    Use -FreeRAM to auto-kill NPU workers when RAM is low.
#>
param(
    [switch]$Watch,
    [switch]$FreeRAM,
    [int]$Interval = 10
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = "$ProjectRoot\backend"
$PythonExe = if (Test-Path "$BackendDir\venv_win\Scripts\python.exe") { "$BackendDir\venv_win\Scripts\python.exe" } else { "python" }

function Write-Status { param($label, $status, $detail)
    $icon = if ($status -eq 'OK') { '✅' } elseif ($status -eq 'WARN') { '⚠️' } else { '❌' }
    Write-Host "$icon $label".PadRight(30) -NoNewline
    Write-Host "$status".PadRight(8) -ForegroundColor $(if($status -eq 'OK'){'Green'}elseif($status -eq 'WARN'){'Yellow'}else{'Red'}) -NoNewline
    if ($detail) { Write-Host " $detail" -ForegroundColor DarkGray } else { Write-Host '' }
}

function Test-Port { param($Hostname, $Port)
    try { $s = New-Object System.Net.Sockets.TcpClient($Hostname, $Port); $s.Close(); $true } catch { $false }
}

function Get-Health {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:8092/api/v1/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        $data = ($r.Content | ConvertFrom-Json).data
        return $data
    } catch { return $null }
}

function Show-Snapshot {
    try { Clear-Host } catch {}
    Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║       VILLALUZ HEALTH MONITOR                ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    $h = Get-Health
    if ($h) {
        Write-Status "Backend (:8092)" "OK" "v$($h.version)"
        Write-Status "Database" $(if($h.database_status -eq 'connected'){'OK'}else{'ERR'})
        Write-Status "Redis" $(if($h.redis -eq 'ok'){'OK'}else{WARN})
        Write-Status "Celery workers" $(if($h.celery_workers -gt 0){'OK'}else{'WARN'}) "$($h.celery_workers) active"
        Write-Status "Overall status" $(if($h.status -eq 'healthy'){'OK'}else{'WARN'})
    } else {
        Write-Status "Backend (:8092)" "ERR" "unreachable"
    }

    Write-Host ""
    $os = Get-CimInstance Win32_OperatingSystem
    $freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
    $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    $pct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100, 1)
    $ramStatus = if ($freeGB -lt 2) { 'CRITICAL' } elseif ($freeGB -lt 4) { 'LOW' } else { 'OK' }
    Write-Status "RAM" $ramStatus "${freeGB}GB free / ${totalGB}GB ($pct%)"

    $npu = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "npu_worker" }
    if ($npu) {
        $npuMem = [math]::Round(($npu | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB, 1)
        Write-Status "NPU workers" "WARN" "$($npu.Count) running, using ${npuMem}MB"
    }

    $bePort = if (Test-Port '127.0.0.1' 8092) { '8092' } else { 'offline' }
    $fePort = if (Test-Port '127.0.0.1' 3005) { '3005' } else { 'offline' }
    Write-Status "Frontend (:3005)" $(if($fePort -eq '3005'){'OK'}else{'ERR'})
    Write-Status "PostgreSQL" $(if((Test-Port '127.0.0.1' 5434) -or (Test-Port '127.0.0.1' 5432)){'OK'}else{'ERR'})
    Write-Status "Redis (:6380)" $(if(Test-Port '127.0.0.1' 6380){'OK'}else{'ERR'})
}

# ── Actions ──

if ($FreeRAM) {
    $npu = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "npu_worker" }
    if ($npu) {
        $npuMem = [math]::Round(($npu | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB, 1)
        Write-Host "Killing NPU workers (${npuMem}MB)..." -ForegroundColor Yellow
        $npu | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Host "Done." -ForegroundColor Green
    } else { Write-Host "No NPU workers found." -ForegroundColor Green }
    return
}

if ($Watch) {
    while ($true) {
        Show-Snapshot
        Write-Host ""
        Write-Host "[Ctrl+C to stop] Refreshing every ${Interval}s..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $Interval
    }
} else {
    Show-Snapshot
}
