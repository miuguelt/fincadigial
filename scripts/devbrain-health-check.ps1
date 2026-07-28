<#
.SYNOPSIS
    DevBrain Health Check (Windows PowerShell)
    Verifica el estado de salud de todos los servicios DevBrain/Villaluz.
    Reemplaza el health_status.json estatico con verificacion en tiempo real.
#>
param(
    [switch]$Json,
    [switch]$Quick
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent

function Test-Port {
    param([int]$Port, [string]$Label)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect('127.0.0.1', $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(2000)
        if ($success) { $tcp.EndConnect($result) }
        $tcp.Close()
        return $success
    } catch { return $false }
}

function Test-Endpoint {
    param([string]$Url, [string]$Label)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 5 -ErrorAction Stop
        return @{ Online = $true; Status = "HTTP $($response.StatusCode)" }
    } catch {
        return @{ Online = $false; Status = $_.Exception.Message }
    }
}

$timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
$readable = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DevBrain Health Check" -ForegroundColor Cyan
Write-Host "  $readable" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Puertos criticos
$ports = @{
    "PostgreSQL (WSL)" = @{ Port = 5434; Mandatory = $true }
    "Redis (WSL)"      = @{ Port = 6380; Mandatory = $true }
    "Qdrant"           = @{ Port = 6333; Mandatory = $false }
    "Backend Flask"    = @{ Port = 8092; Mandatory = $true }
    "Frontend Vite"    = @{ Port = 3005; Mandatory = $true }
}

if (-not $Quick) {
    $ports["MCP OpenCode"] = @{ Port = 8017; Mandatory = $false }
    $ports["MCP Dashboard"] = @{ Port = 8091; Mandatory = $false }
}

$portResults = @{}
$openPorts = 0
$totalPorts = $ports.Count

Write-Host "`n--- Puertos ---" -ForegroundColor Yellow
foreach ($name in $ports.Keys | Sort-Object) {
    $cfg = $ports[$name]
    $isOpen = Test-Port -Port $cfg.Port -Label $name
    $portResults[$name] = @{
        Port = $cfg.Port
        Open = $isOpen
        Mandatory = $cfg.Mandatory
    }
    if ($isOpen) {
        $openPorts++
        Write-Host "   [OK] $name ($($cfg.Port))" -ForegroundColor Green
    } else {
        $color = if ($cfg.Mandatory) { "Red" } else { "Yellow" }
        $tag = if ($cfg.Mandatory) { "REQUIRED" } else { "optional" }
        Write-Host "   [FAIL] $name ($($cfg.Port)) - $tag" -ForegroundColor $color
    }
}

# Endpoints
Write-Host "`n--- Endpoints ---" -ForegroundColor Yellow
$endpoints = @{
    "Backend API" = @{ Url = "http://localhost:8092/api/v1/health/"; Mandatory = $true }
    "Frontend UI" = @{ Url = "http://localhost:3005"; Mandatory = $true }
}

$endpointResults = @{}
foreach ($name in $endpoints.Keys | Sort-Object) {
    $cfg = $endpoints[$name]
    $result = Test-Endpoint -Url $cfg.Url -Label $name
    $endpointResults[$name] = @{
        Online = $result.Online
        Status = $result.Status
        Healthy = $result.Online
    }
    if ($result.Online) {
        Write-Host "   [OK] $name - $($result.Status)" -ForegroundColor Green
    } else {
        $color = if ($cfg.Mandatory) { "Red" } else { "Yellow" }
        Write-Host "   [FAIL] $name - $($result.Status)" -ForegroundColor $color
    }
}

# WSL status
Write-Host "`n--- WSL ---" -ForegroundColor Yellow
$wslActive = $false
try {
    $wslOut = wsl --list --verbose 2>$null
    if ($wslOut -match "Running") { $wslActive = $true }
    Write-Host "   WSL: $(if($wslActive){'Running'}else{'Not running'})" -ForegroundColor $(if($wslActive){"Green"}else{"Yellow"})
} catch {
    Write-Host "   WSL: No disponible" -ForegroundColor Yellow
}

# Overall health
$mandatoryPortsOk = ($portResults.GetEnumerator() | Where-Object { $_.Value.Mandatory -and $_.Value.Open }).Count
$mandatoryPortsTotal = ($portResults.GetEnumerator() | Where-Object { $_.Value.Mandatory }).Count
$endpointsOk = ($endpointResults.GetEnumerator() | Where-Object { $_.Value.Online }).Count
$endpointsTotal = $endpointResults.Count

$overallHealth = "HEALTHY"
if ($mandatoryPortsOk -lt $mandatoryPortsTotal -or $endpointsOk -lt $endpointsTotal) {
    $overallHealth = "DEGRADED"
}
if ($mandatoryPortsOk -eq 0) { $overallHealth = "DOWN" }

Write-Host "`n========================================" -ForegroundColor Cyan
$color = switch ($overallHealth) {
    "HEALTHY" { "Green" }
    "DEGRADED" { "Yellow" }
    "DOWN" { "Red" }
}
Write-Host "  Overall: $overallHealth" -ForegroundColor $color
Write-Host "  Ports: $openPorts/$totalPorts | Endpoints: $endpointsOk/$endpointsTotal" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

# Output JSON si se pide
if ($Json) {
    $output = @{
        timestamp = $timestamp
        readable_time = $readable
        overall_health = $overallHealth
        wsl_active = $wslActive
        metrics = @{
            ports_open = "$openPorts/$totalPorts"
            endpoints_online = "$endpointsOk/$endpointsTotal"
        }
        ports = $portResults
        endpoints = $endpointResults
    }
    $jsonPath = Join-Path $ProjectRoot "maintenance\devbrain_health_status.json"
    $output | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding utf8 -Force
    Write-Host "`nJSON guardado en: $jsonPath" -ForegroundColor DarkGray
}
