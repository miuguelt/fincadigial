"""
Sistema de health checks para monitoreo del sistema VillaLuz.
Versión corregida usando flask.Flask-RESTX Resource clases.
"""

import time
import psutil
from datetime import datetime, UTC
from flask_restx import Namespace, Resource
from sqlalchemy import text
from app.utils.response_handler import APIResponse
import logging

logger = logging.getLogger(__name__)

# Crear namespace para health checks
health_ns = Namespace('health', description='Health checks del sistema')

class HealthChecker:
    def __init__(self, db=None, cache=None):
        self.db = db
        self.cache = cache

    def check_database(self):
        """Verificar conexión a base de datos."""
        try:
            start_time = time.time()

            # Query simple para testear conexión
            result = self.db.session.execute(text('SELECT 1'))
            result.fetchone()

            query_time = time.time() - start_time

            return {
                'status': 'healthy',
                'response_time_ms': round(query_time * 1000, 2),
                'timestamp': datetime.now(UTC).isoformat()
            }
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(UTC).isoformat()
            }

    def check_cache(self):
        """Verificar conexión a cache (Redis)."""
        try:
            start_time = time.time()

            if self.cache:
                # Test de escritura/lectura
                test_key = 'health_check_test'
                test_value = str(time.time())

                self.cache.set(test_key, test_value, timeout=1)
                retrieved = self.cache.get(test_key)

                # Limpiar
                self.cache.delete(test_key)

                query_time = time.time() - start_time

                if retrieved == test_value:
                    return {
                        'status': 'healthy',
                        'response_time_ms': round(query_time * 1000, 2),
                        'timestamp': datetime.now(UTC).isoformat()
                    }
                else:
                    return {
                        'status': 'unhealthy',
                        'error': 'Cache read/write mismatch',
                        'timestamp': datetime.now(UTC).isoformat()
                    }
            else:
                return {
                    'status': 'disabled',
                    'message': 'Cache not configured',
                    'timestamp': datetime.now(UTC).isoformat()
                }
        except Exception as e:
            logger.error(f"Cache health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(UTC).isoformat()
            }

    def check_system_resources(self):
        """Verificar recursos del sistema."""
        try:
            # CPU
            # CPU - Usar el valor instantáneo para evitar bloqueo de 1s
            cpu_percent = psutil.cpu_percent()
            cpu_count = psutil.cpu_count()

            # Memoria
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available_gb = round(memory.available / (1024**3), 2)

            # Disco
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_free_gb = round(disk.free / (1024**3), 2)

            # Determinar estado
            status = 'healthy'
            warnings = []

            if cpu_percent > 80:
                status = 'warning'
                warnings.append(f'High CPU usage: {cpu_percent}%')

            if memory_percent > 85:
                status = 'warning'
                warnings.append(f'High memory usage: {memory_percent}%')

            if disk_percent > 90:
                status = 'critical'
                warnings.append(f'Low disk space: {disk_percent}% used')

            return {
                'status': status,
                'warnings': warnings,
                'cpu': {
                    'usage_percent': cpu_percent,
                    'core_count': cpu_count
                },
                'memory': {
                    'usage_percent': memory_percent,
                    'available_gb': memory_available_gb
                },
                'disk': {
                    'usage_percent': disk_percent,
                    'free_gb': disk_free_gb
                },
                'timestamp': datetime.now(UTC).isoformat()
            }
        except Exception as e:
            logger.error(f"System resources health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(UTC).isoformat()
            }

    def check_celery(self):
        """Verificar estado de Celery, workers activos y métricas de performance."""
        try:
            from celery import current_app as celery_app

            # Intentar obtener workers activos y sus estadísticas
            # timeout muy corto para no bloquear el health check
            # A 200 ms reply window is too aggressive for a worker sharing a
            # local Memurai instance with cache, SSE and the result backend.
            # It turns healthy workers into false warnings during brief Redis
            # contention and makes the scheduled self-healing task noisy.
            inspector = celery_app.control.inspect(timeout=1.0)
            ping_res = inspector.ping()
            stats_res = inspector.stats()

            workers_count = len(ping_res) if ping_res else 0

            worker_details = {}
            if stats_res:
                for worker_name, stats in stats_res.items():
                    # Extraer métricas de uso de recursos si están disponibles
                    rusage = stats.get('rusage', {})
                    worker_details[worker_name] = {
                        'status': 'online',
                        'processed': stats.get('total', {}).get('total', 0),
                        'memory_usage_mb': round(rusage.get('maxrss', 0) / 1024, 2) if rusage.get('maxrss') else 0,
                        'concurrency': stats.get('pool', {}).get('max-concurrency', 0)
                    }

            return {
                'status': 'healthy' if workers_count > 0 else 'warning',
                'workers_active': workers_count,
                'worker_details': worker_details,
                'timestamp': datetime.now(UTC).isoformat()
            }
        except Exception as e:
            logger.warning(f"Celery health check failed (maybe not running): {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(UTC).isoformat()
            }

    def check_api_endpoints(self):
        """Verificar endpoints críticos."""
        try:
            import flask

            critical_endpoints = [
                'auth_namespace.login',
                'animals_namespace.animals',
                'fields_namespace.fields',
                'users_namespace.users'
            ]

            results = {}
            all_healthy = True

            for endpoint in critical_endpoints:
                try:
                    # Solo verificar que la URL se puede generar
                    url = flask.url_for(endpoint)
                    results[endpoint] = {
                        'status': 'healthy',
                        'url': url
                    }
                except Exception as e:
                    results[endpoint] = {
                        'status': 'unhealthy',
                        'error': str(e)
                    }
                    all_healthy = False

            return {
                'status': 'healthy' if all_healthy else 'degraded',
                'endpoints': results,
                'timestamp': datetime.now(UTC).isoformat()
            }
        except Exception as e:
            logger.error(f"API endpoints health check failed: {str(e)}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(UTC).isoformat()
            }

    def comprehensive_health_check(self):
        """Health check completo del sistema."""
        start_time = time.time()

        checks = {
            'database': self.check_database(),
            'cache': self.check_cache(),
            'celery': self.check_celery(),
            'system_resources': self.check_system_resources(),
            'api_endpoints': self.check_api_endpoints()
        }

        # Determinar estado general
        overall_status = 'healthy'
        failed_checks = []
        warning_checks = []

        for check_name, check_result in checks.items():
            if check_result.get('status') == 'unhealthy':
                overall_status = 'unhealthy'
                failed_checks.append(check_name)
            elif check_result.get('status') in ['warning', 'degraded']:
                if overall_status != 'unhealthy':
                    overall_status = 'warning'
                warning_checks.append(check_name)

        total_time = time.time() - start_time

        return {
            'status': overall_status,
            'timestamp': datetime.now(UTC).isoformat(),
            'response_time_ms': round(total_time * 1000, 2),
            'checks': checks,
            'summary': {
                'failed_checks': failed_checks,
                'warning_checks': warning_checks,
                'total_checks': len(checks)
            }
        }


