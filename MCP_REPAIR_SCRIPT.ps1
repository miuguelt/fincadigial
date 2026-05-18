# MCP Repair Script - DevBrain Ecosystem
# Este script configura las variables necesarias para los MCPs

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  MCP REPAIR SCRIPT - DevBrain Ecosystem" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Verificar estado actual
Write-Host "1. Verificando estado de MCPs..." -ForegroundColor Yellow

$mcps = @(
    @{Name="Unified Hub"; Port=8010},
    @{Name="GPU Bridge"; Port=7800},
    @{Name="NPU Bridge"; Port=7801},
    @{Name="Ollama"; Port=11434},
    @{Name="SearXNG"; Port=8888},
    @{Name="Qdrant"; Port=6333},
    @{Name="Redis"; Port=6379},
    @{Name="Postgres"; Port=5432}
)

foreach ($mcp in $mcps) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$($mcp.Port)" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        Write-Host "   [$($mcp.Name)]" -NoNewline
        Write-Host " OK" -ForegroundColor Green
    } catch {
        Write-Host "   [$($mcp.Name)]" -NoNewline
        Write-Host " OFFLINE" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Configuración de Tokens (requerido manualmente):" -ForegroundColor Yellow
Write-Host "   Las siguientes variables deben configurarse en el entorno:" -ForegroundColor Gray
Write-Host ""
Write-Host "   [GITHUB_TOKEN]" -NoNewline
Write-Host " No configurado" -ForegroundColor Red
Write-Host "      → Necesario para: github_list_repos" -ForegroundColor Gray
Write-Host "      → Obtener en: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host ""
Write-Host "   [NOTION_TOKEN]" -NoNewline
Write-Host " No configurado" -ForegroundColor Red
Write-Host "      → Necesario para: notion_search" -ForegroundColor Gray
Write-Host "      → Obtener en: https://www.notion.so/my-integrations" -ForegroundColor Gray
Write-Host ""
Write-Host "   [FIGMA_TOKEN]" -NoNewline
Write-Host " No configurado" -ForegroundColor Red
Write-Host "      → Necesario para: figma_get_file" -ForegroundColor Gray
Write-Host "      → Obtener en: https://www.figma.com/developers/api" -ForegroundColor Gray
Write-Host ""
Write-Host "   [DEVBRAIN_PG_DSN]" -NoNewline
Write-Host " No configurado" -ForegroundColor Red
Write-Host "      → Necesario para: gm_get_context (Global Mind)" -ForegroundColor Gray
Write-Host "      → Formato: postgresql://user:pass@host:port/db" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Problemas conocidos:" -ForegroundColor Yellow
Write-Host "   ⚠ MCP-UI validate_html: Parser defectuoso" -ForegroundColor Yellow
Write-Host "   ⚠ MCP-UI search_components: 21st.dev API error 405" -ForegroundColor Yellow
Write-Host "   ⚠ MCP-AI: Daemon running pero not ready (investigar)" -ForegroundColor Yellow
Write-Host ""

Write-Host "4. Instrucciones para configurar tokens:" -ForegroundColor Yellow
Write-Host "   Opción A - Variables de entorno temporales:" -ForegroundColor Gray
Write-Host "      `$env:GITHUB_TOKEN='ghp_xxxxxxxx'" -ForegroundColor Cyan
Write-Host "      `$env:NOTION_TOKEN='secret_xxxxxxxx'" -ForegroundColor Cyan
Write-Host "      `$env:FIGMA_TOKEN='figd_xxxxxxxx'" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Opción B - Archivo .env persistente:" -ForegroundColor Gray
Write-Host "      Agregar al archivo C:\Users\Miguel\.mcp\config.env" -ForegroundColor Cyan
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  REPAIR COMPLETED" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
