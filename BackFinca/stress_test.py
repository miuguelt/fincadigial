#!/usr/bin/env python3
"""
Stress Test - Villa Luz API
Prueba de carga para endpoints críticos
"""
import requests
import time
import concurrent.futures
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

BASE_URL = 'http://127.0.0.1:8092/api/v1'

class StressTester:
    def __init__(self):
        self.token = None
        self.headers = {}

    def login(self):
        """Obtiene token JWT"""
        r = requests.post(
            f'{BASE_URL}/auth/login',
            json={'identification': 1098, 'password': '12345678'},
            verify=False, timeout=10
        )
        self.token = r.json()['data']['access_token']
        self.headers = {'Authorization': f'Bearer {self.token}'}
        return True

    def test_endpoint(self, endpoint, method='GET', data=None):
        """Test individual de endpoint"""
        url = f'{BASE_URL}{endpoint}'
        start = time.time()

        try:
            if method == 'GET':
                r = requests.get(url, headers=self.headers, verify=False, timeout=10)
            else:
                r = requests.post(url, headers=self.headers, json=data, verify=False, timeout=10)

            elapsed = (time.time() - start) * 1000
            return {
                'success': r.status_code == 200,
                'status': r.status_code,
                'time_ms': elapsed
            }
        except Exception as e:
            return {'success': False, 'error': str(e), 'time_ms': 0}

    def run_concurrent_test(self, endpoint, concurrency=10, requests_count=50):
        """Prueba concurrente de endpoint"""
        print(f"\n🔥 Stress Test: {endpoint}")
        print(f"   Concurrency: {concurrency} | Requests: {requests_count}")

        results = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(self.test_endpoint, endpoint) for _ in range(requests_count)]
            for future in concurrent.futures.as_completed(futures):
                results.append(future.result())

        # Stats
        successful = sum(1 for r in results if r.get('success'))
        failed = len(results) - successful
        times = [r['time_ms'] for r in results if 'time_ms' in r]

        avg_time = sum(times) / len(times) if times else 0
        max_time = max(times) if times else 0
        min_time = min(times) if times else 0

        print(f"   ✅ Success: {successful}/{len(results)} ({successful/len(results)*100:.1f}%)")
        print(f"   ❌ Failed: {failed}")
        print(f"   ⏱️  Avg: {avg_time:.1f}ms | Min: {min_time:.1f}ms | Max: {max_time:.1f}ms")

        return successful == len(results)

    def run_full_stress_test(self):
        """Ejecuta pruebas de carga completas"""
        print("=" * 70)
        print("  STRESS TEST - VILLA LUZ API")
        print("=" * 70)

        # Login
        print("\n🔐 Login...")
        if not self.login():
            print("❌ Login failed")
            return False
        print("✅ Logged in")

        # Tests
        endpoints = [
            ('/fincas', 10, 30),
            ('/animals', 5, 20),
            ('/users', 5, 20),
            ('/tasks', 5, 20),
        ]

        all_passed = True
        for ep, conc, reqs in endpoints:
            if not self.run_concurrent_test(ep, conc, reqs):
                all_passed = False

        print("\n" + "=" * 70)
        if all_passed:
            print("  ✅ STRESS TEST PASSED - Sistema resiste carga")
        else:
            print("  ⚠️ Algunos endpoints fallaron bajo carga")
        print("=" * 70)

        return all_passed

if __name__ == "__main__":
    tester = StressTester()
    tester.run_full_stress_test()
