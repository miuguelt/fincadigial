# scratch/stress_test_ides.ps1
# Simulación de estrés multi-IDE para el ecosistema DevBrain

$ides = @("VSCode", "Cursor", "Windsurf")
$endpoint = "http://localhost:8091" # Dashboard Server
$iterations = 15

Write-Host "🚀 Iniciando simulación de carga multi-IDE (Concurrent: $($ides.Count))..." -ForegroundColor Cyan

$jobs = @()
foreach ($ide in $ides) {
    $jobs += Start-Job -Name "Stress-$ide" -ScriptBlock {
        param($name, $url, $count)
        $stats = @()
        for ($i=1; $i -le $count; $i++) {
            $start = Get-Date
            $ok = $false
            $error = ""
            try {
                $res = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing
                if ($res.StatusCode -eq 200) { $ok = $true }
            } catch {
                $ok = $false
                $error = $_.Exception.Message
            }
            $end = Get-Date
            $stats += [PSCustomObject]@{
                Iteration = $i
                LatencyMs = ($end - $start).TotalMilliseconds
                Success   = $ok
                Error     = $error
            }
            Start-Sleep -Milliseconds (Get-Random -Min 50 -Max 200)
        }
        return $stats
    } -ArgumentList $ide, $endpoint, $iterations
}

Write-Host "⏳ Esperando resultados de los hilos concurrentes..." -ForegroundColor Yellow
$allResults = @()
foreach ($job in $jobs) {
    Wait-Job $job | Out-Null
    $res = Receive-Job $job
    $avgLat = ($res | Measure-Object -Property LatencyMs -Average).Average
    $successCount = ($res | Where-Object { $_.Success }).Count
    $failCount = $iterations - $successCount
    
    $allResults += [PSCustomObject]@{
        IDE        = $job.Name.Replace("Stress-", "")
        Success    = "$successCount/$iterations"
        Fail       = $failCount
        AvgLatency = "{0:N2}ms" -f $avgLat
        Status     = if ($failCount -eq 0) { "PERFECT" } else { "DEGRADED" }
    }
}

Write-Host "`n✅ PRUEBA DE ESTRÉS COMPLETADA`n" -ForegroundColor Green
$allResults | Format-Table -AutoSize
