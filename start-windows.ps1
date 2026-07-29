<#
.SYNOPSIS
    Villaluz Windows-Native Startup -- runs directly on Windows, ZERO Docker containers
.DESCRIPTION
    Starts: Flask backend on 8092, Vite frontend on 3005, Celery worker + beat
    Uses PostgreSQL and Memurai natively on Windows (127.0.0.1:5434/6380)
    Saves ~3.2GB RAM vs containerized approach
    Output visible in real-time + streamed to DevBrain Dashboard via log files
#>
param(
    [switch]$Stop,
    [switch]$Status,
	[switch]$FrontendOnly,
	[switch]$BackendOnly,
	[switch]$RestoreEmpty,
	[switch]$Daemon,
	[switch]$MonitorLogs,
    [int]$Workers = 2
)

$ErrorActionPreference = "Continue"
$ProjectRoot = "$PSScriptRoot"
$BackendDir = "$ProjectRoot\backend"
$FrontendDir = "$ProjectRoot\frontend"
$LogDir = "$ProjectRoot\logs"
$PythonExe = if (Test-Path "$BackendDir\venv_win\Scripts\python.exe") { "$BackendDir\venv_win\Scripts\python.exe" } else { (Get-Command python -ErrorAction SilentlyContinue).Source }
$NodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
$NpxExe = (Get-Command npx -ErrorAction SilentlyContinue).Source
$LifecycleModule = "$ProjectRoot\scripts\villaluz-process-lifecycle.psm1"
# Absolute path: pm2 resolves a relative config against the caller's cwd, so invoking
# this script from anywhere but $ProjectRoot failed with "File ecosystem.config.cjs not found".
$EcosystemConfig = "$ProjectRoot\ecosystem.config.cjs"
$ScopedPm2Home = "$LogDir\pm2"
$LegacyPm2Home = Join-Path $env:USERPROFILE '.pm2'
$LifecycleMarker = "$LogDir\villaluz-lifecycle-v2.ready"
$script:RedisAvailable = $true

if (-not (Test-Path -LiteralPath $LifecycleModule)) {
    throw "No se encontró el módulo de lifecycle de Villaluz: $LifecycleModule"
}
Import-Module -Name $LifecycleModule -Force

# ── Port Registry ──
$PortsLoader = "$PSScriptRoot\..\..\_infrastructure\devbraind\config\ports-loader.ps1"
if (Test-Path $PortsLoader) {
    . $PortsLoader
} else {
    Write-Warning "ports-loader.ps1 no encontrado en $PortsLoader. Usando puertos hardcodeados."
    function Get-Port($Name) { switch -regex ($Name) { 'redis' { 6380 } 'postgres' { 5434 } 'villaluz-backend' { 8092 } 'villaluz-frontend' { 3005 } } }
    function Get-PortUrl($Name, $Host='127.0.0.1', $Db=0) { "redis://${Host}:$(Get-Port $Name)/${Db}" }
}

if (-not (Test-Path -LiteralPath $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log { param($msg, $color="White") Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color }

function Load-EnvFile {
    param([string]$Path)
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line -like "*=*") {
                $idx = $line.IndexOf("=")
                $key = $line.Substring(0, $idx).Trim()
                $val = $line.Substring($idx + 1).Trim()
                if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length - 2) }
                elseif ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length - 2) }
                [System.Environment]::SetEnvironmentVariable($key, $val, [System.EnvironmentVariableTarget]::Process)
            }
        }
    }
}
Load-EnvFile -Path "$BackendDir\.env"
# Inyectar credenciales desde WCM (sobrescribe .env si existe)
$wcmInjector = "$PSScriptRoot\..\..\_infrastructure\devbraind\scripts\Import-ProjectCredentials.ps1"
if (Test-Path $wcmInjector) { . $wcmInjector -Project villaluz }
if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
    Write-Warning "DB_PASSWORD no está definido. Configure backend/.env antes de iniciar Villaluz."
}
if (-not $env:CELERY_BROKER_URL) {
    [System.Environment]::SetEnvironmentVariable("CELERY_BROKER_URL", "redis://127.0.0.1:6380/1", [System.EnvironmentVariableTarget]::Process)
}

