$url = "http://localhost:7777/health"
$totalRequests = 20
$concurrency = 5

Write-Host "Iniciando Prueba de Estrés (Versión Simplificada) en $url" -ForegroundColor Cyan

$startTime = Get-Date
$results = New-Object System.Collections.Generic.List[PSCustomObject]

for ($i = 1; $i -le $totalRequests; $i++) {
    $sw = [diagnostics.stopwatch]::StartNew()
    try {
        $res = Invoke-WebRequest -Uri $url -TimeoutSec 5 -ErrorAction Stop
        $sw.Stop()
        $results.Add([PSCustomObject]@{ Id = $i; Status = "SUCCESS"; Time = $sw.Elapsed.TotalSeconds })
        Write-Host "." -NoNewline
    } catch {
        $sw.Stop()
        $results.Add([PSCustomObject]@{ Id = $i; Status = "FAIL"; Time = $sw.Elapsed.TotalSeconds })
        Write-Host "X" -NoNewline -ForegroundColor Red
    }
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds
$avgTime = ($results | Measure-Object -Property Time -Average).Average

Write-Host "`n`n--- RESULTADOS ---"
Write-Host "Éxitos: $($results | Where-Object { $_.Status -eq "SUCCESS" }).Count"
Write-Host "Tiempo Promedio: $($avgTime.ToString('F2'))s"
Write-Host "Duración Total: $($duration.ToString('F2'))s"
