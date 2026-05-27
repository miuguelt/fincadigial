#!/usr/bin/env python3
"""
Script de auditoría para verificar endpoints del menú y rutas del frontend.
Verifica que todas las rutas del sidebar tengan correspondencia en:
1. AppRoutes.tsx (rutas del frontend)
2. Backend endpoints (API)
"""

import re
import os
from pathlib import Path
from typing import List, Dict, Tuple

# Rutas del menú según sidebarConfig.tsx
MENU_PATHS = [
    # Panel y analítica
    'dashboard',
    'analytics/executive',
    # Gestión de Animales
    'animals',
    'reproduction',
    'growth',
    'breeds',
    'genetic-improvements',
    'controls',
    # Sanidad y Salud
    'disease-animals',
    'diseases',
    'treatments',
    'inventory',
    'medications',
    'vaccines',
    'vaccinations',
    # Terrenos y Alimentación
    'fields',
    'animal-fields',
    'food-types',
    # Administración
    'users',
    'fincas',
    'membership',
]

# Endpoints del backend esperados
BACKEND_ENDPOINTS = [
    '/animals',
    '/species',
    '/breeds',
    '/fields',
    '/animal_fields',
    '/diseases',
    '/treatments',
    '/medications',
    '/vaccines',
    '/vaccinations',
    '/food_types',
    '/inventory',
    '/users',
    '/reproduction',
    '/genetic_improvements',
    '/controls',
    '/fincas',
    '/membership',
]

def check_frontend_routes(app_routes_path: str) -> Tuple[List[str], List[str]]:
    """Verifica qué rutas del menú existen en AppRoutes.tsx"""
    found = []
    missing = []
    
    with open(app_routes_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for path in MENU_PATHS:
        # Buscar patrones como path="/admin/xxx" o path={`${prefix}/xxx`}
        pattern = rf'path=["\'].*{re.escape(path)}["\']'
        if re.search(pattern, content):
            found.append(path)
        else:
            missing.append(path)
    
    return found, missing

def check_backend_namespaces(backend_path: str) -> Tuple[List[str], List[str]]:
    """Verifica qué namespaces/endpoints existen en el backend"""
    found = []
    missing = []
    
    namespaces_dir = Path(backend_path) / 'app' / 'namespaces'
    if not namespaces_dir.exists():
        return [], BACKEND_ENDPOINTS
    
    # Obtener todos los archivos de namespace
    namespace_files = list(namespaces_dir.rglob('*_namespace.py'))
    namespace_names = [f.stem.replace('_namespace', '') for f in namespace_files]
    
    # Mapeo de endpoints a nombres de namespace
    endpoint_to_namespace = {
        '/animals': 'animals',
        '/species': 'species',
        '/breeds': 'breeds',
        '/fields': 'fields',
        '/animal_fields': 'animal_fields',
        '/diseases': 'diseases',
        '/treatments': 'treatments',
        '/medications': 'medications',
        '/vaccines': 'vaccines',
        '/vaccinations': 'vaccinations',
        '/food_types': 'food_types',
        '/inventory': 'inventory',
        '/users': 'users',
        '/reproduction': 'reproduction',
        '/genetic_improvements': 'genetic_improvements',
        '/controls': 'control',
        '/fincas': 'fincas',
        '/membership': 'membership',
    }
    
    for endpoint, namespace in endpoint_to_namespace.items():
        if namespace in namespace_names:
            found.append(endpoint)
        else:
            missing.append(endpoint)
    
    return found, missing

def main():
    base_path = Path(__file__).parent.parent
    frontend_path = base_path / 'VillaLuzFront'
    backend_path = base_path / 'BackFinca'
    
    print("=" * 80)
    print("🔍 AUDITORÍA DE MENÚ Y ENDPOINTS")
    print("=" * 80)
    
    # Verificar rutas del frontend
    print("\n📋 1. Verificando rutas del frontend...")
    app_routes = frontend_path / 'src' / 'app' / 'routes' / 'AppRoutes.tsx'
    
    if app_routes.exists():
        found_routes, missing_routes = check_frontend_routes(str(app_routes))
        print(f"   ✅ Rutas encontradas: {len(found_routes)}")
        if missing_routes:
            print(f"   ❌ Rutas faltantes en AppRoutes.tsx:")
            for route in missing_routes:
                print(f"      - /admin/{route}")
    else:
        print("   ⚠️  No se encontró AppRoutes.tsx")
    
    # Verificar endpoints del backend
    print("\n📋 2. Verificando endpoints del backend...")
    found_backend, missing_backend = check_backend_namespaces(str(backend_path))
    print(f"   ✅ Endpoints encontrados: {len(found_backend)}")
    if missing_backend:
        print(f"   ❌ Endpoints faltantes en backend:")
        for endpoint in missing_backend:
            print(f"      - {endpoint}")
    
    # Verificar páginas existentes
    print("\n📋 3. Verificando páginas en el frontend...")
    admin_pages = frontend_path / 'src' / 'pages' / 'dashboard' / 'admin'
    if admin_pages.exists():
        page_dirs = [d.name for d in admin_pages.iterdir() if d.is_dir()]
        print(f"   📁 Directorios de páginas encontrados: {len(page_dirs)}")
        
        # Mapear paths a nombres de directorios
        path_to_dir = {
            'animals': 'animals',
            'breeds': 'breeds',
            'diseases': 'diseases',
            'fields': 'fields',
            'animal-fields': 'animalFields',
            'disease-animals': 'animalDiseases',
            'treatments': 'treatments',
            'medications': 'medications',
            'vaccines': 'vaccines',
            'vaccinations': 'vaccinations',
            'inventory': 'inventory',
            'food-types': 'food-types',
            'users': 'users',
            'genetic-improvements': 'genetic_improvements',
            'controls': 'control',
            'fincas': 'fincas',
            'membership': 'membership',
            'reproduction': 'reproduction',
            'growth': 'growth',
        }
        
        missing_pages = []
        for path, expected_dir in path_to_dir.items():
            if expected_dir not in page_dirs:
                missing_pages.append(path)
        
        if missing_pages:
            print(f"   ⚠️  Páginas potencialmente faltantes (directorios no encontrados):")
            for page in missing_pages:
                print(f"      - {page}")
    
    print("\n" + "=" * 80)
    print("✅ Auditoría completada")
    print("=" * 80)
    
    # Resumen
    print("\n📊 RESUMEN:")
    print(f"   - Total rutas en menú: {len(MENU_PATHS)}")
    if app_routes.exists():
        print(f"   - Rutas con implementación: {len(found_routes)}")
        print(f"   - Rutas faltantes: {len(missing_routes)}")
    print(f"   - Endpoints backend: {len(found_backend)}/{len(BACKEND_ENDPOINTS)}")

if __name__ == '__main__':
    main()