function Backup-Database {
    Write-Log "Creando respaldo automático de base de datos..." "Yellow"
    
    # Salvaguarda: No respaldar si la base de datos está vacía, no es accesible o tiene menos de 10 tablas
    $tablesCountStr = $($env:PGPASSWORD=$env:DB_PASSWORD; & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h 127.0.0.1 -p 5434 -U villaluz -d finca_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null)
    $tablesCountVal = 0
    $parsed = $false
    if ($tablesCountStr) {
        $parsed = [int]::TryParse($tablesCountStr.Trim(), [ref]$tablesCountVal)
    }
    if (-not $parsed -or $tablesCountVal -lt 10) {
        Write-Log "⚠️ La base de datos no está disponible o tiene solo $tablesCountVal tablas. Omitiendo respaldo automático para evitar sobrescribir respaldos saludables." "Yellow"
        return
    }

    $timestamp = Get-Date -Format "yyyy-MM-ddTHH_mm_ssZ"
    $backupFileName = "db_backup_${timestamp}.tgz"
    $tmpSqlName = "finca_db_${timestamp}.sql"
    
    $tmpSqlPath = "$ProjectRoot\backups\$tmpSqlName"
    $tgzPath = "$ProjectRoot\backups\$backupFileName"
    
    # Exportar SQL usando pg_dump nativo de Windows
    $env:PGPASSWORD=$env:DB_PASSWORD; & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -h 127.0.0.1 -p 5434 -U villaluz -E UTF8 -f $tmpSqlPath finca_db 2>$null
    
    if (Test-Path $tmpSqlPath) {
        $compressScript = "import tarfile; tar = tarfile.open(r'$tgzPath', 'w:gz'); tar.add(r'$tmpSqlPath', arcname='$tmpSqlName'); tar.close()"
        & $PythonExe -c $compressScript
        Remove-Item -Path $tmpSqlPath -Force -ErrorAction SilentlyContinue
        Write-Log "✅ Respaldo de base de datos creado: $backupFileName" "Green"
        
        # Limpieza de backups antiguos (mantener solo los últimos 10)
        Get-ChildItem -Path "$ProjectRoot\backups" -Filter "*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 | ForEach-Object {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Log "WARNING: No se pudo crear el respaldo de la base de datos." "Red"
    }
}

