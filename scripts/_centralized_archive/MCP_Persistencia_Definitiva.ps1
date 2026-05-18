#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Install, [switch]$Uninstall, [switch]$Start, [switch]$Stop, [switch]$Status, [switch]$Test, [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $RootDir "logs"
$MCPBasePath = "C:\Users\Miguel\Documents\Aplicaciones\_infrastructure\mcp"

# Configuración de servicios (Rutas actualizadas a la nueva estructura)
$Services = @(
    @{ Name = "dashboard-server"; Exe = "go/dashboard-server/dashboard-server-v2.exe"; Port = 8091; Delay = 0; Critical = $true },
    @{ Name = "mcp-gateway"; Exe = "go/mcp-gateway/mcp-gateway.exe"; Port = 7777; Delay = 3; Critical = $true },
    @{ Name = "mcp-gpu-bridge"; Exe = "go/mcp-gpu-bridge/mcp-gpu-bridge.exe"; Port = 7800; Delay = 6; Critical = $false },
    @{ Name = "mcp-npu-bridge"; Exe = "go/mcp-npu-bridge/mcp-npu-bridge.exe"; Port = 7801; Delay = 9; Critical = $false }
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    if (!(Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
    Add-Content -Path (Join-Path $LogDir "mcp_persistencia.log") -Value $logEntry -ErrorAction SilentlyContinue
    $color = switch ($Level) { "ERROR" {"Red"}; "WARN" {"Yellow"}; "SUCCESS" {"Green"}; default {"Cyan"} }
    Write-Host $logEntry -ForegroundColor $color
}

function Test-ServiceHealth {
    param([int]$Port)
    try { $res = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/health" -Method Get -TimeoutSec 2; return @{ Healthy = $true } }
    catch { return @{ Healthy = $false } }
}

function Start-MCPService {
    param([hashtable]$Service)
    $exePath = Join-Path $MCPBasePath $Service.Exe
    if (!(Test-Path $exePath)) { Write-Log "No encontrado: $exePath" "ERROR"; return $false }

    $proc = Get-Process | Where-Object { $_.Path -eq $exePath } | Select-Object -First 1
    if ($proc) { Write-Log "$($Service.Name) ya corre (PID: $($proc.Id))" "SUCCESS"; return $true }

    if ($Service.Delay -gt 0) { Start-Sleep -Seconds $Service.Delay }
    try {
        # Limpiar variables de entorno conflictivas para servicios específicos
        $envCopy = @{}
        if ($Service.Name -eq "mcp-gpu-bridge") {
            $oldPort = $env:PORT
            $env:PORT = "7800"
            $env:GPU_PORT = "7800"
        }

        $p = Start-Process -FilePath $exePath -WindowStyle Hidden -PassThru

        if ($Service.Name -eq "mcp-gpu-bridge") {
            $env:PORT = $oldPort
        }

        Write-Log "$($Service.Name) iniciado (PID: $($p.Id))" "SUCCESS"
        return $true
    } catch {
        Write-Log "Error en $($Service.Name): $($_.Exception.Message)" "ERROR"
        return $false
    }
}

if ($Start) {
    Write-Log "=== INICIANDO SERVICIOS VILLA LUZ (SSoT) ===" "INFO"
    foreach ($svc in $Services) { Start-MCPService -Service $svc | Out-Null }
} elseif ($Stop) {
    foreach ($svc in $Services) { 
        $exePath = Join-Path $MCPBasePath $svc.Exe
        Get-Process | Where-Object { $_.Path -eq $exePath } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
    Write-Log "Servicios detenidos." "WARN"
} elseif ($Status) {
    foreach ($svc in $Services) {
        $exePath = Join-Path $MCPBasePath $svc.Exe
        $proc = Get-Process | Where-Object { $_.Path -eq $exePath }
        $health = Test-ServiceHealth -Port $svc.Port
        $st = if ($proc -and $health.Healthy) { "✅ OK" } elseif ($proc) { "⚠️ NO HEALTH" } else { "❌ DOWN" }
        Write-Log "$($svc.Name): $st"
    }
} else {
    Write-Host "Uso: -Start, -Stop, -Status" -ForegroundColor Yellow
}
