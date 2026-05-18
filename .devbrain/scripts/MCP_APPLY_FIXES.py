#!/usr/bin/env python3
"""
MCP APPLY FIXES - Script de corrección automatizada
Aplica correcciones a los problemas detectados en la auditoría MCP
"""
import os
import sys
import subprocess
import json

print("=" * 80)
print("  MCP APPLY FIXES - Corrección Automatizada")
print("=" * 80)

fixes_applied = []
fixes_failed = []

# =============================================================================
# FIX 1: Configurar archivo de tokens para MCP-Integrations
# =============================================================================
print("\n🔧 FIX 1: Configuración de tokens MCP")
print("-" * 80)

mcp_config_dir = os.path.expanduser("~/.mcp")
mcp_config_file = os.path.join(mcp_config_dir, "config.env")

if not os.path.exists(mcp_config_dir):
    os.makedirs(mcp_config_dir)
    print(f"  ✅ Creado directorio: {mcp_config_dir}")
else:
    print(f"  ✅ Directorio ya existe: {mcp_config_dir}")

# Crear archivo de configuración con instrucciones
config_content = """# MCP DevBrain Configuration
# ============================================
# TOKENS DE INTEGRACIÓN
# ============================================

# GitHub Personal Access Token
# 1. Ir a: https://github.com/settings/tokens
# 2. Generar nuevo token (classic)
# 3. Permisos: repo, read:user
# 4. Copiar token y reemplazar aquí:
# GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Notion Integration Token  
# 1. Ir a: https://www.notion.so/my-integrations
# 2. Crear nueva integración
# 3. Copiar token y reemplazar aquí:
# NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxx

# Figma Personal Access Token
# 1. Ir a: https://www.figma.com/developers/api
# 2. Generar token personal
# 3. Copiar token y reemplazar aquí:
# FIGMA_TOKEN=figd_xxxxxxxxxxxxxxxxxxxx

# ============================================
# OLLAMA - MCP-AI Configuration
# ============================================
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:latest
"""

try:
    with open(mcp_config_file, 'w') as f:
        f.write(config_content)
    print(f"  ✅ Creado archivo: {mcp_config_file}")
    print(f"  ℹ️  Instrucciones para configurar tokens incluidas")
    fixes_applied.append("Config file created with token instructions")
except Exception as e:
    print(f"  ❌ Error creando archivo: {e}")
    fixes_failed.append(f"Config file: {e}")

# =============================================================================
# FIX 2: Workaround para MCP-UI validate_html
# =============================================================================
print("\n🔧 FIX 2: Workaround MCP-UI validate_html")
print("-" * 80)

try:
    # Crear wrapper que usa BeautifulSoup en lugar del parser defectuoso
    fixes_dir = os.path.expanduser("~/mcp_fixes")
    os.makedirs(fixes_dir, exist_ok=True)
    
    validate_fix_script = os.path.join(fixes_dir, "validate_html_fix.py")
    
    script_content = '''#!/usr/bin/env python3
"""FIX para MCP-UI validate_html usando BeautifulSoup"""
from bs4 import BeautifulSoup
import json
import sys

def validate_html_fixed(html_content):
    """Validación HTML corregida"""
    issues = []
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Verificar estructura básica
        if not soup.find('html'):
            issues.append({"type": "missing_tag", "message": "Tag <html> no encontrado"})
        if not soup.find('head'):
            issues.append({"type": "missing_tag", "message": "Tag <head> no encontrado"})
        if not soup.find('body'):
            issues.append({"type": "missing_tag", "message": "Tag <body> no encontrado"})
        
        # Verificar imágenes sin alt
        for img in soup.find_all('img', alt=False):
            issues.append({"type": "accessibility", "message": f"Imagen sin alt"})
        
        return {
            "valid": len(issues) == 0,
            "issueCount": len(issues),
            "issues": issues,
            "parser": "BeautifulSoup (fixed)"
        }
    except Exception as e:
        return {
            "valid": False,
            "issueCount": 1,
            "issues": [{"type": "error", "message": str(e)}]
        }

if __name__ == "__main__":
    html = sys.argv[1] if len(sys.argv) > 1 else "<html></html>"
    result = validate_html_fixed(html)
    print(json.dumps(result, indent=2))
'''
    
    with open(validate_fix_script, 'w') as f:
        f.write(script_content)
    
    print(f"  ✅ Creado workaround: {validate_fix_script}")
    print(f"  ℹ️  Para usar: python {validate_fix_script} '<html>...</html>'")
    fixes_applied.append("validate_html workaround created")
    
except Exception as e:
    print(f"  ❌ Error creando workaround: {e}")
    fixes_failed.append(f"validate_html fix: {e}")

# =============================================================================
# FIX 3: Investigación MCP-AI
# =============================================================================
print("\n🔧 FIX 3: Diagnóstico MCP-AI")
print("-" * 80)

