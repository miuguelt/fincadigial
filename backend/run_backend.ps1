$PortsLoader = "invalid_path.ps1"
if (Test-Path $PortsLoader) { Import-Module $PortsLoader } else {
    function Get-Port($Name) { switch -regex ($Name) { 'redis' { 6380 } 'postgres' { 5434 } 'villaluz-backend' { 8092 } 'villaluz-frontend' { 3005 } } }
    function Get-PortUrl($Name, $TargetHost='127.0.0.1', $Db=0) { "redis://${TargetHost}:$(Get-Port $Name)/${Db}" }
}

$env:FLASK_ENV = "development"
$env:FLASK_APP = "wsgi.py"
$env:PORT = "$(Get-Port villaluz-backend)"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "$(Get-Port postgres)"
$env:DB_NAME = "finca_db"
$env:DB_USER = "villaluz"
if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
    throw "DB_PASSWORD no está definido. Configure backend/.env antes de iniciar."
}
$env:REDIS_URL = "$(Get-PortUrl redis -Db 0)"
$env:CELERY_BROKER_URL = "$(Get-PortUrl redis -Db 1)"
$env:CORS_ORIGINS = "http://localhost:$(Get-Port villaluz-frontend),http://127.0.0.1:$(Get-Port villaluz-frontend)"
$env:FLASK_DEBUG = "1"

$python = ".\venv_win\Scripts\python.exe"
if (!(Test-Path $python)) { $python = (Get-Command python).Source }
$logDir = "..\logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

Start-Process -FilePath $python -ArgumentList "wsgi.py" -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput "$logDir\backend.log" -RedirectStandardError "$logDir\backend_error.log"
Write-Host "Backend PID: $(Get-Process -Name python* | Where-Object { $_.CommandLine -match 'wsgi' } | Select-Object -First 1 -ExpandProperty Id)"
