"""
Tests para Push Notifications
==============================

Valida el modelo PushSubscription y endpoints de notificaciones.

Uso:
    cd BackFinca
    python -m pytest tests/test_push_notifications.py -v

Nota: Algunos tests pueden requerir claves VAPID configuradas.
"""

import unittest
import json
from flask import Flask
from app import create_app, db
from app.models import User, Finca, FarmType, Role, PushSubscription
from app.models.user import ApprovalStatus


class TestPushSubscriptionModel(unittest.TestCase):
    """Test suite para el modelo PushSubscription."""

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
            db.session.query(PushSubscription).delete()
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.commit()

            # Crear finca
            self.finca = Finca.create(
                name='Finca Test',
                type=FarmType.Tradicional,
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
                finca_id=self.finca.id,
                approval_status=ApprovalStatus.Approved,
            )

            db.session.commit()

    def test_create_subscription(self):
        """Crear una suscripción push."""
        with self.app.app_context():
            subscription = PushSubscription.create(
                user_id=self.user.id,
                endpoint='https://fcm.googleapis.com/fcm/send/test123',
                p256dh='BIPUL12u0tXZbPNSkF...',
                auth='aBCdEfGhIjKlMnOp...',
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
                platform='desktop',
                browser='chrome'
            )

            self.assertIsNotNone(subscription.id)
            self.assertEqual(subscription.user_id, self.user.id)
            self.assertTrue(subscription.is_active)
            self.assertEqual(subscription.platform, 'desktop')
            self.assertEqual(subscription.browser, 'chrome')

    def test_duplicate_endpoint_updates_existing(self):
        """Endpoint duplicado actualiza suscripción existente."""
        with self.app.app_context():
            endpoint = 'https://fcm.googleapis.com/fcm/send/duplicate'

            # Crear primera suscripción
            sub1 = PushSubscription.create(
                user_id=self.user.id,
                endpoint=endpoint,
                p256dh='KEY1',
                auth='AUTH1'
            )

            # Crear segunda con mismo endpoint
            sub2 = PushSubscription.create(
                user_id=self.user.id,
                endpoint=endpoint,
                p256dh='KEY2',
                auth='AUTH2'
            )

            # Debe ser la misma suscripción actualizada
            self.assertEqual(sub1.id, sub2.id)
            self.assertEqual(sub2.p256dh, 'KEY2')
            self.assertEqual(sub2.auth, 'AUTH2')

    def test_get_user_subscriptions(self):
        """Obtener suscripciones de un usuario."""
        with self.app.app_context():
            # Crear múltiples suscripciones
            PushSubscription.create(
                user_id=self.user.id,
                endpoint='https://fcm.googleapis.com/fcm/send/sub1',
                p256dh='KEY1',
                auth='AUTH1'
            )
            PushSubscription.create(
                user_id=self.user.id,
                endpoint='https://fcm.googleapis.com/fcm/send/sub2',
                p256dh='KEY2',
                auth='AUTH2'
            )

            subs = PushSubscription.get_user_subscriptions(self.user.id)
            self.assertEqual(len(subs), 2)

    def test_deactivate_by_endpoint(self):
        """Desactivar suscripción por endpoint."""
        with self.app.app_context():
            endpoint = 'https://fcm.googleapis.com/fcm/send/to-deactivate'

            PushSubscription.create(
                user_id=self.user.id,
                endpoint=endpoint,
                p256dh='KEY',
                auth='AUTH'
            )

            success = PushSubscription.deactivate_by_endpoint(endpoint)
            self.assertTrue(success)

            # Verificar que está inactiva
            sub = PushSubscription.query.filter_by(endpoint=endpoint).first()
            self.assertFalse(sub.is_active)

    def test_deactivate_by_user(self):
        """Desactivar todas las suscripciones de un usuario."""
        with self.app.app_context():
            # Crear suscripciones
            for i in range(3):
                PushSubscription.create(
                    user_id=self.user.id,
                    endpoint=f'https://fcm.googleapis.com/fcm/send/{i}',
                    p256dh=f'KEY{i}',
                    auth=f'AUTH{i}'
                )

            count = PushSubscription.deactivate_by_user(self.user.id)
            self.assertEqual(count, 3)

            # Verificar que ninguna está activa
            active = PushSubscription.get_user_subscriptions(self.user.id, active_only=True)
            self.assertEqual(len(active), 0)

    def test_detect_platform_browser(self):
        """Detectar plataforma y navegador desde user agent."""
        test_cases = [
            (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'desktop',
                'chrome'
            ),
            (
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1',
                'mobile',
                'safari'
            ),
            (
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
                'desktop',
                'firefox'
            ),
        ]

        for user_agent, expected_platform, expected_browser in test_cases:
            platform, browser = PushSubscription._detect_platform_browser(user_agent)
            self.assertEqual(platform, expected_platform)
            self.assertEqual(browser, expected_browser)