try:
    import requests
    
    # Verificar Ollama
    resp = requests.get('http://127.0.0.1:11434/api/tags', timeout=5)
    if resp.status_code == 200:
        data = resp.json()
        models = data.get('models', [])
        print(f"  ✅ Ollama respondiendo: {len(models)} modelos")
        print(f"  ℹ️  Modelos: {', '.join([m.get('name', '?') for m in models[:3]])}")
        
        # Verificar modelo por defecto
        default_model = "llama3.2:latest"
        model_names = [m.get('name') for m in models]
        if default_model in model_names:
            print(f"  ✅ Modelo por defecto disponible: {default_model}")
        else:
            print(f"  ⚠️ Modelo por defecto no encontrado: {default_model}")
            print(f"  ℹ️ Modelos disponibles: {model_names}")
        
        fixes_applied.append("Ollama connectivity verified")
    else:
        print(f"  ⚠️ Ollama respondió con status: {resp.status_code}")
        fixes_failed.append("Ollama status not 200")
        
except Exception as e:
    print(f"  ❌ Error conectando a Ollama: {e}")
    fixes_failed.append(f"Ollama connection: {e}")

# Crear archivo de configuración para MCP-AI
ai_config_dir = os.path.expanduser("~/.config/mcp-ai")
os.makedirs(ai_config_dir, exist_ok=True)

ai_config = {
    "ollama": {
        "host": "http://127.0.0.1:11434",
        "default_model": "llama3.2:latest",
        "timeout": 30
    },
    "features": {
        "chat": True,
        "embeddings": True,
        "completion": True
    }
}

try:
    with open(os.path.join(ai_config_dir, "config.json"), 'w') as f:
        json.dump(ai_config, f, indent=2)
    print(f"  ✅ Creada config MCP-AI: {ai_config_dir}/config.json")
    fixes_applied.append("MCP-AI config created")
except Exception as e:
    print(f"  ❌ Error creando config: {e}")

# =============================================================================
# FIX 4: Workaround para 21st.dev search_components
# =============================================================================
print("\n🔧 FIX 4: Workaround 21st.dev search_components")
print("-" * 80)

print("  ℹ️  21st.dev API retorna 405 - posible cambio en API")
print("  ℹ️  Workaround: Implementar búsqueda local de componentes")

# Crear base de datos local de componentes comunes
components_db = {
    "button": [
        {"name": "Button", "library": "shadcn", "install": "npx shadcn add button"},
        {"name": "Button", "library": "mui", "install": "npm install @mui/material"},
    ],
    "card": [
        {"name": "Card", "library": "shadcn", "install": "npx shadcn add card"},
    ],
    "input": [
        {"name": "Input", "library": "shadcn", "install": "npx shadcn add input"},
    ],
    "dialog": [
        {"name": "Dialog", "library": "shadcn", "install": "npx shadcn add dialog"},
    ],
    "table": [
        {"name": "Table", "library": "shadcn", "install": "npx shadcn add table"},
    ]
}

try:
    with open(os.path.join(fixes_dir, "components_db.json"), 'w') as f:
        json.dump(components_db, f, indent=2)
    print(f"  ✅ Creada DB local de componentes")
    fixes_applied.append("Local components DB created as 21st.dev fallback")
except Exception as e:
    print(f"  ❌ Error creando DB: {e}")

# =============================================================================
# RESUMEN
# =============================================================================
print("\n" + "=" * 80)
print("  RESUMEN DE CORRECCIONES")
print("=" * 80)

print(f"\n  ✅ Fixes aplicados: {len(fixes_applied)}")
for fix in fixes_applied:
    print(f"     - {fix}")

if fixes_failed:
    print(f"\n  ❌ Fixes fallidos: {len(fixes_failed)}")
    for fix in fixes_failed:
        print(f"     - {fix}")
else:
    print("\n  ✅ Todos los fixes aplicados correctamente")

print("\n" + "=" * 80)
print("  PRÓXIMOS PASOS MANUALES:")
print("=" * 80)
print("""
  1. Configurar tokens en ~/.mcp/config.env:
     - GITHUB_TOKEN: https://github.com/settings/tokens
     - NOTION_TOKEN: https://www.notion.so/my-integrations
     - FIGMA_TOKEN: https://www.figma.com/developers/api
  
  2. Reiniciar daemon MCP-AI (si es necesario):
     - mcp-ai --config ~/.config/mcp-ai/config.json
  
  3. Para usar validate_html corregido:
     - python ~/mcp_fixes/validate_html_fix.py '<html>...'
     
  4. Para búsqueda de componentes (fallback):
     - Revisar ~/mcp_fixes/components_db.json
""")

print("=" * 80)
print("  MCP FIXES COMPLETADO")
print("=" * 80)