function Restore-Database-If-Empty {
    param([switch]$AllowRestore)
    Write-Log "Verificando contenido de la base de datos (native psql)..." "Yellow"
    # Usar psql.exe nativo de Windows — NO WSL/Docker
    $psqlExe = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
    if (-not (Test-Path $psqlExe)) {
        Write-Log "⚠️ psql.exe no encontrado en $psqlExe. Omitiendo verificación de BD." "Yellow"
        return
    }
    $env:PGPASSWORD = $env:DB_PASSWORD

    # Verificar si la DB existe
    $dbExistsRaw = (& $psqlExe -h 127.0.0.1 -p 5434 -U villaluz -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'finca_db';" 2>$null)
    $dbExists = if ($dbExistsRaw) { $dbExistsRaw.Trim() } else { "" }
    if ($dbExists -ne "1") {
        Write-Log "⚠️ Base de datos 'finca_db' no encontrada. Creándola..." "Yellow"
        # Intentar crear con el usuario admin primero
        $env:PGPASSWORD = $env:DB_PASSWORD
        & $psqlExe -h 127.0.0.1 -p 5434 -U villaluz -d postgres -c "CREATE DATABASE finca_db OWNER villaluz;" 2>&1 | Out-Null
    }

    $env:PGPASSWORD = $env:DB_PASSWORD
    $tablesCountStr = (& $psqlExe -h 127.0.0.1 -p 5434 -U villaluz -d finca_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>$null)
    $tablesCountVal = 0
    if ($tablesCountStr -and [int]::TryParse($tablesCountStr.Trim(), [ref]$tablesCountVal)) {
        if ($tablesCountVal -eq 0) {
            if (-not $AllowRestore) {
                Write-Log "⚠️ La base de datos está vacía. No se restaurará automáticamente; use -RestoreEmpty si corresponde." "Yellow"
                return
            }
            Write-Log "⚠️ Base de datos vacía. Buscando respaldo reciente para restaurar..." "Yellow"
            
            $backupFile = Get-ChildItem -Path "$ProjectRoot\backups" -Filter "*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            $stableDump = "$ProjectRoot\backups\restore_point_stable\finca_db_dump.sql"
            
            if ($backupFile) {
                Write-Log "Encontrado respaldo: $($backupFile.Name). Restaurando..." "Yellow"
                $tmpSql = "$ProjectRoot\backups\temp_restore.sql"
                $tmpUtf8 = "$ProjectRoot\backups\temp_restore_utf8.sql"
                Remove-Item -Path $tmpSql, $tmpUtf8 -Force -ErrorAction SilentlyContinue
                
                try {
                    $decompressScript = "import tarfile; tar = tarfile.open(r'$($backupFile.FullName)', 'r:gz'); tar.extractall(path=r'$ProjectRoot\backups'); tar.close()"
                    & $PythonExe -c $decompressScript
                    
                    $extractedSql = Get-ChildItem -Path "$ProjectRoot\backups" -Filter "*.sql" | Where-Object { $_.Name -ne "temp_restore_utf8.sql" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                    if ($extractedSql) {
                        $convScript = "import codecs; f=open(r'$($extractedSql.FullName)', 'rb'); h=f.read(2); f.close(); enc='utf-16-le' if h in (b'\xff\xfe', b'\xfe\xff') else 'utf-8'; fin=codecs.open(r'$($extractedSql.FullName)', 'r', encoding=enc, errors='ignore'); fout=codecs.open(r'$tmpUtf8', 'w', encoding='utf-8'); fout.write(fin.read()); fin.close(); fout.close()"
                        & $PythonExe -c $convScript
                        
                        # Restaurar con psql nativo
                        $env:PGPASSWORD = $env:DB_PASSWORD
                        & $psqlExe -h 127.0.0.1 -p 5434 -U villaluz -d finca_db -f $tmpUtf8 2>&1 | Out-Null
                        Write-Log "✅ Base de datos restaurada exitosamente desde $($backupFile.Name)" "Green"
                        Remove-Item -Path $tmpSql, $tmpUtf8, $extractedSql.FullName -Force -ErrorAction SilentlyContinue
                        return
                    }
                } catch {
                    Write-Log "Error al restaurar desde el tarball: $_" "Red"
                }
            }
            
            if (Test-Path $stableDump) {
                Write-Log "Restaurando desde el volcado estable finca_db_dump.sql..." "Yellow"
                $tmpUtf8 = "$ProjectRoot\backups\temp_stable_utf8.sql"
                Remove-Item -Path $tmpUtf8 -Force -ErrorAction SilentlyContinue
                $convScript = "import codecs; fin=codecs.open(r'$stableDump', 'r', encoding='utf-16-le', errors='ignore'); fout=codecs.open(r'$tmpUtf8', 'w', encoding='utf-8'); fout.write(fin.read()); fin.close(); fout.close()"
                & $PythonExe -c $convScript
                $env:PGPASSWORD = $env:DB_PASSWORD
                & $psqlExe -h 127.0.0.1 -p 5434 -U villaluz -d finca_db -f $tmpUtf8 2>&1 | Out-Null
                Write-Log "✅ Base de datos restaurada exitosamente desde el volcado estable." "Green"
                Remove-Item -Path $tmpUtf8 -Force -ErrorAction SilentlyContinue
            } else {
                Write-Log "WARNING: No se encontraron respaldos. La base de datos permanecerá vacía." "Red"
            }
        } else {
            Write-Log "✅ La base de datos contiene $tablesCountVal tablas. No requiere restauración." "Green"
        }
    }
}

function Ensure-Dependencies {
    Write-Log "Checking database and cache dependencies (Windows native)..." "Yellow"

    # 1. Ensure PostgreSQL Windows native service is running
    $pgPort = Get-Port postgres
    $pgOk = $false
    foreach ($p in @("5434")) {
        if ($p -and ($p -as [int]) -gt 0 -and (Test-NetConnection -ComputerName 127.0.0.1 -Port ([int]$p) -WarningAction SilentlyContinue).TcpTestSucceeded) {
            $env:DB_PORT = $p; $pgOk = $true; break
        }
    }
    if (-not $pgOk) {
        Write-Log "PostgreSQL not reachable. Attempting to start native Windows service..." "Yellow"
        # Intentar con el servicio nativo de Windows (NO WSL/Docker)
        $pgSvcName = "postgresql-x64-18"
        $pgSvc = Get-Service -Name $pgSvcName -ErrorAction SilentlyContinue
        if ($pgSvc -and $pgSvc.Status -ne "Running") {
            Start-Service $pgSvcName -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
        } elseif (-not $pgSvc) {
            # Buscar cualquier servicio postgres disponible
            $pgSvc = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -ne "Running" } | Select-Object -First 1
            if ($pgSvc) { Start-Service $pgSvc.Name -ErrorAction SilentlyContinue; Start-Sleep -Seconds 3 }
        }
        # Re-verificar puertos
        $maxWait = 10
        $waited = 0
        while ($waited -lt $maxWait) {
            foreach ($p in @("5434")) {
                if ((Test-NetConnection -ComputerName 127.0.0.1 -Port ([int]$p) -WarningAction SilentlyContinue).TcpTestSucceeded) {
                    $env:DB_PORT = $p; $pgOk = $true; break
                }
            }
            if ($pgOk) { break }
            Start-Sleep -Seconds 1
            $waited++
        }
        if ($pgOk) {
            Write-Log "✅ PostgreSQL started on port $env:DB_PORT" "Green"
        } else {
            Write-Log "WARNING: PostgreSQL could not be started. Backend may fail." "Yellow"
        }
    } else {
        Write-Log "✅ PostgreSQL online on port $env:DB_PORT" "Green"
    }

    # Restaurar base de datos si está vacía (usa psql nativo, no WSL)
    Restore-Database-If-Empty -AllowRestore:$RestoreEmpty

    # 2. Ensure Memurai/Redis Windows native service is running
    $redisPort = Get-Port redis
    $redisOk = (Test-NetConnection -ComputerName 127.0.0.1 -Port $redisPort -WarningAction SilentlyContinue).TcpTestSucceeded
    if (-not $redisOk) {
        Write-Log "Redis (${redisPort}) not reachable. Attempting to start Memurai Windows service..." "Yellow"
        $memuraiSvc = Get-Service -Name "Memurai" -ErrorAction SilentlyContinue
        if ($memuraiSvc -and $memuraiSvc.Status -ne "Running") {
            Start-Service "Memurai" -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        $maxWait = 10
        $waited = 0
        while ($waited -lt $maxWait) {
            if ((Test-NetConnection -ComputerName 127.0.0.1 -Port $redisPort -WarningAction SilentlyContinue).TcpTestSucceeded) {
                $redisOk = $true; break
            }
            Start-Sleep -Seconds 1
            $waited++
        }
        if ($redisOk) {
            Write-Log "✅ Redis (Memurai) started on port $redisPort" "Green"
        } else {
            Write-Log "WARNING: Redis (${redisPort}) could not be started. Celery will fail." "Yellow"
        }
    } else {
        Write-Log "✅ Redis (Memurai) online on port $redisPort" "Green"
    }
    $script:RedisAvailable = $redisOk
}

function Start-TransparentProcess {
    param(
        [string]$FilePath,
        [string]$Arguments,
        [string]$WorkingDir,
        [string]$LogPath,
        [string]$Label,
        [ConsoleColor]$Color = "Gray"
    )
    $logParent = Split-Path $LogPath -Parent
    if (-not (Test-Path $logParent)) { New-Item -ItemType Directory -Path $logParent -Force | Out-Null }
    # Remove old log files to avoid confusion
    $ErrPath = $LogPath.Replace(".log", "_error.log")
    Remove-Item -LiteralPath $LogPath -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $ErrPath -Force -ErrorAction SilentlyContinue

    # Launch process using cmd.exe shell redirection to bypass all PowerShell event loop and TTY requirements
    # Python requires -u to run unbuffered so output appears immediately in log files
    $finalArgs = if ($FilePath -match "python") { "-u " + $Arguments } else { $Arguments }
    $cmdArg = "/c `"`"$FilePath`" $finalArgs > `"$LogPath`" 2> `"$ErrPath`"`""
    
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArg -WorkingDirectory $WorkingDir `
        -WindowStyle Hidden -PassThru

    Write-Log "$Label started (PID $($p.Id), log: $(Split-Path $LogPath -Leaf))" "Green"
    return $p
}


function Stop-Containers {
    # No-op: Villaluz corre 100% nativo en Windows — no hay contenedores locales.
    Write-Log "[Stop-Containers] Modo Windows nativo — sin contenedores locales." "DarkGray"
}

function Stop-Villaluz {
    $lifecycleLock = Enter-VillaluzLifecycleLock
    try {
        Write-Log "Deteniendo exclusivamente los procesos propiedad de Villaluz..." "Yellow"
        Backup-Database

        if ($NpxExe) {
            Stop-VillaluzPm2Apps -NpxExe $NpxExe `
                -Pm2Homes @($ScopedPm2Home, $LegacyPm2Home) `
                -ScopedPm2Home $ScopedPm2Home
        }
        Start-Sleep -Milliseconds 750

        $stoppedIds = @(Stop-VillaluzOwnedProcesses `
            -ProjectRoot $ProjectRoot `
            -PythonExe $PythonExe)
        Stop-Containers

        Set-Content -LiteralPath $LifecycleMarker `
            -Value ([DateTimeOffset]::Now.ToString('o')) `
            -Encoding utf8
        Write-Log "Procesos Villaluz detenidos: $($stoppedIds.Count). Lifecycle listo." "Green"
    } finally {
        Exit-VillaluzLifecycleLock -Mutex $lifecycleLock
    }
}

function Show-Status {
    Write-Log "=== VILLALUZ STATUS ===" "Cyan"
    $bePort = if ($env:PORT) { $env:PORT } else { Get-Port villaluz-backend }
    $fePort = Get-Port villaluz-frontend
    $pgPort = Get-Port postgres
    $rdPort = Get-Port redis
    $backend = Test-NetConnection -ComputerName 127.0.0.1 -Port $bePort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    $frontend = Test-NetConnection -ComputerName 127.0.0.1 -Port $fePort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    Write-Log "Backend  ($bePort): $(if($backend.TcpTestSucceeded){'ONLINE'}else{'OFFLINE'})" $(if($backend.TcpTestSucceeded){'Green'}else{'Red'})
    Write-Log "Frontend ($fePort): $(if($frontend.TcpTestSucceeded){'ONLINE'}else{'OFFLINE'})" $(if($frontend.TcpTestSucceeded){'Green'}else{'Red'})
    Write-Log "DB      ($pgPort): $(if((Test-NetConnection -ComputerName 127.0.0.1 -Port $pgPort -WarningAction SilentlyContinue).TcpTestSucceeded){'ONLINE'}else{'OFFLINE'})"
    Write-Log "Redis   ($rdPort): $(if((Test-NetConnection -ComputerName 127.0.0.1 -Port $rdPort -WarningAction SilentlyContinue).TcpTestSucceeded){'ONLINE'}else{'OFFLINE'})"
}

function Ensure-Pm2Daemon {
    # Cold start: `pm2 startOrReload` fails when the scoped PM2 daemon is not up yet
    # (PM2_HOME empty after a reboot or DEVBRAIN STOP). `pm2 ping` spawns and waits
    # for the daemon, so the following startOrReload always finds a live god process.
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        & $NpxExe pm2 ping 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            if ($attempt -gt 1) { Write-Log "Daemon PM2 listo (intento $attempt)." "Green" }
            return $true
        }
        Write-Log "Daemon PM2 no responde (intento $attempt/3). Reintentando..." "Yellow"
        Start-Sleep -Seconds 3
    }
    Write-Log "ERROR: el daemon PM2 no respondió a 'pm2 ping' tras 3 intentos." "Red"
    return $false
}

