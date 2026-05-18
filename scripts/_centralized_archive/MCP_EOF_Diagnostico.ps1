#Requires -Version 5.1
<#
.SYNOPSIS
    Diagnóstico de errores EOF en MCPs DevBrain
    
.DESCRIPTION
    Identifica qué MCPs lanzan errores de transporte y EOF,
    analiza las causas raíz y propone soluciones.

.OUTPUTS
    Reporte detallado en logs/mcp_eof_diagnostico_<fecha>.json
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$LogDir = Join-Path $RootDir "logs"
$ReportFile = Join-Path $LogDir "mcp_eof_diagnostico_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"

Write-Host "=== DIAGNÓSTICO DE ERRORES EOF EN MCPs ===" -ForegroundColor Cyan
Write-Host "Analizando causas de transport closed...`n" -ForegroundColor Gray

$Results = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    System = @{}
    MCPs = @()
    EOF_Causes = @()
    Recommendations = @()
}

# 1. Información del sistema
Write-Host "[1/5] Recopilando información del sistema..." -ForegroundColor Yellow
$Results.System = @{
    OS = (Get-CimInstance Win32_OperatingSystem).Caption
    PowerShellVersion = $PSVersionTable.PSVersion.ToString()
    User = $env:USERNAME
    Machine = $env:COMPUTERNAME
    ProcessCount = (Get-Process).Count
}

# 2. Detectar MCPs instalados
Write-Host "[2/5] Buscando MCPs DevBrain..." -ForegroundColor Yellow
$MCPBasePath = "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp"
$MCPTypes = @(
    @{ Name = "dashboard-server-v2"; Pattern = "*dashboard-server*.exe"; Transport = "HTTP"; Port = 8091 },
    @{ Name = "mcp-lightning-proxy-v3"; Pattern = "*lightning-proxy*.exe"; Transport = "STDIO"; Port = $null },
    @{ Name = "mcp-gateway"; Pattern = "*gateway*.exe"; Transport = "HTTP"; Port = 7800 },
    @{ Name = "mcp-gpu-bridge"; Pattern = "*gpu-bridge*.exe"; Transport = "HTTP"; Port = 7801 },
    @{ Name = "mcp-npu-bridge"; Pattern = "*npu-bridge*.exe"; Transport = "HTTP"; Port = 7802 },
    @{ Name = "mcp-core"; Pattern = "*mcp-core*.exe"; Transport = "STDIO"; Port = $null },
    @{ Name = "mcp-ai"; Pattern = "*mcp-ai*.exe"; Transport = "STDIO"; Port = $null }
)

foreach ($mcpType in $MCPTypes) {
    $exes = Get-ChildItem -Path $MCPBasePath -Recurse -Filter $mcpType.Pattern -ErrorAction SilentlyContinue
    
    foreach ($exe in $exes) {
        $processes = Get-Process | Where-Object { $_.ProcessName -like "*$($mcpType.Name)*" }
        
        foreach ($proc in $processes) {
            $mcpInfo = @{
                Type = $mcpType.Name
                Name = $proc.ProcessName
                ProcessId = $proc.Id
                Transport = $mcpType.Transport
                Port = $mcpType.Port
                ExecutablePath = $exe.FullName
                StartTime = $proc.StartTime
                MemoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
                Responding = $proc.Responding
                EOF_Risk = "Unknown"
                EOF_Reason = ""
                HealthStatus = "Unknown"
                LastError = $null
            }
            
            # Evaluar riesgo de EOF
            if ($mcpType.Transport -eq "STDIO") {
                $mcpInfo.EOF_Risk = "HIGH"
                $mcpInfo.EOF_Reason = "Transporte STDIO - vulnerable a cierre de IDE padre"
                $mcpInfo.HealthStatus = "N/A (STDIO)"
            } elseif ($mcpType.Transport -eq "HTTP" -and $mcpType.Port) {
                try {
                    $null = Invoke-RestMethod -Uri "http://127.0.0.1:$($mcpType.Port)/health" -TimeoutSec 2 -ErrorAction Stop
                    $mcpInfo.EOF_Risk = "LOW"
                    $mcpInfo.EOF_Reason = "HTTP endpoint responde correctamente"
                    $mcpInfo.HealthStatus = "OK"
                } catch {
                    $mcpInfo.EOF_Risk = "MEDIUM"
                    $mcpInfo.EOF_Reason = "HTTP endpoint no responde - posible proceso zombie"
                    $mcpInfo.HealthStatus = "ERROR"
                    $mcpInfo.LastError = $_.Exception.Message
                }
            }
            
            $Results.MCPs += $mcpInfo
        }
        
        # Si no hay procesos pero existe el exe
        if (-not $processes -and $exe) {
            $Results.MCPs += @{
                Type = $mcpType.Name
                Name = $exe.BaseName
                ProcessId = $null
                Transport = $mcpType.Transport
                Port = $mcpType.Port
                ExecutablePath = $exe.FullName
                StartTime = $null
                MemoryMB = $null
                Responding = $false
                EOF_Risk = if ($mcpType.Transport -eq "STDIO") { "HIGH (Not Running)" } else { "MEDIUM (Not Running)" }
                EOF_Reason = "Proceso no está ejecutándose"
                HealthStatus = "Not Running"
                LastError = $null
            }
        }
    }
}

