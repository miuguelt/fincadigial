#!/usr/bin/env python3
"""
API Documentation Generator - Villa Luz
Genera documentación de endpoints disponibles
"""
import requests
import json
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

BASE_URL = 'http://127.0.0.1:8092/api/v1'

def get_api_spec():
    """Obtiene especificación Swagger de la API"""
    try:
        r = requests.get(f'{BASE_URL}/swagger.json', verify=False, timeout=10)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def generate_docs():
    """Genera documentación legible"""
    spec = get_api_spec()
    if not spec:
        print("❌ No se pudo obtener especificación de API")
        return
    
    print("=" * 80)
    print("  API DOCUMENTATION - VILLA LUZ")
    print("=" * 80)
    
    # Info general
    info = spec.get('info', {})
    print(f"\n📋 {info.get('title', 'API')}")
    print(f"   Version: {info.get('version', 'unknown')}")
    print(f"   Description: {info.get('description', 'N/A')}")
    
    # Endpoints
    paths = spec.get('paths', {})
    print(f"\n🔌 Endpoints ({len(paths)} paths):")
    print("-" * 80)
    
    # Agrupar por namespace
    namespaces = {}
    for path, methods in sorted(paths.items()):
        # Extraer namespace
        parts = path.strip('/').split('/')
        if len(parts) > 0:
            ns = parts[0] if parts[0] != 'api' else (parts[1] if len(parts) > 1 else 'root')
        else:
            ns = 'root'
        
        if ns not in namespaces:
            namespaces[ns] = []
        
        for method, details in methods.items():
            if method in ['get', 'post', 'put', 'delete', 'patch']:
                namespaces[ns].append({
                    'path': path,
                    'method': method.upper(),
                    'summary': details.get('summary', 'No description'),
                    'tags': details.get('tags', [])
                })
    
    # Mostrar por namespace
    for ns, endpoints in sorted(namespaces.items()):
        print(f"\n📁 /{ns}")
        for ep in endpoints:
            method = ep['method']
            path = ep['path']
            summary = ep['summary'][:50] + '...' if len(ep['summary']) > 50 else ep['summary']
            
            # Color por método
            color = {
                'GET': '🟢',
                'POST': '🟡',
                'PUT': '🟠',
                'DELETE': '🔴',
                'PATCH': '🔵'
            }.get(method, '⚪')
            
            print(f"   {color} {method:6} {path:30} {summary}")
    
    print("\n" + "=" * 80)
    print(f"  Total: {sum(len(eps) for eps in namespaces.values())} endpoints documentados")
    print("=" * 80)

if __name__ == "__main__":
    generate_docs()
