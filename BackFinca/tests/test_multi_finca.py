"""
Tests para Multi-Finca (Selector de Finca)
============================================

Valida el modelo UserFinca y los endpoints de multi-finca.

Uso:
    cd BackFinca
    python -m pytest tests/test_multi_finca.py -v
"""

import unittest
import json
from app import create_app, db
from app.models.user import ApprovalStatus
from app.models import User, Finca, FarmType, Role, UserFinca


class TestUserFincaModel(unittest.TestCase):
    """Test suite para el modelo UserFinca."""

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
            db.session.query(UserFinca).delete()
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.commit()

            # Crear fincas
            self.finca_a = Finca.create(
                name='Finca A',
                type=FarmType.Tradicional,
                is_active=True
            )
            self.finca_b = Finca.create(
                name='Finca B',
                type=FarmType.Educativa,
                is_active=True
            )

            # Crear usuario
            self.user = User.create(
                identification=123456789,
                fullname='Test User',
                email='test@example.com',
                phone='3001234567',
                password='TestPass123!',
                role=Role.Propietario,
                status=True,
                finca_id=self.finca_a.id
            ,
                approval_status=ApprovalStatus.Approved,
            )

            db.session.commit()

    def test_assign_user_to_finca(self):
        """Asignar usuario a una finca."""
        with self.app.app_context():
            membership = UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
            )

            self.assertIsNotNone(membership)
            self.assertEqual(membership.user_id, self.user.id)
            self.assertEqual(membership.finca_id, self.finca_b.id)
            self.assertEqual(membership.role, 'Instructor')
            self.assertTrue(membership.is_active)

    def test_get_user_fincas(self):
        """Obtener fincas de un usuario."""
        with self.app.app_context():
            # Asignar a segunda finca
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
            )

            fincas = UserFinca.get_user_fincas(self.user.id)

            self.assertEqual(len(fincas), 2)
            finca_ids = [f['finca_id'] for f in fincas]
            self.assertIn(self.finca_a.id, finca_ids)
            self.assertIn(self.finca_b.id, finca_ids)

    def test_set_active_finca(self):
        """Cambiar finca activa del usuario."""
        with self.app.app_context():
            # Asignar a segunda finca
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
            )

            # Cambiar a finca B
            success = UserFinca.set_active_finca(self.user.id, self.finca_b.id)

            self.assertTrue(success)

            # Verificar que B es ahora primary
            active = UserFinca.get_active_finca(self.user.id)
            self.assertIsNotNone(active)
            self.assertEqual(active['finca_id'], self.finca_b.id)

    def test_has_access(self):
        """Verificar si usuario tiene acceso a finca."""
        with self.app.app_context():
            # Asignar a segunda finca
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
            )

            # Verificar acceso
            has_a = UserFinca.has_access(self.user.id, self.finca_a.id)
            has_b = UserFinca.has_access(self.user.id, self.finca_b.id)

            self.assertTrue(has_a)
            self.assertTrue(has_b)

    def test_no_access_to_unassigned_finca(self):
        """Usuario no tiene acceso a finca no asignada."""
        with self.app.app_context():
            # Crear tercera finca sin asignar
            finca_c = Finca.create(
                name='Finca C',
                type=FarmType.Tradicional,
                is_active=True
            )
            db.session.commit()

            has_access = UserFinca.has_access(self.user.id, finca_c.id)
            self.assertFalse(has_access)

    def test_get_role_in_finca(self):
        """Obtener rol específico en una finca."""
        with self.app.app_context():
            # Asignar a segunda finca con rol diferente
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
            )

            role_a = UserFinca.get_role_in_finca(self.user.id, self.finca_a.id)
            role_b = UserFinca.get_role_in_finca(self.user.id, self.finca_b.id)

            self.assertEqual(role_a, 'Propietario')
            self.assertEqual(role_b, 'Instructor')

    def test_is_multi_finca(self):
        """Detectar si usuario es multi-finca."""
        with self.app.app_context():
            # Inicialmente solo tiene una finca
            is_multi = UserFinca.is_multi_finca(self.user.id)
            self.assertFalse(is_multi)

            # Asignar a segunda finca
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
            )

            is_multi = UserFinca.is_multi_finca(self.user.id)
            self.assertTrue(is_multi)


