# MCP DevBrain - Inicio automático post-reinicio
$ErrorActionPreference = "Stop"
$LogDir = "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\logs"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Add-Content -Path (Join-Path $LogDir "mcp_startup.log") -Value "[$Timestamp] Iniciando servicios MCP despues de reinicio..."

# Iniciar cada servicio
& "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\MCP_Persistencia_Definitiva.ps1" -Start

Add-Content -Path (Join-Path $LogDir "mcp_startup.log") -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Servicios iniciados"