function Invoke-Pm2StartOrReload {
    param([string]$AppSelection)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        & $NpxExe pm2 startOrReload $EcosystemConfig --only $AppSelection --update-env
        if ($LASTEXITCODE -eq 0) { return $true }
        Write-Log "PM2 falló al iniciar '$AppSelection' (intento $attempt/3)." "Yellow"
        Start-Sleep -Seconds 3
    }
    return $false
}

function Wait-VillaluzReady {
    param(
        [string[]]$Apps,
        [int]$TimeoutSeconds = 90
    )
    $bePort = Get-Port villaluz-backend
    $fePort = Get-Port villaluz-frontend
    $needBackend = $Apps -contains 'villaluz-backend'
    $needFrontend = $Apps -contains 'villaluz-frontend'
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $backendOk = -not $needBackend
    $frontendOk = -not $needFrontend

    Write-Log "Esperando a que Villaluz responda (máx ${TimeoutSeconds}s)..." "Yellow"
    while ((Get-Date) -lt $deadline) {
        if (-not $backendOk) {
            try {
                $health = Invoke-WebRequest "http://127.0.0.1:${bePort}/api/v1/health" -UseBasicParsing -TimeoutSec 5
                if ($health.StatusCode -eq 200) { $backendOk = $true }
            } catch { }
        }
        if (-not $frontendOk) {
            $frontendOk = (Test-NetConnection -ComputerName 127.0.0.1 -Port $fePort -WarningAction SilentlyContinue).TcpTestSucceeded
        }
        if ($backendOk -and $frontendOk) { break }
        Start-Sleep -Seconds 2
    }

    if ($needBackend) {
        Write-Log "Backend  (${bePort}): $(if($backendOk){'READY'}else{'FAILED'})" $(if($backendOk){'Green'}else{'Red'})
    }
    if ($needFrontend) {
        Write-Log "Frontend (${fePort}): $(if($frontendOk){'READY'}else{'FAILED'})" $(if($frontendOk){'Green'}else{'Red'})
    }
    if (-not ($backendOk -and $frontendOk)) {
        Write-Log "Revise los logs: npx pm2 logs --lines 50 (PM2_HOME=$ScopedPm2Home)" "Yellow"
        return $false
    }
    return $true
}