class TestMultiFincaEndpoints(unittest.TestCase):
    """Test suite para endpoints de multi-finca."""

    @classmethod
    def setUpClass(cls):
        """Configurar aplicación de prueba."""
        cls.app = create_app('testing')
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

        with cls.app.app_context():
            db.create_all()

    def setUp(self):
        """Preparar datos para cada test."""
        self.client = self.app.test_client()
        with self.app.app_context():
            db.session.query(UserFinca).delete()
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.commit()

            # Crear fincas
            self.finca_a = Finca.create(
                name='Finca A',
                type=FarmType.Tradicional,
                is_active=True
            )
            self.finca_b = Finca.create(
                name='Finca B',
                type=FarmType.Educativa,
                is_active=True
            )

            # Crear usuario
            self.user = User.create(
                identification=123456789,
                fullname='Test User',
                email='test@example.com',
                phone='3001234567',
                password='TestPass123!',
                role=Role.Propietario,
                status=True,
                finca_id=self.finca_a.id
            ,
                approval_status=ApprovalStatus.Approved,
            )

            # Asignar a ambas fincas
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_a.id,
                role='Propietario',
                is_primary=True
            )
            UserFinca.assign(
                user_id=self.user.id,
                finca_id=self.finca_b.id,
                role='Instructor'
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

    def test_get_my_fincas_unauthorized(self):
        """GET /my-fincas sin token debe retornar 401."""
        response = self.client.get('/api/v1/multi-finca/my-fincas')
        self.assertEqual(response.status_code, 401)

    def test_check_access(self):
        """GET /check-access/{finca_id}."""
        with self.app.app_context():
            token = self.login_user('test@example.com', 'TestPass123!')

            # Verificar acceso a finca A
            response = self.client.get(
                f'/api/v1/multi-finca/check-access/{self.finca_a.id}',
                headers={'Authorization': f'Bearer {token}'}
            )

            self.assertEqual(response.status_code, 200)
            result = json.loads(response.data)
            self.assertTrue(result['data']['has_access'])
            self.assertTrue(result['data']['is_active_finca'])

    def test_export_multi_finca_general_pdf(self):
        """GET /api/v1/exports/multi-finca-general.pdf"""
        with self.app.app_context():
            token = self.login_user('test@example.com', 'TestPass123!')
            response = self.client.get(
                '/api/v1/exports/multi-finca-general.pdf',
                headers={'Authorization': f'Bearer {token}'}
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn('application/pdf', response.content_type)

    def test_export_finca_detail_pdf(self):
        """GET /api/v1/exports/finca/{finca_id}/report.pdf"""
        with self.app.app_context():
            token = self.login_user('test@example.com', 'TestPass123!')
            response = self.client.get(
                f'/api/v1/exports/finca/{self.finca_a.id}/report.pdf',
                headers={'Authorization': f'Bearer {token}'}
            )
            self.assertEqual(response.status_code, 200)
            self.assertIn('application/pdf', response.content_type)

    def test_export_finca_detail_pdf_forbidden(self):
        """GET /api/v1/exports/finca/{finca_id}/report.pdf para finca no asignada debe retornar 404/403."""
        with self.app.app_context():
            finca_c = Finca.create(
                name='Finca C',
                type=FarmType.Tradicional,
                is_active=True
            )
            db.session.commit()

            token = self.login_user('test@example.com', 'TestPass123!')
            response = self.client.get(
                f'/api/v1/exports/finca/{finca_c.id}/report.pdf',
                headers={'Authorization': f'Bearer {token}'}
            )
            # Retorna 404 si la finca o el acceso no existe en export_finca_detail_pdf
            self.assertEqual(response.status_code, 404)


if __name__ == '__main__':
    unittest.main(verbosity=2)
