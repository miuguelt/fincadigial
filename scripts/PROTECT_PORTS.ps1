#requires -RunAsAdministrator
<#
.SYNOPSIS
    Reserva puertos específicos para el proyecto Villaluz en el stack TCP/IP de Windows.
.DESCRIPTION
    Utiliza 'netsh' para añadir rangos de exclusión, evitando que Hyper-V o el sistema 
    asignen estos puertos dinámicamente a otras aplicaciones.
#>

$ProjectPorts = @(
    @{ Start = 3000; Count = 11; Name = "Villaluz Dev Range (3000-3010)" },
    @{ Start = 8091; Count = 2;  Name = "DevBrain/Villaluz Backend (8091-8092)" },
    @{ Start = 5432; Count = 1;  Name = "PostgreSQL" },
    @{ Start = 6333; Count = 1;  Name = "Qdrant" }
)

Write-Host "--- DevBrain Port Protector ---" -ForegroundColor Cyan

foreach ($Range in $ProjectPorts) {
    Write-Host "Intentando reservar $($Range.Name) [Puerto $($Range.Start)]..." -NoNewline
    try {
        netsh int ipv4 add excludedportrange protocol=tcp startport=$Range.Start numberofports=$Range.Count store=persistent | Out-Null
        Write-Host " [OK]" -ForegroundColor Green
    } catch {
        Write-Host " [YA RESERVADO o ERROR]" -ForegroundColor Yellow
    }
}

Write-Host "`nReserva completada. Los puertos ahora están protegidos contra asignaciones dinámicas." -ForegroundColor Cyan
Write-Host "Usa 'netsh int ipv4 show excludedportrange protocol=tcp' para verificar."
