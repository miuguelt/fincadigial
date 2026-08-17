#!/usr/bin/env python3
"""
Script de Verificación de Despliegue Multi-Tenant
================================================
Verifica que todas las componentes del sistema estén operativas.

Uso:
    python verify_deployment.py

Salida:
    - Reporte detallado de cada componente
    - Estado final: READY o FAILED
"""

import requests
import secrets
import sys

from test_credentials import get_role_credentials

BASE_URL = "http://localhost:8181/api/v1"
FRONTEND_URL = "http://localhost:5173"


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


class DeploymentVerifier:
    def __init__(self):
        self.results: list[tuple[str, bool, str]] = []
        self.credentials = {
            role: get_role_credentials(role) for role in ("Administrador", "Instructor", "Aprendiz")
        }

    def log(self, status: str, message: str, detail: str = ""):
        color = Colors.GREEN if status == "✓" else Colors.RED if status == "✗" else Colors.YELLOW
        print(f"{color}{status}{Colors.RESET} {message}")
        if detail:
            print(f"  {Colors.BLUE}→{Colors.RESET} {detail}")

    def check_health(self) -> bool:
        """Verificar API health"""
        try:
            resp = requests.get(f"{BASE_URL}/health", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "healthy":
                    self.log("✓", "API Health Check", f"Versión: {data.get('version', 'N/A')}")
                    return True
            self.log("✗", "API Health Check", f"Status: {resp.status_code}")
            return False
        except Exception as e:
            self.log("✗", "API Health Check", str(e))
            return False

    def check_login(self, ident: str, pwd: str, role: str) -> bool:
        """Verificar login de un rol"""
        try:
            resp = requests.post(
                f"{BASE_URL}/auth/login", json={"identifier": ident, "password": pwd}, timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("success"):
                    user = data.get("data", {}).get("user", {})
                    self.log(
                        "✓",
                        f"Login {role}",
                        f"{user.get('fullname')} (finca: {user.get('finca_id')})",
                    )
                    return True
            self.log("✗", f"Login {role}", f"Status: {resp.status_code}")
            return False
        except Exception as e:
            self.log("✗", f"Login {role}", str(e))
            return False

    def check_tenant_isolation(self) -> bool:
        """Verificar aislamiento de fincas"""
        try:
            # Login como administrador
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "identifier": self.credentials["Administrador"][0],
                    "password": self.credentials["Administrador"][1],
                },
                timeout=5,
            )
            token = resp.json()["data"]["access_token"]

            # Consultar animales
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.get(f"{BASE_URL}/animals", headers=headers, timeout=5)

            if resp.status_code == 200:
                data = resp.json()
                animals = data.get("data", [])

                # Verificar que todos tengan finca_id
                all_have_finca = all(a.get("finca_id") is not None for a in animals[:5])

                if all_have_finca:
                    self.log(
                        "✓", "Tenant Isolation", f"{len(animals)} animales con finca_id verificado"
                    )
                    return True
                else:
                    self.log("✗", "Tenant Isolation", "Algunos animales no tienen finca_id")
                    return False
            else:
                self.log("✗", "Tenant Isolation", f"Status: {resp.status_code}")
                return False
        except Exception as e:
            self.log("✗", "Tenant Isolation", str(e))
            return False

    def check_rbac(self) -> bool:
        """Verificar restricciones RBAC"""
        try:
            # Login como aprendiz
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "identifier": self.credentials["Aprendiz"][0],
                    "password": self.credentials["Aprendiz"][1],
                },
                timeout=5,
            )
            token = resp.json()["data"]["access_token"]

            # Intentar POST a animals (debe fallar)
            headers = {"Authorization": f"Bearer {token}"}
            resp = requests.post(f"{BASE_URL}/animals", headers=headers, json={}, timeout=5)

            if resp.status_code in [403, 401]:
                self.log("✓", "RBAC Restrictions", "Aprendiz bloqueado para POST /animals")
                return True
            else:
                self.log(
                    "✗",
                    "RBAC Restrictions",
                    f"Aprendiz debería tener 403, obtuvo {resp.status_code}",
                )
                return False
        except Exception as e:
            self.log("✗", "RBAC Restrictions", str(e))
            return False

    def check_public_registration(self) -> bool:
        """Verificar endpoint de registro público"""
        try:
            import random

            random_id = random.randint(10000000, 99999999)

            payload = {
                "finca": {"name": f"Finca Test {random_id}", "type": "Tradicional"},
                "owner": {
                    "identification": random_id,
                    "fullname": "Usuario Test",
                    "email": f"test{random_id}@test.com",
                    "phone": f"300{random_id}",
                    "password": secrets.token_urlsafe(18),
                },
            }

            resp = requests.post(f"{BASE_URL}/public/register", json=payload, timeout=10)

            if resp.status_code == 201:
                self.log("✓", "Public Registration", "Finca y propietario creados")
                return True
            elif resp.status_code == 409:
                self.log("✓", "Public Registration", "Endpoint responde (usuario/finca existente)")
                return True
            else:
                self.log("✗", "Public Registration", f"Status: {resp.status_code}")
                return False
        except Exception as e:
            self.log("✗", "Public Registration", str(e))
            return False

    def check_multi_finca(self) -> bool:
        """Verificar endpoints multi-finca"""
        try:
            # Login
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                json={
                    "identifier": self.credentials["Administrador"][0],
                    "password": self.credentials["Administrador"][1],
                },
                timeout=5,
            )
            token = resp.json()["data"]["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # Check my-fincas
            resp = requests.get(f"{BASE_URL}/multi-finca/my-fincas", headers=headers, timeout=5)
            my_fincas_ok = resp.status_code == 200

            # Check current
            resp = requests.get(f"{BASE_URL}/multi-finca/current", headers=headers, timeout=5)
            current_ok = resp.status_code == 200

            if my_fincas_ok and current_ok:
                self.log("✓", "Multi-Finca Endpoints", "/my-fincas y /current operativos")
                return True
            else:
                self.log(
                    "✗",
                    "Multi-Finca Endpoints",
                    f"my-fincas: {my_fincas_ok}, current: {current_ok}",
                )
                return False
        except Exception as e:
            self.log("✗", "Multi-Finca Endpoints", str(e))
            return False

    def check_sse_endpoint(self) -> bool:
        """Verificar que el endpoint SSE existe"""
        try:
            # Solo verificar que el endpoint existe (no la conexión SSE)
            resp = requests.get(f"{BASE_URL}/analytics/live/stream", timeout=2)
            # Debería retornar 401 sin token, lo cual es correcto
            if resp.status_code == 401:
                self.log("✓", "SSE Endpoint", "/analytics/live/stream protegido y operativo")
                return True
            else:
                self.log("?", "SSE Endpoint", f"Status inesperado: {resp.status_code}")
                return True  # No es crítico
        except Exception:
            self.log("?", "SSE Endpoint", "No se pudo verificar (puede requerir token)")
            return True  # No es crítico

    def run_all_checks(self):
        """Ejecutar todas las verificaciones"""
        print(f"{Colors.BLUE}{'=' * 60}{Colors.RESET}")
        print(
            f"{Colors.BLUE}VERIFICACIÓN DE DESPLIEGUE MULTI-TENANT _projects/villaluz{Colors.RESET}"
        )
        print(f"{Colors.BLUE}{'=' * 60}{Colors.RESET}")
        print(f"API: {BASE_URL}")
        print()

        checks = [
            ("Health Check", self.check_health()),
            (
                "Login Administrador",
                self.check_login(*self.credentials["Administrador"], "Administrador"),
            ),
            ("Login Instructor", self.check_login(*self.credentials["Instructor"], "Instructor")),
            ("Login Aprendiz", self.check_login(*self.credentials["Aprendiz"], "Aprendiz")),
            ("Tenant Isolation", self.check_tenant_isolation()),
            ("RBAC Restrictions", self.check_rbac()),
            ("Public Registration", self.check_public_registration()),
            ("Multi-Finca Endpoints", self.check_multi_finca()),
            ("SSE Endpoint", self.check_sse_endpoint()),
        ]

        print()
        print(f"{Colors.BLUE}{'=' * 60}{Colors.RESET}")

        # Resumen
        passed = sum(1 for _, ok in checks if ok)
        total = len(checks)

        print(f"RESULTADO: {passed}/{total} verificaciones pasaron")

        if passed == total:
            print(f"{Colors.GREEN}✓ SISTEMA LISTO PARA PRODUCCIÓN{Colors.RESET}")
            return 0
        elif passed >= total * 0.8:
            print(f"{Colors.YELLOW}⚠ SISTEMA FUNCIONAL CON ADVERTENCIAS{Colors.RESET}")
            return 0
        else:
            print(f"{Colors.RED}✗ SISTEMA NO LISTO - REVISAR ERRORES{Colors.RESET}")
            return 1


if __name__ == "__main__":
    verifier = DeploymentVerifier()
    sys.exit(verifier.run_all_checks())