# 3. Análisis de causas EOF
Write-Host "[3/5] Analizando causas de errores EOF..." -ForegroundColor Yellow

$Results.EOF_Causes = @(
    @{
        Id = 1
        Cause = "Transporte STDIO Cerrado"
        Description = "Los MCPs usando transporte STDIO (Standard Input/Output) dependen del pipe de comunicación con el IDE padre"
        Symptom = "Error: transport error: transport closed / EOF"
        Affected = ($Results.MCPs | Where-Object { $_.Transport -eq "STDIO" }).Type
        Severity = "HIGH"
        Solution = "MCPs afectados deben reiniciarse cuando el IDE se reconecta. Considerar migrar a HTTP donde sea posible."
    },
    @{
        Id = 2
        Cause = "Procesos Huérfanos"
        Description = "MCPs iniciados por IDE quedan huérfanos cuando el IDE se cierra inesperadamente"
        Symptom = "Proceso existe pero no responde a health checks / Error de conexión"
        Affected = ($Results.MCPs | Where-Object { $_.Responding -eq $false -and $_.ProcessId }).Type
        Severity = "MEDIUM"
        Solution = "Implementar limpieza de procesos huérfanos al iniciar sesión o usar supervisor persistente."
    },
    @{
        Id = 3
        Cause = "Puertos Bloqueados"
        Description = "Servicios HTTP no pueden escuchar en puerto configurado"
        Symptom = "Error de bind: address already in use / No se puede iniciar servicio"
        Affected = @()
        Severity = "MEDIUM"
        Solution = "Liberar puertos con 'netstat -ano | findstr <puerto>' y matar proceso ocupante."
    },
    @{
        Id = 4
        Cause = "Dependencia de IDE"
        Description = "MCPs iniciados como hijos del IDE no sobreviven al cierre del IDE"
        Symptom = "MCPs caen cuando se cierra Windsurf/Cursor/Antigravity"
        Affected = ($Results.MCPs | Where-Object { $_.Transport -eq "STDIO" }).Type
        Severity = "HIGH"
        Solution = "Desacoplar MCPs del ciclo de vida del IDE usando servicio de fondo independiente."
    },
    @{
        Id = 5
        Cause = "Timeout de Keepalive"
        Description = "Algunos MCPs tienen timeouts internos de inactividad"
        Symptom = "MCP se cierra después de período sin uso / Connection reset by peer"
        Affected = @("mcp-lightning-proxy-v3", "mcp-core")
        Severity = "LOW"
        Solution = "Implementar health checks periódicos desde el cliente MCP para mantener conexión viva."
    }
)

# 4. Análisis de configuración
Write-Host "[4/5] Analizando configuración MCP..." -ForegroundColor Yellow
$ConfigPath = Join-Path $MCPBasePath "mcp_config_optimized.json"
if (Test-Path $ConfigPath) {
    try {
        $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        $Results.ConfigAnalysis = @{
            ConfigPath = $ConfigPath
            ConfigValid = $true
            IDEsConfigured = ($Config.ide_specific.PSObject.Properties | Measure-Object).Count
            Notes = @()
        }
        
        # Verificar inconsistencias
        foreach ($ide in $Config.ide_specific.PSObject.Properties) {
            $mcpServers = $ide.Value.mcpServers
            foreach ($server in $mcpServers.PSObject.Properties) {
                $serverConfig = $server.Value
                
                # Verificar si usa args de puerto para dashboard
                if ($server.Name -eq "devbrain-dashboard") {
                    $hasPortArg = $serverConfig.args | Where-Object { $_ -match "port" }
                    if ($hasPortArg) {
                        $Results.ConfigAnalysis.Notes += "[$($ide.Name)] dashboard tiene --port en args (el exe lo ignora, usa 8091 hardcoded)"
                    }
                }
                
                # Verificar modo STDIO
                if ($serverConfig.args -contains "stdio") {
                    $Results.ConfigAnalysis.Notes += "[$($ide.Name)] $($server.Name) usa STDIO (riesgo EOF alto)"
                }
            }
        }
    } catch {
        $Results.ConfigAnalysis = @{
            ConfigPath = $ConfigPath
            ConfigValid = $false
            Error = $_.Exception.Message
        }
    }
} else {
    $Results.ConfigAnalysis = @{
        ConfigPath = $ConfigPath
        ConfigValid = $false
        Error = "Archivo no encontrado"
    }
}

# 5. Generar recomendaciones
Write-Host "[5/5] Generando recomendaciones..." -ForegroundColor Yellow

