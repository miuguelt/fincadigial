"""
Namespace para pruebas de estrés sin autenticación.
"""

from flask_restx import Namespace, Resource
from app.utils.response_handler import APIResponse
import time
import logging

logger = logging.getLogger(__name__)

stress_ns = Namespace('stress', description='Pruebas de estrés y rendimiento')

@stress_ns.route('/simple')
class StressTestSimple(Resource):
    def get(self):
        """Endpoint simple para pruebas de estrés sin autenticación."""
        try:
            # Simular trabajo mínimo
            time.sleep(0.001)  # 1ms de procesamiento

            return APIResponse.success(data={
                'message': 'Stress test endpoint',
                'timestamp': time.time(),
                'status': 'ok'
            })
        except Exception as e:
            logger.error(f"Stress test error: {str(e)}")
            return APIResponse.error(
                message="Stress test failed",
                error_code="STRESS_TEST_ERROR"
            )

@stress_ns.route('/database')
class StressTestDatabase(Resource):
    def get(self):
        """Endpoint con consulta a base de datos para pruebas de estrés."""
        try:
            from app import db
            from sqlalchemy import text

            # Query simple
            result = db.session.execute(text('SELECT 1 as test_value'))
            row = result.fetchone()

            return APIResponse.success(data={
                'message': 'Database stress test',
                'test_value': row[0] if row else None,
                'timestamp': time.time()
            })
        except Exception as e:
            logger.error(f"Database stress test error: {str(e)}")
            return APIResponse.error(
                message="Database stress test failed",
                error_code="DB_STRESS_TEST_ERROR"
            )

@stress_ns.route('/cache')
class StressTestCache(Resource):
    def get(self):
        """Endpoint con cache para pruebas de estrés."""
        try:
            import flask

            # Usar cache si está disponible
            cache = flask.current_app.extensions.get('cache')
            if cache:
                test_key = f'stress_test_{int(time.time())}'
                test_value = {'timestamp': time.time()}

                cache.set(test_key, test_value, timeout=10)
                retrieved = cache.get(test_key)

                return APIResponse.success(data={
                    'message': 'Cache stress test',
                    'cache_hit': retrieved is not None,
                    'timestamp': time.time()
                })
            else:
                return APIResponse.success(data={
                    'message': 'Cache not available',
                    'timestamp': time.time()
                })
        except Exception as e:
            logger.error(f"Cache stress test error: {str(e)}")
            return APIResponse.error(
                message="Cache stress test failed",
                error_code="CACHE_STRESS_TEST_ERROR"
            )
