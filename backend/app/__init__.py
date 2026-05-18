import os
import sys
import logging
import time
import flask
from werkzeug.middleware.proxy_fix import ProxyFix

# Importar configuraciones
from config import config

# Importar extensiones centralizadas
from app.extensions import db, jwt, migrate, cache, init_extensions
from app.utils.logging_config import configure_logging
from app.utils.request_hooks import register_request_hooks

def create_app(config_name='development'):
    # Detectar si estamos en un test de pytest
    try:
        if config_name != 'testing' and ('PYTEST_CURRENT_TEST' in os.environ or 'pytest' in sys.modules):
            config_name = 'testing'
    except Exception:
        pass

    app = flask.Flask(__name__)
    app.config['START_TIME'] = time.time()
    app.url_map.strict_slashes = False

    # ProxyFix para entornos con balanceadores
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    # Configuración de la app
    app_config = config.get(config_name, 'default')
    app.config.from_object(app_config)
    app.config['CONFIG_NAME'] = config_name

    # Configurar el logging
    configure_logging(app)
    logger = logging.getLogger(__name__)
    logger.info(f"Iniciando App flask.Flask en modo: {config_name}")

    # Configurar Encoders JSON y Enums
    from app.utils.enum_registry import EnumJSONEncoder, register_application_enums
    register_application_enums()
    app.json_encoder = EnumJSONEncoder

    # Inicializar Sentry (solo en producción/staging)
    _init_sentry(app, config_name, logger)

    # Inicializar Extensiones (DB, JWT, Cache, Compress, Migrate)
    init_extensions(app)

    # Registrar Hooks de Request (CORS, JSON Force, Token Injection)
    register_request_hooks(app)

    # Optimizaciones y Middlewares
    from app.utils.db_optimization import init_db_optimizations
    from app.utils.cors_setup import init_cors
    from app.utils.jwt_handlers import configure_jwt_handlers
    from app.utils.security_logger import setup_security_logging
    from app.utils.error_handlers import register_error_handlers
    from app.middleware import register_middleware
    from app.utils.security_middleware import init_security_middlewares
    from app.utils.db_protector import init_db_protector
    from app.celery_ext import init_celery

    init_db_optimizations(app)
    init_cors(app, logger)
    configure_jwt_handlers(jwt)
    setup_security_logging(app)
    register_error_handlers(app)
    register_middleware(app)
    init_security_middlewares(app)
    init_db_protector(app, db)
    init_celery(app)

    # CSP ampliado para docs en desarrollo (sobrescribe el del middleware)
    @app.after_request
    def set_docs_csp(response):
        if app.config.get('DEBUG', False):
            path = (flask.request.path or '').rstrip('/')
            if path.startswith('/api/v1/docs') or path.startswith('/swaggerui') or path.startswith('/docs'):
                response.headers['Content-Security-Policy'] = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                    "connect-src *;"
                )
                response.headers['X-CSP-Source'] = 'create_app'
        return response

    # Rate limiter
    if app.config.get('RATE_LIMIT_ENABLED', True):
        from app.utils.rate_limiter import init_rate_limiter
        limiter = init_rate_limiter(app)
    else:
        limiter = None

    # Registrar API v1 (Modularizada)
    from app.api import register_api
    register_api(app, limiter=limiter)

    # Registrar API de compatibilidad de contrato
    from app.api.contract_compat import compat_bp
    app.register_blueprint(compat_bp)

    # Route for DevBrain Master Console (Pulse)
    @app.route('/')
    def serve_dashboard():
        dashboard_dir = "C:/Users/Miguel/Documents/Aplicaciones/_infrastructure/dashboard"
        return flask.send_from_directory(dashboard_dir, 'index.html')

    if config_name == 'testing':
        with app.app_context():
            try:
                db.create_all()
                from app.models.user import User, Role, ApprovalStatus
                from app.models import Finca, FarmType
                finca = Finca.query.first()
                if not finca:
                    finca = Finca.create(name='Finca Test E2E', type=FarmType.Tradicional)
                    db.session.commit()
                admin_user = User.query.filter_by(email='admin@villaluz.com').first()
                if not admin_user:
                    admin_user = User.create(
                        identification=123456789,
                        fullname='Administrador E2E',
                        email='admin@villaluz.com',
                        phone='3001234567',
                        password='test123',
                        role=Role.Administrador,
                        finca_id=finca.id,
                        approval_status=ApprovalStatus.Approved,
                        status=True
                    )
                    db.session.commit()
                else:
                    admin_user.set_password('test123')
                    db.session.commit()
                
                op_user = User.query.filter_by(email='op1@villaluz.com').first()
                if not op_user:
                    op_user = User.create(
                        identification=987654321,
                        fullname='Operario E2E',
                        email='op1@villaluz.com',
                        phone='3009876543',
                        password='test123',
                        role=Role.Operario,
                        finca_id=finca.id,
                        approval_status=ApprovalStatus.Approved,
                        status=True
                    )
                    db.session.commit()
                else:
                    op_user.set_password('test123')
                    db.session.commit()

                # Sembrar Especies y Razas para pruebas E2E
                from app.models.species import Species
                from app.models.breeds import Breeds
                
                bovino = Species.query.filter_by(name='Bovino').first()
                if not bovino:
                    bovino = Species.create(name='Bovino', description='Ganado Bovino')
                    db.session.commit()
                
                brahman = Breeds.query.filter_by(name='Brahman').first()
                if not brahman:
                    brahman = Breeds.create(name='Brahman', species_id=bovino.id, description='Raza Brahman')
                    db.session.commit()
                
                angus = Breeds.query.filter_by(name='Angus').first()
                if not angus:
                    angus = Breeds.create(name='Angus', species_id=bovino.id, description='Raza Angus')
                    db.session.commit()
            except Exception as e:
                logger.error(f"Error inicializando BD de testing en create_app: {e}")

    return app

def _init_sentry(app, config_name, logger):
    _sentry_dsn = os.getenv('SENTRY_DSN')
    if _sentry_dsn and config_name != 'testing':
        try:
            import sentry_sdk
            from sentry_sdk.integrations.flask import FlaskIntegration
            from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
            sentry_sdk.init(
                dsn=_sentry_dsn,
                integrations=[FlaskIntegration(), SqlalchemyIntegration()],
                traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.05')),
                environment=config_name,
                release=os.getenv('APP_VERSION', 'unknown'),
            )
            logger.info('Sentry inicializado')
        except Exception as e:
            logger.warning(f'No se pudo inicializar Sentry: {e}')