$Results.Recommendations = @(
    @{
        Priority = "P0 - CRÍTICO"
        Action = "Instalar servicio de recuperación automática"
        Command = ".\MCP_AutoRecovery_Service.ps1 -Install"
        Benefit = "MCPs se reinician automáticamente después de reinicios de Windows o caídas del IDE"
    },
    @{
        Priority = "P1 - ALTO"
        Action = "Corregir configuración MCP - eliminar --port de dashboard en config de Trae"
        Details = "La configuración de Trae tiene --port 7777 que es ignorado. El dashboard usa puerto 8091 hardcoded."
        Benefit = "Evitar confusión de puertos y health checks fallidos"
    },
    @{
        Priority = "P1 - ALTO"
        Action = "Implementar health check proactivo en clientes MCP"
        Details = "Antes de llamar a cualquier MCP, verificar disponibilidad con ping rápido"
        Benefit = "Detectar tempranamente MCPs caídos y usar fallback inmediatamente"
    },
    @{
        Priority = "P2 - MEDIO"
        Action = "Migrar MCPs STDIO a HTTP donde sea posible"
        Affected = $Results.EOF_Causes[0].Affected
        Details = "Los MCPs en modo STDIO son inherentemente frágiles. HTTP permite reconexión independiente."
        Benefit = "Eliminar dependencia del ciclo de vida del IDE"
    },
    @{
        Priority = "P2 - MEDIO"
        Action = "Configurar limpieza de procesos huérfanos"
        Command = "Verificar maintenance/infra_janitor.ps1"
        Benefit = "Evitar acumulación de procesos zombie que consumen recursos"
    },
    @{
        Priority = "P3 - BAJO"
        Action = "Monitorear logs de MCP periódicamente"
        Command = "Get-Content logs\mcp_autorecovery.log -Tail 20"
        Benefit = "Detección temprana de problemas antes de afectar desarrollo"
    }
)

# Mostrar resumen
Write-Host "`n=== RESUMEN DE DIAGNÓSTICO ===" -ForegroundColor Cyan
Write-Host "MCPs Detectados: $($Results.MCPs.Count)" -ForegroundColor White

# Conteo manual para hashtables
$highCount = ($Results.MCPs | Where-Object { $_.EOF_Risk -like "HIGH*" }).Count
$mediumCount = ($Results.MCPs | Where-Object { $_.EOF_Risk -like "MEDIUM*" }).Count
$lowCount = ($Results.MCPs | Where-Object { $_.EOF_Risk -like "LOW*" }).Count
$unknownCount = ($Results.MCPs | Where-Object { $_.EOF_Risk -eq "Unknown" }).Count

if ($highCount -gt 0) { Write-Host "  Riesgo HIGH: $highCount MCPs" -ForegroundColor Red }
if ($mediumCount -gt 0) { Write-Host "  Riesgo MEDIUM: $mediumCount MCPs" -ForegroundColor Yellow }
if ($lowCount -gt 0) { Write-Host "  Riesgo LOW: $lowCount MCPs" -ForegroundColor Green }
if ($unknownCount -gt 0) { Write-Host "  Riesgo Unknown: $unknownCount MCPs" -ForegroundColor White }

Write-Host "`nCausas EOF Identificadas:" -ForegroundColor Yellow
foreach ($cause in $Results.EOF_Causes) {
    $icon = switch ($cause.Severity) {
        "HIGH" { "🔴" }
        "MEDIUM" { "🟡" }
        "LOW" { "🟢" }
    }
    Write-Host "  $icon [$($cause.Severity)] $($cause.Cause)" -ForegroundColor White
    if ($cause.Affected) {
        Write-Host "      Afectados: $($cause.Affected -join ', ')" -ForegroundColor Gray
    }
}

Write-Host "`nRecomendaciones Prioritarias:" -ForegroundColor Green
$p0 = $Results.Recommendations | Where-Object { $_.Priority -like "P0*" }
$p1 = $Results.Recommendations | Where-Object { $_.Priority -like "P1*" }

$allRecs = @($p0) + @($p1)
foreach ($rec in ($allRecs | Select-Object -First 3)) {
    Write-Host "  • [$($rec.Priority)] $($rec.Action)" -ForegroundColor $(if ($rec.Priority -like "P0*") { "Red" } else { "Yellow" })
}

# Guardar reporte
$Results | ConvertTo-Json -Depth 10 | Out-File $ReportFile
Write-Host "`n📄 Reporte completo guardado en:" -ForegroundColor Gray
Write-Host "   $ReportFile" -ForegroundColor Gray

# Retornar true si hay problemas críticos
$hasCritical = ($Results.MCPs | Where-Object { $_.EOF_Risk -like "HIGH*" }).Count -gt 0
if ($hasCritical) {
    Write-Host "`n⚠️ Se detectaron MCPs con riesgo EOF ALTO. Ejecutar .\MCP_AutoRecovery_Service.ps1 -Install" -ForegroundColor Red
}

return $hasCritical
