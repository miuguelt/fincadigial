import os
import logging

def configure_logging(app):
    """Configura el sistema de logging de forma centralizada."""
    if app.config.get('LOGGING_CONFIGURED'):
        return

    # Formato mejorado para logs
    log_format = '%(asctime)s - [%(levelname)s] - %(name)s - %(funcName)s:%(lineno)d - %(message)s'

    # Nivel de log desde configuración o variable de entorno
    log_level_str = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_level = getattr(logging, log_level_str, logging.INFO)

    logging.basicConfig(level=log_level, format=log_format)

    # Configurar el logger de flask.Flask
    app.logger.setLevel(log_level)

    # Evitar duplicidad si se reinicia la app en modo debug
    app.config['LOGGING_CONFIGURED'] = True
    app.logger.info("Sistema de logging configurado exitosamente")
