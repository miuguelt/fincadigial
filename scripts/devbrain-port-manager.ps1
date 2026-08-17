<#
.SYNOPSIS
DevBrain Port Manager
Analiza la configuración de puertos entre .env, docker-compose.yml y vite.config.ts
para garantizar que haya una única fuente de verdad (SSoT) y reportar colisiones de puertos.

.DESCRIPTION
Este script resuelve el dolor de cabeza clásico de "ERR_CONNECTION_REFUSED" validando que
todas las capas de la aplicación (Frontend proxy, Variables de Entorno, Docker)
apunten al mismo puerto del backend.
#>

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path "$PSScriptRoot\.." | Select-Object -ExpandProperty Path

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DevBrain Port Manager (Diagnostics)   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Leer .env
$envPath = Join-Path $projectRoot ".env"
$envPort = $null
$envViteUrl = $null

if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $portLine = $envContent | Where-Object { $_ -match "^PORT=(.+)$" }
    if ($portLine) { $envPort = $matches[1] }

    $viteLine = $envContent | Where-Object { $_ -match "^VITE_API_BASE_URL=(.+)$" }
    if ($viteLine) { $envViteUrl = $matches[1] }
}

Write-Host "[1] .env Configuration:" -ForegroundColor Yellow
Write-Host "    PORT = $envPort"
Write-Host "    VITE_API_BASE_URL = $envViteUrl"

# 2. Leer docker-compose.yml
$dockerPath = Join-Path $projectRoot "docker-compose.yml"
$dockerPort = $null

if (Test-Path $dockerPath) {
    $dockerContent = Get-Content $dockerPath
    # Buscamos la línea que hace el mapeo del backend (ej: - "${PORT:-8092}:8081" o - "8093:8081")
    $backendSection = $false
    foreach ($line in $dockerContent) {
        if ($line -match "villaluz-backend:") { $backendSection = $true }
        if ($backendSection -and $line -match "ports:") { continue }
        if ($backendSection -and $line -match "-\s+`"?(.*):8081`"?") {
            $dockerPort = $matches[1]
            break
        }
        if ($backendSection -and $line -match "restart:") { $backendSection = $false }
    }
}

Write-Host "[2] docker-compose.yml Configuration:" -ForegroundColor Yellow
Write-Host "    Backend Host Port = $dockerPort"

# 3. Leer vite.config.ts
$vitePath = Join-Path $projectRoot "frontend\vite.config.ts"
$viteProxyTarget = $null

if (Test-Path $vitePath) {
    $viteContent = Get-Content $vitePath
    $proxyLine = $viteContent | Where-Object { $_ -match "target:\s*env\.VITE_PROXY_TARGET\s*\|\|\s*'http://127\.0\.0\.1:(\d+)'" }
    if ($proxyLine) {
        $viteProxyTarget = $matches[1]
    }
}

Write-Host "[3] vite.config.ts Configuration:" -ForegroundColor Yellow
Write-Host "    Proxy Default Port = $viteProxyTarget"

# 4. Análisis SSoT
Write-Host "`n=== Análisis de Sincronización ===" -ForegroundColor Cyan
$isHealthy = $true

if ($envPort -eq $null) {
    Write-Host "❌ ERROR: PORT no está definido en .env" -ForegroundColor Red
    $isHealthy = $false
} else {
    if ($dockerPort -notmatch "\$\{PORT" -and $dockerPort -ne $envPort) {
        Write-Host "❌ ERROR: docker-compose.yml mapea al puerto $dockerPort, pero .env dice $envPort." -ForegroundColor Red
        $isHealthy = $false
    } else {
        Write-Host "✅ docker-compose.yml está sincronizado con .env" -ForegroundColor Green
    }

    if ($envViteUrl -notmatch ":$envPort/") {
        Write-Host "❌ ERROR: VITE_API_BASE_URL ($envViteUrl) no coincide con el puerto del backend ($envPort)." -ForegroundColor Red
        $isHealthy = $false
    } else {
        Write-Host "✅ VITE_API_BASE_URL está sincronizado con el puerto del backend" -ForegroundColor Green
    }

    if ($viteProxyTarget -ne $null -and $viteProxyTarget -ne $envPort) {
        Write-Host "⚠️ ADVERTENCIA: vite.config.ts tiene un fallback quemado ($viteProxyTarget) que difiere de .env ($envPort)." -ForegroundColor Yellow
    }
}

# 5. Comprobar ocupación del puerto
Write-Host "`n=== Análisis de Red (Port $envPort) ===" -ForegroundColor Cyan
if ($envPort) {
    $connections = Get-NetTCPConnection -LocalPort $envPort -ErrorAction SilentlyContinue
    if ($connections) {
        Write-Host "⚠️ El puerto $envPort está actualmente EN USO." -ForegroundColor Yellow
        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "   -> Ocupado por PID $($conn.OwningProcess) ($($proc.ProcessName))" -ForegroundColor Red
            } else {
                Write-Host "   -> Ocupado por PID $($conn.OwningProcess)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "✅ El puerto $envPort está libre." -ForegroundColor Green
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($isHealthy) {
    Write-Host "🌟 ESTADO: SALUDABLE. SSoT mantenido." -ForegroundColor Green
} else {
    Write-Host "🚨 ESTADO: DESINCRONIZADO. Riesgo de ERR_CONNECTION_REFUSED." -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
