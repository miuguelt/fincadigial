$GLOBAL_CONFIG = "C:\Users\Miguel\Documents\Aplicaciones\GLOBAL_CONFIG.json"
$ROOT = "C:\Users\Miguel\Documents\Aplicaciones\2Sistema hibrido con WSL\mcp"
$STATUS_SCRIPT = Join-Path $ROOT "START-DEVBRAIN.ps1"

Write-Host "🔍 Ejecutando Auditoría DevBrain Pre-Commit..." -ForegroundColor Cyan

if (-not (Test-Path $STATUS_SCRIPT)) {
    Write-Host "⚠️ No se encontró el script de auditoría. Permitiendo commit por defecto." -ForegroundColor Yellow
    exit 0
}

# 1. Auditoría de Ecosistema (Servidores y Puentes)
$output = & pwsh -NoProfile -ExecutionPolicy Bypass -File $STATUS_SCRIPT -NoPause 2>&1

# Extraer porcentaje de salud
if ($output -match "Salud: \[.*\]\s+(\d+)%") {
    $health = [int]$matches[1]
    Write-Host "📊 Salud del Ecosistema: $health%" -ForegroundColor $(if ($health -ge 90) { "Green" } else { "Red" })
    
    if ($health -lt 90) {
        Write-Host "❌ COMMIT RECHAZADO: Salud de infraestructura baja ($health%)." -ForegroundColor Red
        exit 1
    }
}

# 2. Auditoría Técnica (Hardcoding y Encoding)
Write-Host "🔍 Verificando estándares técnicos DevBrain..." -ForegroundColor Cyan

# Obtener archivos modificados
$files = git diff --cached --name-only --diff-filter=ACM

foreach ($file in $files) {
    if ($file -match "\.(py|js|tsx|ts|html)$") {
        $content = Get-Content $file -Raw
        
        # Detectar Hardcoding de URLs críticas (localhost:5000)
        if ($content -match "http://localhost:5000" -or $content -match "http://127\.0\.0\.1:5000") {
            Write-Host "❌ ERROR: Hardcoding detectado en $file (URL de backend estática)." -ForegroundColor Red
            Write-Host "   Use variables de entorno (.env) en su lugar." -ForegroundColor Yellow
            exit 1
        }
        
        # Detectar secretos potenciales
        if ($content -match "JWT_SECRET_KEY\s*=\s*['\"].+['\"]" -or $content -match "DB_PASSWORD\s*=\s*['\"].+['\"]") {
            Write-Host "❌ ERROR: Credenciales detectadas en $file." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "✅ Auditoría técnica superada. Committing..." -ForegroundColor Green
exit 0