function Initialize-LifecycleMarkerIfSafe {
    if (Test-Path -LiteralPath $LifecycleMarker) { return $true }

    $bePort = Get-Port villaluz-backend
    $fePort = Get-Port villaluz-frontend
    $backendOnline = (Test-NetConnection -ComputerName 127.0.0.1 -Port $bePort -WarningAction SilentlyContinue).TcpTestSucceeded
    $frontendOnline = (Test-NetConnection -ComputerName 127.0.0.1 -Port $fePort -WarningAction SilentlyContinue).TcpTestSucceeded

    try {
        $processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
        $ownedIds = @(Get-VillaluzOwnedProcessIds $processes $ProjectRoot $PythonExe)
    } catch {
        Write-Log "No se pudo verificar procesos existentes; no se iniciará por seguridad." "Red"
        return $false
    }

    if ($backendOnline -or $frontendOnline -or $ownedIds.Count -gt 0) {
        Write-Log "Hay procesos o puertos de Villaluz activos. Ejecute .\start-windows.ps1 -Stop una vez." "Red"
        return $false
    }

    Set-Content -LiteralPath $LifecycleMarker `
        -Value ([DateTimeOffset]::Now.ToString('o')) `
        -Encoding utf8
    Write-Log "No hay procesos Villaluz activos. Lifecycle inicializado automáticamente." "Green"
    return $true
}

