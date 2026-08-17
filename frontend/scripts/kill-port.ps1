param([int]$Port = 3005)
$found = netstat -ano | Select-String ":$Port " | Select-String LISTENING | ForEach-Object { ($_ -split '\s+')[-1] } | Where-Object { $_ -and $_ -ne '0' } | Select-Object -Unique
if ($found) {
    foreach ($procId in $found) { 
        # taskkill is an external tool, -ErrorAction is for PS cmdlets only.
        # /T kills child processes too
        try { taskkill /F /T /PID $procId 2>$null | Out-Null } catch {}
    }
    
    # Wait a bit for the OS to release the port
    Start-Sleep -Milliseconds 500
    
    # Verify if still listening
    $stillFound = netstat -ano | Select-String ":$Port " | Select-String LISTENING
    if ($stillFound) {
        Write-Warning "Port $Port is still in use after kill attempt. Re-trying..."
        foreach ($line in $stillFound) {
            $pid = ($line.ToString() -split '\s+')[-1]
            if ($pid -and $pid -ne '0') {
                try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
                try { taskkill /F /PID $pid 2>$null | Out-Null } catch {}
            }
        }
        Start-Sleep -Milliseconds 500
    }

    Write-Host "Killed $(@($found).Count) process(es) on port $Port"
}
