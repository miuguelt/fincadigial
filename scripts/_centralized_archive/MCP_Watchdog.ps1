# MCP Watchdog - Monitoreo continuo
while ($true) {
    & "C:\Users\Miguel\Documents\Aplicaciones\_projects/villaluz\scripts\MCP_Persistencia_Definitiva.ps1" -Start
    Start-Sleep -Seconds 60
}
