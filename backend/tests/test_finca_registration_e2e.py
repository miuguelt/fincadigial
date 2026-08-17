"""
Tests E2E para Registro de Finca
================================
Valida el flujo completo de registro de una nueva finca.

Uso:
    cd backend
    python -m pytest tests/test_finca_registration_e2e.py -v
"""

import unittest
import json
from app import create_app, db
from app.models import Finca, FarmType, User, Role


class TestFincaRegistrationE2E(unittest.TestCase):
    """Test suite para flujo E2E de registro de finca."""

    @classmethod
    def setUpClass(cls):
        """Configurar aplicación de prueba."""
        cls.app = create_app("testing")
        cls.app.config["TESTING"] = True
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

    @classmethod
    def tearDownClass(cls):
        """Limpiar después de tests."""
        with cls.app.app_context():
            db.session.remove()
            db.drop_all()

    def setUp(self):
        """Limpiar datos antes de cada test."""
        with self.app.app_context():
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.commit()

    def tearDown(self):
        """Limpiar sesión y datos después de cada test."""
        with self.app.app_context():
            db.session.rollback()
            db.session.expunge_all()
            db.session.remove()

    def test_registro_finca_tradicional_completo(self):
        """Flujo completo de registro de finca tradicional."""
        # Datos de registro
        payload = {
            "finca": {
                "name": "Finca El Progreso",
                "type": "Tradicional",
                "nit": "123456789-0",
                "department": "Antioquia",
                "municipality": "Medellín",
                "address": "Vereda El Carmen",
            },
            "owner": {
                "identification": 123456789,
                "fullname": "Juan Pérez García",
                "email": "juan.perez@finca.com",
                "phone": "3001234567",
                "password": "SecurePass123!",
                "address": "Calle 123 # 45-67",
            },
        }

        # Ejecutar registro
        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        # Verificar respuesta exitosa
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("message"), "Finca registrada exitosamente")

        # Verificar datos de finca
        finca_data = data["data"]["finca"]
        self.assertEqual(finca_data["name"], "Finca El Progreso")
        self.assertEqual(finca_data["type"], "Tradicional")
        self.assertEqual(finca_data["nit"], "123456789-0")

        # Verificar datos de usuario
        user_data = data["data"]["user"]
        self.assertEqual(user_data["fullname"], "Juan Pérez García")
        self.assertEqual(user_data["email"], "juan.perez@finca.com")
        self.assertEqual(user_data["role"], "Propietario")  # Rol automático

        # Verificar tokens
        self.assertIn("access_token", data["data"])
        self.assertIn("refresh_token", data["data"])
        self.assertEqual(data["data"]["token_type"], "Bearer")

        # Verificar en base de datos
        with self.app.app_context():
            finca = Finca.query.filter_by(name="Finca El Progreso").first()
            self.assertIsNotNone(finca)
            self.assertEqual(finca.type, FarmType.Tradicional)

            user = User.query.filter_by(email="juan.perez@finca.com").first()
            self.assertIsNotNone(user)
            self.assertEqual(user.role, Role.Propietario)
            self.assertEqual(user.finca_id, finca.id)

    def test_registro_finca_educativa_completo(self):
        """Flujo completo de registro de finca educativa."""
        payload = {
            "finca": {
                "name": "Centro Educativo SENA",
                "type": "Educativa",
                "department": "Cundinamarca",
                "municipality": "Bogotá",
            },
            "owner": {
                "identification": 987654321,
                "fullname": "María Rodríguez",
                "email": "maria@sena.edu.co",
                "phone": "3109876543",
                "password": "EduPass123!",
            },
        }

        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

        data = json.loads(response.data)
        user_data = data["data"]["user"]

        # Finca educativa asigna rol Administrador
        self.assertEqual(user_data["role"], "Administrador")

        # Verificar en base de datos
        with self.app.app_context():
            user = User.query.filter_by(email="maria@sena.edu.co").first()
            self.assertEqual(user.role, Role.Administrador)

    # =========================================================================
    # TESTS: VALIDACIONES DE REGISTRO
    # =========================================================================

    def test_registro_falta_finca(self):
        """Error si falta información de finca."""
        payload = {
            "owner": {
                "identification": 123456789,
                "fullname": "Juan Pérez",
                "email": "juan@test.com",
                "phone": "3001234567",
                "password": "Pass123!",
            }
            # Falta 'finca'
        }

        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)

        data = json.loads(response.data)
        self.assertFalse(data.get("success"))

    def test_registro_falta_owner(self):
        """Error si falta información del propietario."""
        payload = {
            "finca": {"name": "Finca Test", "type": "Tradicional"}
            # Falta 'owner'
        }

        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)

    def test_registro_tipo_finca_invalido(self):
        """Error si el tipo de finca no es válido."""
        payload = {
            "finca": {
                "name": "Finca Invalida",
                "type": "Industrial",  # Tipo inválido
            },
            "owner": {
                "identification": 123456789,
                "fullname": "Juan Pérez",
                "email": "juan@test.com",
                "phone": "3001234567",
                "password": "Pass123!",
            },
        }

        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 422)

    def test_registro_email_duplicado(self):
        """Error si el email ya existe."""
        # Crear primer registro
        payload1 = {
            "finca": {"name": "Finca Primera", "type": "Tradicional"},
            "owner": {
                "identification": 111111111,
                "fullname": "Usuario Primero",
                "email": "duplicado@test.com",
                "phone": "3001111111",
                "password": "Pass123!",
            },
        }

        self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload1),
            content_type="application/json",
        )

        # Intentar segundo registro con mismo email
        payload2 = {
            "finca": {"name": "Finca Segunda", "type": "Educativa"},
            "owner": {
                "identification": 222222222,
                "fullname": "Usuario Segundo",
                "email": "duplicado@test.com",  # Mismo email
                "phone": "3002222222",
                "password": "Pass123!",
            },
        }

        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload2),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)  # Conflict

        data = json.loads(response.data)
        self.assertFalse(data.get("success"))
        self.assertIn("email", data.get("message", "").lower())

    def test_registro_identificacion_duplicada(self):
        """Error si la identificación ya existe."""
        # Crear primer registro
        payload1 = {
            "finca": {"name": "Finca Primera", "type": "Tradicional"},
            "owner": {
                "identification": 123456789,
                "fullname": "Usuario Primero",
                "email": "primero@test.com",
                "phone": "3001111111",
                "password": "Pass123!",
            },
        }

        self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload1),
            content_type="application/json",
        )

        # Intentar segundo registro con misma identificación
        payload2 = {
            "finca": {"name": "Finca Segunda", "type": "Educativa"},
            "owner": {
                "identification": 123456789,  # Misma identificación
                "fullname": "Usuario Segundo",
                "email": "segundo@test.com",
                "phone": "3002222222",
                "password": "Pass123!",
            },
        }

        response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload2),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 409)  # Conflict

    # =========================================================================
    # TESTS: INFO PÚBLICA
    # =========================================================================

    def test_info_publica_sistema(self):
        """Endpoint público de información del sistema."""
        response = self.client.get("/api/v1/public/")

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data.get("success"))

        info = data.get("data", {})
        self.assertIn("name", info)
        self.assertIn("version", info)
        self.assertIn("finca_types", info)

        # Verificar tipos de finca
        finca_types = info["finca_types"]
        self.assertEqual(len(finca_types), 2)

        tipos = {ft["value"] for ft in finca_types}
        self.assertIn("Educativa", tipos)
        self.assertIn("Tradicional", tipos)

    # =========================================================================
    # TESTS: LOGIN DESPUÉS DE REGISTRO
    # =========================================================================

    def test_login_despues_de_registro(self):
        """Usuario puede hacer login inmediatamente después de registrar."""
        # 1. Registrar finca
        payload = {
            "finca": {"name": "Finca Login Test", "type": "Tradicional"},
            "owner": {
                "identification": 555555555,
                "fullname": "Usuario Login",
                "email": "login@test.com",
                "phone": "3005555555",
                "password": "MyPass123!",
            },
        }

        reg_response = self.client.post(
            "/api/v1/public/register",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(reg_response.status_code, 201)

        # 2. Hacer login con credenciales registradas
        login_payload = {"identifier": "login@test.com", "password": "MyPass123!"}

        login_response = self.client.post(
            "/api/v1/auth/login",
            data=json.dumps(login_payload),
            content_type="application/json",
        )

        self.assertEqual(login_response.status_code, 200)

        login_data = json.loads(login_response.data)
        self.assertTrue(login_data.get("success"))

        # Verificar claims JWT incluyen finca
        login_data_inner = login_data["data"]
        self.assertIn("user", login_data_inner)
        user_info = login_data_inner["user"]
        self.assertIn("finca_id", user_info)
        self.assertIn("finca_type", user_info)
        self.assertEqual(user_info["finca_type"], "Tradicional")


if __name__ == "__main__":
    unittest.main(verbosity=2)
