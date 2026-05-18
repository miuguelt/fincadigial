#!/usr/bin/env python3
"""
Dashboard CLI - Villa Luz
Visualización en tiempo real del estado del sistema
"""
import os
import sys
import time
import requests
from datetime import datetime
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Colores para terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def get_system_status():
    """Obtiene estado de todos los componentes"""
    status = {
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'backend': {'ok': False, 'details': {}},
        'frontend': {'ok': False, 'response_ms': 0},
        'auth': {'ok': False},
        'entities': {}
    }
    
    # Backend Health
    try:
        r = requests.get('http://127.0.0.1:8092/api/v1/health', verify=False, timeout=5)
        data = r.json()
        status['backend'] = {
            'ok': data.get('success', False),
            'details': data.get('data', {}),
            'response_ms': r.elapsed.total_seconds() * 1000
        }
    except Exception as e:
        status['backend']['error'] = str(e)
    
    # Frontend
    try:
        start = time.time()
        r = requests.get('https://127.0.0.1:3003', verify=False, timeout=5)
        status['frontend'] = {
            'ok': r.status_code == 200,
            'response_ms': (time.time() - start) * 1000
        }
    except Exception as e:
        status['frontend']['error'] = str(e)
    
    # Auth & Entities
    try:
        r = requests.post('http://127.0.0.1:8092/api/v1/auth/login',
            json={'identification': 1098, 'password': '12345678'},
            verify=False, timeout=5)
        
        if r.status_code == 200:
            status['auth']['ok'] = True
            token = r.json()['data']['access_token']
            headers = {'Authorization': f'Bearer {token}'}
            
            # Check entities
            for ep in ['/fincas', '/animals', '/users', '/tasks']:
                try:
                    r2 = requests.get(f'http://127.0.0.1:8092/api/v1{ep}',
                        headers=headers, verify=False, timeout=3)
                    status['entities'][ep] = {'ok': r2.status_code == 200}
                except:
                    status['entities'][ep] = {'ok': False}
    except:
        status['auth']['ok'] = False
    
    return status

def render_dashboard(status):
    """Renderiza el dashboard"""
    C = Colors
    
    print(f"{C.CYAN}{'='*80}{C.END}")
    print(f"{C.BOLD}  VILLA LUZ SYSTEM DASHBOARD - {status['timestamp']}{C.END}")
    print(f"{C.CYAN}{'='*80}{C.END}")
    
    # Backend
    backend_ok = status['backend'].get('ok', False)
    backend_color = C.GREEN if backend_ok else C.RED
    backend_icon = '✓' if backend_ok else '✗'
    
    print(f"\n{C.BOLD}🔧 BACKEND (Port 8092){C.END}")
    print(f"   {backend_color}{backend_icon}{C.END} Status: {backend_color}{'HEALTHY' if backend_ok else 'ERROR'}{C.END}")
    
    if backend_ok:
        details = status['backend'].get('details', {})
        db_status = details.get('database_status', 'unknown')
        redis_status = details.get('redis', 'unknown')
        
        db_color = C.GREEN if db_status == 'connected' else C.RED
        redis_color = C.GREEN if redis_status == 'ok' else C.RED
        
        print(f"   {db_color}•{C.END} Database: {db_status}")
        print(f"   {redis_color}•{C.END} Redis: {redis_status}")
        print(f"   Response: {status['backend'].get('response_ms', 0):.1f}ms")
    
    # Frontend
    frontend_ok = status['frontend'].get('ok', False)
    frontend_color = C.GREEN if frontend_ok else C.RED
    frontend_icon = '✓' if frontend_ok else '✗'
    
    print(f"\n{C.BOLD}💻 FRONTEND (Port 3003){C.END}")
    print(f"   {frontend_color}{frontend_icon}{C.END} Status: {frontend_color}{'ONLINE' if frontend_ok else 'OFFLINE'}{C.END}")
    if frontend_ok:
        print(f"   Response: {status['frontend'].get('response_ms', 0):.1f}ms")
    
    # Auth
    auth_ok = status['auth'].get('ok', False)
    auth_color = C.GREEN if auth_ok else C.RED
    auth_icon = '✓' if auth_ok else '✗'
    
    print(f"\n{C.BOLD}🔐 AUTHENTICATION{C.END}")
    print(f"   {auth_color}{auth_icon}{C.END} JWT Auth: {auth_color}{'WORKING' if auth_ok else 'ERROR'}{C.END}")
    
    # Entities
    if status['entities']:
        print(f"\n{C.BOLD}🗃️  CRUD ENTITIES{C.END}")
        for ep, data in sorted(status['entities'].items()):
            ep_ok = data.get('ok', False)
            ep_color = C.GREEN if ep_ok else C.RED
            ep_icon = '✓' if ep_ok else '✗'
            print(f"   {ep_color}{ep_icon}{C.END} {ep:15}")
    
    # Overall
    all_ok = backend_ok and frontend_ok and auth_ok
    if all_ok and status['entities']:
        all_ok = all(e.get('ok', False) for e in status['entities'].values())
    
    overall_color = C.GREEN if all_ok else C.RED
    
    print(f"\n{C.CYAN}{'='*80}{C.END}")
    print(f"{overall_color}{C.BOLD}  {'✓ SYSTEM OPERATIONAL' if all_ok else '✗ SYSTEM ISSUES DETECTED'}{C.END}")
    print(f"{C.CYAN}{'='*80}{C.END}")

def main():
    """Main loop"""
    try:
        while True:
            clear_screen()
            status = get_system_status()
            render_dashboard(status)
            print("\n  Press Ctrl+C to exit...")
            time.sleep(5)
    except KeyboardInterrupt:
        print("\n\n  👋 Dashboard stopped")

if __name__ == "__main__":
    main()