if ($Stop) {
    if (Test-VillaluzAdministrator) {
        Stop-Villaluz
        return
    }

    # Se intenta primero SIN elevar. La parada normal no deja procesos
    # elevados, así que pedir UAC en cada -Stop era fricción innecesaria: el
    # dashboard lanza este script con la ventana oculta y no puede responder
    # al prompt, de modo que la parada se quedaba esperando indefinidamente.
    # La elevación queda reservada al caso real: procesos que sobreviven.
    try {
        Stop-Villaluz
        return
    } catch {
        Write-Log "Persisten procesos que requieren privilegios: $($_.Exception.Message)" "Yellow"
    }

    Write-Log "Solicitando elevación para limpiar generaciones Villaluz elevadas..." "Yellow"
    try {
        $stopExitCode = Invoke-VillaluzElevatedStop -ScriptPath $PSCommandPath
    } catch {
        Write-Log "No se pudo completar la detención elevada: $($_.Exception.Message)" "Red"
        exit 1
    }
    if ($stopExitCode -ne 0) {
        Write-Log "La detención elevada terminó con código $stopExitCode." "Red"
        exit $stopExitCode
    }
    Write-Log "Detención elevada completada." "Green"
    return
}
if ($Status) { Show-Status; return }

if (-not $env:DEVBRAIN_DASHBOARD -and (Test-VillaluzAdministrator)) {
    Write-Log "ERROR: Villaluz no debe iniciarse desde una terminal elevada." "Red"
    Write-Log "Abra una terminal normal. -Stop solicitará elevación solo para la limpieza." "Yellow"
    exit 1
}
if (-not (Initialize-LifecycleMarkerIfSafe)) {
    exit 1
}
if ($FrontendOnly -and $BackendOnly) {
    Write-Log "ERROR: -FrontendOnly y -BackendOnly son mutuamente excluyentes." "Red"
    exit 1
}

