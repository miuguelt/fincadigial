"""Utilidades de optimización de base de datos

Este módulo contiene configuraciones y utilidades para optimizar
el rendimiento de la base de datos, incluyendo connection pooling,
query caching y optimización de consultas.
"""

import os
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool
import time
import logging
from functools import wraps
from typing import Any

logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """Clase para manejar optimizaciones de base de datos"""

    def __init__(self, app=None):
        self.app = app
        self.query_cache = {}
        self.cache_timeout = 300  # 5 minutos por defecto

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Inicializar optimizaciones de base de datos"""
        self.app = app

        # Configurar connection pooling
        self.configure_connection_pool(app)

        # Configurar logging de consultas lentas
        self.setup_slow_query_logging()

        # Configurar optimizaciones de MySQL
        self.configure_mysql_optimizations()

    def configure_connection_pool(self, app):
        """Configurar connection pooling optimizado"""
        existing = app.config.get('SQLALCHEMY_ENGINE_OPTIONS') or {}
        pool_config = dict(existing)
        pool_config.setdefault('poolclass', QueuePool)
        pool_config.setdefault('pool_size', 20)
        pool_config.setdefault('max_overflow', 10)
        pool_config.setdefault('pool_timeout', 30)
        pool_config.setdefault('pool_recycle', 1800)
        pool_config.setdefault('pool_pre_ping', True)
        app.config.update({'SQLALCHEMY_ENGINE_OPTIONS': pool_config})
        logger.info("Connection pooling configurado: pool_size=%s, max_overflow=%s", pool_config.get('pool_size'), pool_config.get('max_overflow'))

    def setup_slow_query_logging(self):
        """Configurar logging de consultas lentas"""

        @event.listens_for(Engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()

        @event.listens_for(Engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total = time.time() - context._query_start_time

            # Log consultas que toman más de 1 segundo
            if total > 1.0:
                logger.warning(
                    f"SLOW QUERY ({total:.2f}s): {statement[:200]}..."
                )

            # Log consultas muy lentas (más de 5 segundos)
            if total > 5.0:
                logger.error(
                    f"VERY SLOW QUERY ({total:.2f}s): {statement}"
                )

    def configure_mysql_optimizations(self):
        """Configurar optimizaciones específicas de MySQL"""
        # Only register MySQL-specific optimizations when the configured
        # SQLALCHEMY_DATABASE_URI targets MySQL. This avoids errors when using
        # SQLite in testing or other drivers where flask.session variables aren't supported.
        try:
            db_uri = (self.app.config.get('SQLALCHEMY_DATABASE_URI') or '').lower() if self.app else ''
        except Exception:
            db_uri = ''

        if 'mysql' not in db_uri:
            logger.info('Skipping MySQL optimizations for non-MySQL database URI')
            return

        @event.listens_for(Engine, "connect")
        def log_connection_and_set_mysql_pragma(dbapi_connection, connection_record):
            try:
                cursor = dbapi_connection.cursor()
                try:
                    # Optimizaciones de MySQL
                    optimizations = [
                        "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'",
                        "SET SESSION innodb_lock_wait_timeout = 50",
                        "SET SESSION tmp_table_size = 67108864",    # 64MB
                        "SET SESSION max_heap_table_size = 67108864", # 64MB
                    ]

                    for optimization in optimizations:
                        cursor.execute(optimization)

                    logger.debug("Optimizaciones MySQL aplicadas")
                finally:
                    try:
                        cursor.close()
                    except Exception:
                        pass

            except Exception as e:
                logger.warning(f"No se pudieron aplicar optimizaciones MySQL: {e}")

        @event.listens_for(Engine, "before_cursor_execute")
        def enforce_readonly_mode(conn, cursor, statement, parameters, context, executemany):
            """Bloquear escrituras si el modo mantenimiento está activo (Hardening)"""
            maintenance_mode = os.getenv('MAINTENANCE_MODE', 'false').lower() == 'true'

            if maintenance_mode:
                # Lista de comandos prohibidos en mantenimiento
                forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'REPLACE', 'TRUNCATE']
                stmt_upper = statement.strip().upper()

                if any(stmt_upper.startswith(cmd) for cmd in forbidden):
                    msg = "🚫 MODO MANTENIMIENTO: Operaciones de escritura deshabilitadas globalmente."
                    logger.error(msg)
                    raise RuntimeError(msg)

class QueryCache:
    """Cache simple para consultas frecuentes"""

    def __init__(self, timeout=300):
        self.cache = {}
        self.timeout = timeout

    def get(self, key: str) -> Any | None:
        """Obtener valor del cache"""
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time.time() - timestamp < self.timeout:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        """Guardar valor en cache"""
        self.cache[key] = (value, time.time())

    def clear(self) -> None:
        """Limpiar cache"""
        self.cache.clear()

    def size(self) -> int:
        """Obtener tamaño del cache"""
        return len(self.cache)

# Instancia global del cache
query_cache = QueryCache()

def cached_query(timeout=300):
    """Decorador para cachear resultados de consultas"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Crear clave única basada en función y argumentos
            cache_key = f"{func.__name__}:{str(args)}:{str(sorted(kwargs.items()))}"

            # Intentar obtener del cache
            result = query_cache.get(cache_key)
            if result is not None:
                logger.debug(f"Cache HIT: {func.__name__}")
                return result

            # Ejecutar función y cachear resultado
            logger.debug(f"Cache MISS: {func.__name__}")
            result = func(*args, **kwargs)
            query_cache.set(cache_key, result)

            return result
        return wrapper
    return decorator