@health_ns.route('/')
class BasicHealth(Resource):
    """Health check básico."""

    def get(self):
        """Endpoint de health check básico optimizado para el widget de telemetría."""
        try:
            from app import db, cache
            import flask
            health_checker = HealthChecker(db, cache)

            db_status = health_checker.check_database()
            cache_status = health_checker.check_cache()
            celery_status = health_checker.check_celery()
            sys_resources = health_checker.check_system_resources()

            # Preparar payload compatible con SystemTelemetryWidget
            data = {
                'status': 'healthy' if db_status['status'] == 'healthy' and sys_resources['status'] != 'critical' else 'unhealthy',
                'database_status': 'connected' if db_status['status'] == 'healthy' else 'disconnected',
                'redis': 'ok' if cache_status['status'] == 'healthy' else ('unavailable' if cache_status['status'] == 'disabled' else 'error'),
                'celery_workers': celery_status.get('workers_active', 0),
                'system_resources': {
                    'cpu': sys_resources['cpu']['usage_percent'],
                    'memory': sys_resources['memory']['usage_percent']
                },
                'version': flask.current_app.config.get('APP_VERSION', '1.0.0'),
                'uptime_seconds': time.time() - flask.current_app.config.get('START_TIME', time.time()),
                'environment': flask.current_app.config.get('ENV', 'production'),
                'self_healing': cache.get('system:self_healing:last_result') if cache else None,
                'timestamp': datetime.now(UTC).isoformat()
            }

            return APIResponse.success(data=data)
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Basic health check failed: {str(e)}\n{error_details}")
            return APIResponse.error(
                message=f"Service unavailable: {str(e)}",
                status_code=500,
                error_code="HEALTH_CHECK_FAILED",
                details={"traceback": error_details}
            )


@health_ns.route('/detailed')
class DetailedHealth(Resource):
    """Health check detallado."""

    def get(self):
        """Endpoint de health check detallado."""
        try:
            from app import db, cache
            health_checker = HealthChecker(db, cache)
            health_data = health_checker.comprehensive_health_check()

            if health_data['status'] == 'healthy':
                return APIResponse.success(data=health_data)
            elif health_data['status'] == 'warning':
                return APIResponse.success(
                    data=health_data,
                    message="System operating with warnings"
                )
            else:
                return APIResponse.error(
                    message="System unhealthy",
                    status_code=503,
                    error_code="SYSTEM_UNHEALTHY",
                    details=health_data
                )
        except Exception as e:
            logger.error(f"Detailed health check failed: {str(e)}")
            return APIResponse.error(
                message="Health check failed",
                status_code=503,
                error_code="HEALTH_CHECK_ERROR"
            )


@health_ns.route('/database')
class DatabaseHealth(Resource):
    """Health check de base de datos."""

    def get(self):
        """Endpoint de health check de base de datos."""
        try:
            from app import db
            health_checker = HealthChecker(db, None)
            db_health = health_checker.check_database()

            if db_health['status'] == 'healthy':
                return APIResponse.success(data=db_health)
            else:
                return APIResponse.error(
                    message="Database unhealthy",
                    status_code=503,
                    error_code="DATABASE_UNHEALTHY",
                    details=db_health
                )
        except Exception as e:
            logger.error(f"Database health check failed: {str(e)}")
            return APIResponse.error(
                message="Database health check failed",
                status_code=503,
                error_code="DB_HEALTH_CHECK_ERROR"
            )


@health_ns.route('/cache')
class CacheHealth(Resource):
    """Health check de cache."""

    def get(self):
        """Endpoint de health check de cache."""
        try:
            from app import cache
            health_checker = HealthChecker(None, cache)
            cache_health = health_checker.check_cache()

            if cache_health['status'] in ['healthy', 'disabled']:
                return APIResponse.success(data=cache_health)
            else:
                return APIResponse.error(
                    message="Cache unhealthy",
                    status_code=503,
                    error_code="CACHE_UNHEALTHY",
                    details=cache_health
                )
        except Exception as e:
            logger.error(f"Cache health check failed: {str(e)}")
            return APIResponse.error(
                message="Cache health check failed",
                status_code=503,
                error_code="CACHE_HEALTH_CHECK_ERROR"
            )


def init_health_check_routes(api, db, cache):
    """Inicializar rutas de health check."""
    api.add_namespace(health_ns, path='/health')
    logger.info("Health check routes initialized")