# ── Configuración de Entorno Común ──
# Establecer variables de entorno antes de lanzar PM2
$bePort = Get-Port villaluz-backend
$fePort = Get-Port villaluz-frontend
$pgPort = Get-Port postgres
$rdUrl0 = "redis://127.0.0.1:6380/0"
$rdUrl1 = "redis://127.0.0.1:6380/1"

$env:PORT = "$bePort"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "$pgPort"
$env:DB_NAME = "finca_db"
$env:DB_USER = "villaluz"
$env:REDIS_URL = "$rdUrl0"
$env:CELERY_BROKER_URL = "$rdUrl1"
$env:CELERY_RESULT_BACKEND = "$rdUrl1"
$env:CORS_ORIGINS = "http://localhost:${fePort},http://127.0.0.1:${fePort},http://localhost:3003"
$env:VITE_API_BASE_URL = "http://localhost:${bePort}/api/v1"
$env:VITE_PROXY_TARGET = "http://127.0.0.1:${bePort}"
$env:VITE_FRONTEND_URL = "http://localhost:${fePort}"

Remove-Item Env:\WERKZEUG_SERVER_FD -ErrorAction SilentlyContinue
Remove-Item Env:\WERKZEUG_RUN_MAIN -ErrorAction SilentlyContinue

if (-not $NpxExe) { Write-Log "ERROR: npx no encontrado en PATH" "Red"; return }
if (-not (Test-Path -LiteralPath $EcosystemConfig)) {
    Write-Log "ERROR: no existe $EcosystemConfig (no está versionado; se genera por máquina)." "Red"
    exit 1
}

$env:PM2_HOME = $ScopedPm2Home
@($ScopedPm2Home, (Join-Path $LogDir 'pids')) | ForEach-Object {
    if (-not (Test-Path -LiteralPath $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

$selectedApps = if ($FrontendOnly) {
    @('villaluz-frontend')
} elseif ($BackendOnly) {
    @('villaluz-backend')
} else {
    @('villaluz-backend', 'villaluz-frontend')
}
if (-not $FrontendOnly -and $script:RedisAvailable) {
    $selectedApps += @('villaluz-celery', 'villaluz-beat')
} elseif (-not $FrontendOnly) {
    Write-Log "Redis no disponible: se iniciará Villaluz sin Celery/Beat." "Yellow"
}
$appSelection = $selectedApps -join ','

$lifecycleLock = Enter-VillaluzLifecycleLock
try {
    Ensure-Dependencies
    Write-Log "=== Starting Villaluz Windows-Native with isolated PM2 ===" "Cyan"
    if (-not (Ensure-Pm2Daemon)) {
        throw "El daemon PM2 aislado no pudo iniciarse (PM2_HOME=$ScopedPm2Home)."
    }
    if (-not (Invoke-Pm2StartOrReload -AppSelection $appSelection)) {
        throw "PM2 no pudo iniciar la selección: $appSelection"
    }
} finally {
    Exit-VillaluzLifecycleLock -Mutex $lifecycleLock
}

if (-not (Wait-VillaluzReady -Apps $selectedApps)) {
    Write-Log "Villaluz NO quedó operativo." "Red"
    exit 1
}

if ($Daemon -or -not $MonitorLogs) {
    Write-Log "Villaluz está corriendo en background vía PM2 aislado." "Cyan"
    if (-not $Daemon) {
        Write-Log "Monitor interactivo omitido; use -MonitorLogs para abrir pm2 logs." "DarkGray"
    }
    Write-Host "DAEMON_OK:PM2"
    exit 0
} else {
    try { $host.UI.RawUI.WindowTitle = "Villaluz — Monitoring (press Q to stop, Ctrl+C to detach)" } catch {}
    
    Write-Log "`n=== Villaluz Windows-Native Ready ===" "Green"
    Write-Log "Frontend: http://localhost:${fePort}" "Cyan"
    Write-Log "Backend:  http://localhost:${bePort}/api/v1/health" "Cyan"
    Write-Log "Logs:     npx pm2 logs" "DarkGray"
    
    # Lanzar visor de logs
    & $NpxExe pm2 logs
    
    # Al salir con Ctrl-C, paramos
    Write-Log "Saliendo... Parando PM2" "Yellow"
    foreach ($appName in $selectedApps) {
        & $NpxExe pm2 stop $appName 2>&1 | Out-Null
    }
}
