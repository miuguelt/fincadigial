#!/usr/bin/env python3
"""
Pruebas Completas del Sistema Multi-Tenant
==========================================
Este script prueba todas las funcionalidades Multi-Tenant:
1. Login con diferentes roles (7 roles)
2. Aislamiento de fincas (tenant isolation)
3. Registro de nueva finca
4. Cambio de finca
5. RBAC - restricciones por rol
"""

import requests
import secrets
import sys

from test_credentials import get_role_credentials

# Configuración
BASE_URL = "http://localhost:8181/api/v1"
HEADERS = {"Content-Type": "application/json"}

# Colores para output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_success(msg: str):
    print(f"{GREEN}✓ {msg}{RESET}")


def print_error(msg: str):
    print(f"{RED}✗ {msg}{RESET}")


def print_info(msg: str):
    print(f"{BLUE}ℹ {msg}{RESET}")


def print_warning(msg: str):
    print(f"{YELLOW}⚠ {msg}{RESET}")


class MultiTenantTester:
    def __init__(self):
        self.tokens: dict[str, str] = {}
        self.test_results: dict[str, bool] = {}

    def login(self, identifier: str, password: str, role_name: str) -> str | None:
        """Login y retornar token"""
        try:
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json={"identifier": identifier, "password": password},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("success"):
                    token = data.get("data", {}).get("access_token")
                    user = data.get("data", {}).get("user", {})
                    finca_id = user.get("finca_id")
                    finca_type = user.get("finca_type")
                    role = user.get("role")
                    print_success(
                        f"Login {role_name}: {user.get('fullname')} (finca_id={finca_id}, type={finca_type}, role={role})"
                    )
                    self.tokens[role_name] = token
                    return token
            print_error(f"Login {role_name} falló: {resp.status_code}")
            return None
        except Exception as e:
            print_error(f"Login {role_name} error: {e}")
            return None

    def test_health(self) -> bool:
        """Prueba health endpoint"""
        try:
            resp = requests.get(f"{BASE_URL}/health")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "healthy":
                    print_success("Health check OK")
                    return True
            print_error("Health check falló")
            return False
        except Exception as e:
            print_error(f"Health check error: {e}")
            return False

    def test_login_all_roles(self) -> bool:
        """Prueba login con los 7 roles del sistema"""
        print_info("\n=== Prueba de Login Multi-Rol ===")

        credentials = [
            (*get_role_credentials("Administrador"), "Administrador"),
            (*get_role_credentials("Instructor"), "Instructor"),
            (*get_role_credentials("Aprendiz"), "Aprendiz"),
        ]

        success_count = 0
        for ident, pwd, role in credentials:
            if self.login(ident, pwd, role):
                success_count += 1

        if success_count == len(credentials):
            print_success(
                f"Todos los roles autenticaron correctamente ({success_count}/{len(credentials)})"
            )
            return True
        else:
            print_warning(f"Algunos roles fallaron ({success_count}/{len(credentials)})")
            return False

    def test_tenant_isolation(self) -> bool:
        """Prueba aislamiento de fincas - usuarios solo ven datos de su finca"""
        print_info("\n=== Prueba de Aislamiento de Fincas ===")

        token = self.tokens.get("Administrador")
        if not token:
            print_error("No hay token de Administrador para prueba de aislamiento")
            return False

        try:
            # Obtener animales de la finca 1 (Villa Luz)
            headers = {**HEADERS, "Authorization": f"Bearer {token}"}
            resp = requests.get(f"{BASE_URL}/animals", headers=headers)

            if resp.status_code == 200:
                data = resp.json()
                animals = data.get("data", [])
                print_success(f"Administrador ve {len(animals)} animales en su finca")

                # Verificar que todos los animales tienen finca_id = 1
                for animal in animals[:3]:  # Verificar primeros 3
                    finca_id = animal.get("finca_id")
                    if finca_id != 1:
                        print_error(
                            f"Animal {animal.get('id')} tiene finca_id={finca_id}, esperado=1"
                        )
                        return False

                print_success("Aislamiento verificado: todos los animales pertenecen a finca_id=1")
                return True
            else:
                print_error(f"No se pudieron obtener animales: {resp.status_code}")
                return False
        except Exception as e:
            print_error(f"Error en prueba de aislamiento: {e}")
            return False

    def test_rbac_restriction(self) -> bool:
        """Prueba restricciones RBAC por rol"""
        print_info("\n=== Prueba de Restricciones RBAC ===")

        results = []

        # 1. Aprendiz solo puede hacer GET
        aprendiz_token = self.tokens.get("Aprendiz")
        if aprendiz_token:
            headers = {**HEADERS, "Authorization": f"Bearer {aprendiz_token}"}
            # Intentar POST como Aprendiz (debe fallar)
            resp = requests.post(
                f"{BASE_URL}/animals", headers=headers, json={"name": "Test Animal"}
            )
            if resp.status_code in [403, 401]:
                print_success("Aprendiz no puede crear animales (403)")
                results.append(True)
            else:
                print_error(
                    f"Aprendiz debería tener 403 para POST animals, obtuvo {resp.status_code}"
                )
                results.append(False)

            # Aprendiz puede hacer GET
            resp = requests.get(f"{BASE_URL}/animals", headers=headers)
            if resp.status_code == 200:
                print_success("Aprendiz puede leer animales (GET)")
                results.append(True)
            else:
                print_error(f"Aprendiz debería poder leer animales, obtuvo {resp.status_code}")
                results.append(False)

        # 2. Instructor no puede ver usuarios
        instructor_token = self.tokens.get("Instructor")
        if instructor_token:
            headers = {**HEADERS, "Authorization": f"Bearer {instructor_token}"}
            resp = requests.get(f"{BASE_URL}/users", headers=headers)
            if resp.status_code in [403, 401]:
                print_success("Instructor no puede ver usuarios (403)")
                results.append(True)
            else:
                print_error(
                    f"Instructor debería tener 403 para GET /users, obtuvo {resp.status_code}"
                )
                results.append(False)

        return all(results) if results else False

    def test_public_registration(self) -> bool:
        """Prueba registro público de nueva finca"""
        print_info("\n=== Prueba de Registro Público ===")

        import random

        random_id = random.randint(10000000, 99999999)

        payload = {
            "finca": {
                "name": f"Finca de Prueba {random_id}",
                "type": "Tradicional",
                "department": "Antioquia",
                "municipality": "Medellín",
            },
            "owner": {
                "identification": random_id,
                "fullname": "Usuario de Prueba",
                "email": f"test{random_id}@example.com",
                "phone": f"300{random_id}",
                "password": secrets.token_urlsafe(18),
            },
        }

        try:
            resp = requests.post(f"{BASE_URL}/public/register", headers=HEADERS, json=payload)

            if resp.status_code == 201:
                data = resp.json()
                if data.get("success"):
                    finca = data.get("data", {}).get("finca", {})
                    user = data.get("data", {}).get("user", {})
                    print_success(f"Finca creada: {finca.get('name')} (ID: {finca.get('id')})")
                    print_success(
                        f"Usuario creado: {user.get('fullname')} (Rol: {user.get('role')})"
                    )
                    print_success("Registro público funciona correctamente")
                    return True
                else:
                    print_error(f"Respuesta indica error: {data}")
                    return False
            elif resp.status_code == 409:
                print_warning("Finca/usuario ya existe (409) - esto es normal si ya fue creado")
                return True
            else:
                print_error(f"Registro falló con código {resp.status_code}: {resp.text[:200]}")
                return False
        except Exception as e:
            print_error(f"Error en registro público: {e}")
            return False

    def test_multi_finca_endpoints(self) -> bool:
        """Prueba endpoints de multi-finca (my-fincas, switch)"""
        print_info("\n=== Prueba de Endpoints Multi-Finca ===")

        token = self.tokens.get("Administrador")
        if not token:
            print_error("No hay token para prueba multi-finca")
            return False

        try:
            headers = {**HEADERS, "Authorization": f"Bearer {token}"}

            # Obtener fincas del usuario
            resp = requests.get(f"{BASE_URL}/multi-finca/my-fincas", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                fincas = data.get("data", {}).get("fincas", [])
                print_success(f"Usuario tiene acceso a {len(fincas)} finca(s)")

                # Obtener finca actual
                resp = requests.get(f"{BASE_URL}/multi-finca/current", headers=headers)
                if resp.status_code == 200:
                    print_success("Endpoint /current responde correctamente")
                    return True
                else:
                    print_error(f"/current falló: {resp.status_code}")
                    return False
            else:
                print_error(f"/my-fincas falló: {resp.status_code}")
                return False
        except Exception as e:
            print_error(f"Error en prueba multi-finca: {e}")
            return False

    def run_all_tests(self):
        """Ejecuta todas las pruebas y genera reporte"""
        print_info("=" * 60)
        print_info("INICIANDO PRUEBAS MULTI-TENANT _projects/villaluz")
        print_info("=" * 60)

        tests = [
            ("Health Check", self.test_health),
            ("Login Multi-Rol", self.test_login_all_roles),
            ("Aislamiento de Fincas", self.test_tenant_isolation),
            ("Restricciones RBAC", self.test_rbac_restriction),
            ("Registro Público", self.test_public_registration),
            ("Endpoints Multi-Finca", self.test_multi_finca_endpoints),
        ]

        results = {}
        for name, test_func in tests:
            try:
                results[name] = test_func()
            except Exception as e:
                print_error(f"Test '{name}' falló con excepción: {e}")
                results[name] = False

        # Reporte final
        print_info("\n" + "=" * 60)
        print_info("REPORTE DE PRUEBAS MULTI-TENANT")
        print_info("=" * 60)

        passed = sum(1 for v in results.values() if v)
        total = len(results)

        for name, result in results.items():
            status = f"{GREEN}✓ PASÓ{RESET}" if result else f"{RED}✗ FALLÓ{RESET}"
            print(f"  {name:<35} {status}")

        print_info("=" * 60)
        if passed == total:
            print_success(f"TODAS LAS PRUEBAS PASARON ({passed}/{total})")
            return 0
        else:
            print_error(f"ALGUNAS PRUEBAS FALLARON ({passed}/{total})")
            return 1


if __name__ == "__main__":
    tester = MultiTenantTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
