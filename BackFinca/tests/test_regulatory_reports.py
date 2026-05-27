"""
Tests para Reportes Regulatorios (ICA/SENA)
============================================

Valida los endpoints de reportes regulatorios.

Uso:
    cd BackFinca
    python -m pytest tests/test_regulatory_reports.py -v
"""

import unittest
import json
from app import create_app, db
from app.models import User, Finca, FarmType, Role, Animal, Species, Breed
from app.models.user import ApprovalStatus
from datetime import date


class TestRegulatoryReports(unittest.TestCase):
    """Test suite para reportes regulatorios."""

    @classmethod
    def setUpClass(cls):
        """Configurar aplicación de prueba."""
        cls.app = create_app('testing')
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
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
        """Preparar datos para cada test."""
        with self.app.app_context():
            db.session.query(Animal).delete()
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.query(Breed).delete()
            db.session.query(Species).delete()
            db.session.commit()

            # Crear finca tradicional
            self.finca_tradicional = Finca.create(
                name='Finca El Progreso',
                type=FarmType.Tradicional,
                is_active=True
            )

            # Crear finca educativa
            self.finca_educativa = Finca.create(
                name='Centro Educativo',
                type=FarmType.Educativa,
                is_active=True
            )

            # Crear usuario propietario en finca tradicional
            self.user_propietario = User.create(
                identification=111111111,
                fullname='Propietario Test',
                email='propietario@test.com',
                phone='3001111111',
                password='TestPass123!',
                role=Role.Propietario,
                status=True,
                finca_id=self.finca_tradicional.id,
                approval_status=ApprovalStatus.Approved,
            )

            # Crear usuario en finca educativa
            self.user_instructor = User.create(
                identification=222222222,
                fullname='Instructor Test',
                email='instructor@test.com',
                phone='3002222222',
                password='TestPass123!',
                role=Role.Instructor,
                status=True,
                finca_id=self.finca_educativa.id,
                approval_status=ApprovalStatus.Approved,
            )

            # Crear especie y raza
            self.species = Species.create(name='Bovino')
            self.breed = Breed.create(name='Criollo', species_id=self.species.id)
            db.session.commit()

            # Crear animales en finca tradicional
            for i in range(5):
                Animal.create(
                    sex='Macho' if i % 2 == 0 else 'Hembra',
                    birth_date=date(2023, 1, 15),
                    weight=350 + i * 10,
                    record=f'ARETE-{i:03d}',
                    finca_id=self.finca_tradicional.id,
                    breeds_id=self.breed.id,
                    status='Vivo'
                )

            db.session.commit()

    def login_user(self, email, password):
        """Helper para hacer login y obtener token."""
        response = self.client.post(
            '/api/v1/auth/login',
            data=json.dumps({'identifier': email, 'password': password}),
            content_type='application/json'
        )
        data = json.loads(response.data)
        return data['data']['access_token']

    # =========================================================================
    # TESTS: ACCESO RESTRINGIDO A FINCAS TRADICIONALES
    # =========================================================================

    def test_inventory_report_tradicional_finca(self):
        """Reporte de inventario para finca tradicional."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/inventory',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['report_type'], 'inventory')
        self.assertEqual(data['data']['total_animals'], 5)

    def test_inventory_report_finca_educativa_allowed(self):
        """Reporte permitido para finca educativa."""
        token = self.login_user('instructor@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/inventory',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['report_type'], 'inventory')

    # =========================================================================
    # TESTS: FORMATOS DE REPORTE
    # =========================================================================

    def test_inventory_report_json_format(self):
        """Reporte de inventario en formato JSON."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/inventory?format=json',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('animals', data['data'])
        self.assertIn('summary', data['data'])

    def test_inventory_report_csv_format(self):
        """Reporte de inventario en formato CSV."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/inventory?format=csv',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)
        # Verificar que es CSV (puede incluir charset)
        self.assertIn('text/csv', response.content_type)
        # Verificar que tiene el header correcto
        self.assertIn('Content-Disposition', response.headers)
        self.assertIn('.csv', response.headers['Content-Disposition'])

    # =========================================================================
    # TESTS: TIPOS DE MOVIMIENTOS
    # =========================================================================

    def test_movements_report_all(self):
        """Reporte de movimientos (todos)."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/movements?type=all',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['report_type'], 'movements')

    def test_movements_report_births(self):
        """Reporte de movimientos (nacimientos)."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/movements?type=births',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        # Verificar que todos son nacimientos
        for movement in data['data']['movements']:
            self.assertEqual(movement['tipo_movimiento'], 'NACIMIENTO')

    # =========================================================================
    # TESTS: TIPOS DE SALUD
    # =========================================================================

    def test_health_report_vaccinations(self):
        """Reporte de salud (vacunaciones)."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/health?type=vaccinations',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['report_type'], 'health')

    # =========================================================================
    # TESTS: INFORMACIÓN DE FORMATOS
    # =========================================================================

    def test_report_formats_endpoint(self):
        """Endpoint de información de formatos."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/formats',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('reports', data['data'])
        self.assertIn('inventory', data['data']['reports'])
        self.assertIn('movements', data['data']['reports'])
        self.assertIn('health', data['data']['reports'])
        self.assertIn('examples', data['data'])

    # =========================================================================
    # TESTS: FILTROS DE FECHA
    # =========================================================================

    def test_inventory_report_with_date_filter(self):
        """Reporte de inventario con filtro de fecha."""
        token = self.login_user('propietario@test.com', 'TestPass123!')

        response = self.client.get(
            '/api/v1/regulatory-reports/inventory?date_from=2024-01-01&date_to=2024-12-31',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)

        data = json.loads(response.data)
        self.assertTrue(data['success'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