class TestPushNotificationEndpoints(unittest.TestCase):
    """Test suite para endpoints de notificaciones push."""

    @classmethod
    def setUpClass(cls):
        """Configurar aplicación de prueba."""
        cls.app = create_app('testing')
        cls.app.config['TESTING'] = True
        cls.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        cls.client = cls.app.test_client()

        with cls.app.app_context():
            db.create_all()

    def setUp(self):
        """Preparar datos para cada test."""
        with self.app.app_context():
            db.session.query(PushSubscription).delete()
            db.session.query(User).delete()
            db.session.query(Finca).delete()
            db.session.commit()

            # Crear finca
            self.finca = Finca.create(
                name='Finca Test',
                type=FarmType.Tradicional,
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
                finca_id=self.finca.id,
                approval_status=ApprovalStatus.Approved,
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

    def test_get_vapid_public_key(self):
        """GET /vapid-public-key - Obtener clave pública."""
        response = self.client.get('/api/v1/push/vapid-public-key')

        # Si no hay claves configuradas, debe retornar error
        if response.status_code == 503:
            data = json.loads(response.data)
            self.assertIn('VAPID_NOT_CONFIGURED', data.get('error', {}).get('code', ''))
        else:
            self.assertEqual(response.status_code, 200)
            data = json.loads(response.data)
            self.assertTrue(data['success'])
            self.assertIn('public_key', data['data'])

    def test_subscribe_unauthorized(self):
        """POST /subscribe sin token debe retornar 401."""
        response = self.client.post(
            '/api/v1/push/subscribe',
            data=json.dumps({
                'subscription': {
                    'endpoint': 'https://test.com',
                    'keys': {'p256dh': 'test', 'auth': 'test'}
                }
            }),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 401)

    def test_subscribe_with_valid_data(self):
        """POST /subscribe con datos válidos."""
        token = self.login_user('test@example.com', 'TestPass123!')

        response = self.client.post(
            '/api/v1/push/subscribe',
            data=json.dumps({
                'subscription': {
                    'endpoint': 'https://fcm.googleapis.com/fcm/send/test123',
                    'keys': {
                        'p256dh': 'BIPUL12u0tXZbPNSkF...',
                        'auth': 'aBCdEfGhIjKlMnOp...'
                    }
                }
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('subscription_id', data['data'])

    def test_subscribe_with_invalid_data(self):
        """POST /subscribe con datos inválidos debe retornar 400."""
        token = self.login_user('test@example.com', 'TestPass123!')

        response = self.client.post(
            '/api/v1/push/subscribe',
            data=json.dumps({
                'subscription': {
                    'keys': {
                        'p256dh': 'BIPUL...',
                        'auth': 'aBCd...'
                    }
                }
            }),
            headers={'Authorization': f'Bearer {token}'},
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 422)

    def test_get_subscriptions(self):
        """GET /subscriptions - Listar suscripciones del usuario."""
        token = self.login_user('test@example.com', 'TestPass123!')

        # Crear una suscripción primero
        with self.app.app_context():
            PushSubscription.create(
                user_id=self.user.id,
                endpoint='https://fcm.googleapis.com/fcm/send/sub1',
                p256dh='KEY1',
                auth='AUTH1'
            )

        response = self.client.get(
            '/api/v1/push/subscriptions',
            headers={'Authorization': f'Bearer {token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['active_count'], 1)

    def test_unsubscribe(self):
        """POST /unsubscribe - Desuscribirse."""
        token = self.login_user('test@example.com', 'TestPass123!')

        # Crear suscripción
        with self.app.app_context():
            PushSubscription.create(
                user_id=self.user.id,
                endpoint='https://fcm.googleapis.com/fcm/send/to-unsub',
                p256dh='KEY',
                auth='AUTH'
            )

        response = self.client.post(
            '/api/v1/push/unsubscribe',
            headers={'Authorization': f'Bearer {token}'},
            data=json.dumps({}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 200)

    def test_test_notification_no_subscriptions(self):
        """POST /test sin suscripciones debe retornar error."""
        token = self.login_user('test@example.com', 'TestPass123!')

        response = self.client.post(
            '/api/v1/push/test',
            headers={'Authorization': f'Bearer {token}'},
            data=json.dumps({}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('NO_SUBSCRIPTIONS', data.get('error', {}).get('code', ''))


if __name__ == '__main__':
    unittest.main(verbosity=2)