class DBInsights:
    """Utilidades para optimización de consultas"""

    @staticmethod
    def get_table_stats(table_name: str) -> dict[str, Any]:
        """Return PostgreSQL size and planner statistics for a table."""
        from app import db

        try:
            result = db.session.execute(text("""
                SELECT
                    c.relname,
                    COALESCE(s.n_live_tup, 0),
                    pg_relation_size(c.oid),
                    pg_indexes_size(c.oid),
                    pg_total_relation_size(c.oid)
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
                WHERE n.nspname = current_schema()
                  AND c.relname = :table_name
                  AND c.relkind IN ('r', 'p')
            """), {'table_name': table_name}).fetchone()

            if result:
                return {
                    'table_name': result[0],
                    'rows': result[1],
                    'data_size': result[2],
                    'index_size': result[3],
                    'total_size': result[4]
                }

        except Exception as e:
            logger.error(f"Error obteniendo estadísticas de tabla {table_name}: {e}")

        return {}

    @staticmethod
    def analyze_slow_queries() -> list:
        """Return the most expensive statements when pg_stat_statements is enabled."""
        from app import db

        try:
            extension_enabled = db.session.execute(text(
                "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')"
            )).scalar()
            if not extension_enabled:
                return []

            result = db.session.execute(text("""
                SELECT
                    query,
                    calls,
                    mean_exec_time / 1000.0 AS avg_time_seconds,
                    max_exec_time / 1000.0 AS max_time_seconds
                FROM pg_stat_statements
                WHERE mean_exec_time >= 1000
                ORDER BY total_exec_time DESC
                LIMIT 10
            """)).fetchall()

            return [{
                'query': row[0][:200] + '...' if len(row[0]) > 200 else row[0],
                'count': row[1],
                'avg_time': round(row[2], 3),
                'max_time': round(row[3], 3)
            } for row in result]

        except Exception as e:
            logger.error(f"Error analizando consultas lentas: {e}")
            return []

    @staticmethod
    def get_index_usage() -> list:
        """Return PostgreSQL index scans and physical sizes."""
        from app import db

        try:
            result = db.session.execute(text("""
                SELECT
                    relname,
                    indexrelname,
                    idx_scan,
                    pg_relation_size(indexrelid)
                FROM pg_stat_user_indexes
                ORDER BY relname, idx_scan DESC
            """)).fetchall()

            return [{
                'table': row[0],
                'index': row[1],
                'scans': int(row[2] or 0),
                'size': int(row[3] or 0)
            } for row in result]

        except Exception as e:
            logger.error(f"Error obteniendo uso de índices: {e}")
            return []

# Instancia global del optimizador
db_optimizer = DatabaseOptimizer()

def init_db_optimizations(app):
    """Inicializar todas las optimizaciones de base de datos"""
    db_optimizer.init_app(app)
    logger.info("Optimizaciones de base de datos inicializadas")

def get_performance_stats() -> dict[str, Any]:
    """Obtener estadísticas de rendimiento de la base de datos"""
    insights = DBInsights()

    return {
        'cache_size': query_cache.size(),
        'slow_queries': insights.analyze_slow_queries(),
        'index_usage': insights.get_index_usage(),
        'table_stats': {
            'animals': insights.get_table_stats('animals'),
            'control': insights.get_table_stats('control'),
            'breeds': insights.get_table_stats('breeds'),
            'treatments': insights.get_table_stats('treatments'),
            'vaccinations': insights.get_table_stats('vaccinations')
        }
    }
