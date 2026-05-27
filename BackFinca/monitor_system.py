#!/usr/bin/env python3
"""
Sistema de Monitoreo Continuo - Villa Luz
Monitorea salud del backend, database, y rendimiento API
"""
import requests
import time
import sys
from datetime import datetime
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

class SystemMonitor:
    def __init__(self):
        self.base_url = 'http://127.0.0.1:8092/api/v1'
        self.frontend_url = 'https://127.0.0.1:3003'
        self.results = []

    def check_health(self):
        """Verifica salud del backend"""
        try:
            r = requests.get(f'{self.base_url}/health', timeout=10, verify=False)
            data = r.json()
            return {
                'status': 'HEALTHY' if data.get('success') else 'UNHEALTHY',
                'database': data.get('data', {}).get('database_status', 'unknown'),
                'redis': data.get('data', {}).get('redis', 'unknown'),
                'response_time_ms': r.elapsed.total_seconds() * 1000
            }
        except Exception as e:
            return {'status': 'ERROR', 'error': str(e)}

    def check_frontend(self):
        """Verifica accesibilidad del frontend"""
        try:
            start = time.time()
            r = requests.get(self.frontend_url, timeout=10, verify=False)
            elapsed = (time.time() - start) * 1000
            return {
                'accessible': r.status_code == 200,
                'status_code': r.status_code,
                'response_time_ms': elapsed,
                'react_detected': 'id="root"' in r.text or 'react' in r.text.lower()
            }
        except Exception as e:
            return {'accessible': False, 'error': str(e)}

    def check_auth(self):
        """Verifica sistema de autenticación"""
        try:
            r = requests.post(
                f'{self.base_url}/auth/login',
                json={'identification': 1098, 'password': '12345678'},
                verify=False, timeout=10
            )
            data = r.json()
            return {
                'auth_working': r.status_code == 200 and data.get('success'),
                'token_received': 'access_token' in data.get('data', {})
            }
        except Exception as e:
            return {'auth_working': False, 'error': str(e)}

    def check_api_performance(self):
        """Mide rendimiento de endpoints clave"""
        try:
            # Login para obtener token
            r = requests.post(
                f'{self.base_url}/auth/login',
                json={'identification': 1098, 'password': '12345678'},
                verify=False, timeout=10
            )
            token = r.json()['data']['access_token']
            headers = {'Authorization': f'Bearer {token}'}

            endpoints = ['/fincas', '/animals', '/users', '/tasks']
            results = {}

            for ep in endpoints:
                start = time.time()
                r = requests.get(f'{self.base_url}{ep}', headers=headers, verify=False, timeout=10)
                elapsed = (time.time() - start) * 1000
                results[ep] = {
                    'status': r.status_code,
                    'response_time_ms': round(elapsed, 2)
                }

            return results
        except Exception as e:
            return {'error': str(e)}

    def run_full_check(self):
        """Ejecuta verificación completa"""
        print(f"\n{'='*70}")
        print(f"  MONITOREO SISTEMA - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*70}")

        # Health check
        health = self.check_health()
        print("\n🩺 Health Check:")
        print(f"   Status: {health.get('status', 'UNKNOWN')}")
        print(f"   Database: {health.get('database', 'unknown')}")
        print(f"   Redis: {health.get('redis', 'unknown')}")
        if 'response_time_ms' in health:
            print(f"   Response: {health['response_time_ms']:.1f}ms")

        # Frontend
        frontend = self.check_frontend()
        print("\n💻 Frontend:")
        print(f"   Accessible: {'✅' if frontend.get('accessible') else '❌'}")
        print(f"   React: {'✅' if frontend.get('react_detected') else '❌'}")
        if 'response_time_ms' in frontend:
            print(f"   Response: {frontend['response_time_ms']:.1f}ms")

        # Auth
        auth = self.check_auth()
        print("\n🔐 Auth:")
        print(f"   Working: {'✅' if auth.get('auth_working') else '❌'}")
        print(f"   Token: {'✅' if auth.get('token_received') else '❌'}")

        # Performance
        perf = self.check_api_performance()
        print("\n⚡ API Performance:")
        if 'error' not in perf:
            for ep, data in perf.items():
                status = '✅' if data.get('status') == 200 else '❌'
                print(f"   {status} {ep:12} {data.get('response_time_ms', 0):6.1f}ms")
        else:
            print(f"   Error: {perf['error']}")

        # Overall
        all_ok = (
            health.get('status') == 'HEALTHY' and
            frontend.get('accessible') and
            auth.get('auth_working')
        )

        print(f"\n{'='*70}")
        if all_ok:
            print("  ✅ SISTEMA OPERATIVO - Score: 100%")
        else:
            print("  ⚠️ PROBLEMAS DETECTADOS")
        print(f"{'='*70}\n")

        return all_ok

if __name__ == "__main__":
    monitor = SystemMonitor()

    # Modo continuo o single check
    if len(sys.argv) > 1 and sys.argv[1] == '--loop':
        print("🔁 Modo monitoreo continuo (Ctrl+C para detener)")
        try:
            while True:
                monitor.run_full_check()
                time.sleep(30)  # Cada 30 segundos
        except KeyboardInterrupt:
            print("\n👋 Monitoreo detenido")
    else:
        monitor.run_full_check()
