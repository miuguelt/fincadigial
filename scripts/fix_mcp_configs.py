import json
import os
import subprocess

def get_node_path():
    try:
        # Intenta obtener la ruta absoluta de node
        result = subprocess.run(['powershell', '-Command', '(Get-Command node).Definition'], 
                             capture_output=True, text=True, check=True)
        path = result.stdout.strip()
        if path:
            return path
    except:
        pass
    return "node" # fallback

def fix_json(path, node_path):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    modified = False
    if 'mcpServers' in data:
        for name, server in data['mcpServers'].items():
            # Eliminar claves no estándar
            if '_comment' in server:
                del server['_comment']
                modified = True
            if 'alwaysAllow' in server:
                del server['alwaysAllow']
                modified = True
            
            # Asegurar ruta absoluta de node
            if server.get('command') == 'node':
                server['command'] = node_path
                modified = True
                
    if modified:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Fixed {path} (Node: {node_path})")
    else:
        print(f"No changes needed for {path}")

node_path = get_node_path()

# Fix Claude Config
claude_path = os.path.expandvars(r'%APPDATA%\Claude\claude_desktop_config.json')
fix_json(claude_path, node_path)

# Fix Gemini Config
gemini_path = os.path.expanduser(r'~/.gemini/settings.json')
fix_json(gemini_path, node_path)
