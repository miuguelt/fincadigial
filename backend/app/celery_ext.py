from celery import Celery

celery = Celery(__name__)

def init_celery(app):
    """
    Inicializa Celery con la configuración de flask.Flask.

    Solo se copian las claves que Celery entiende. Volcar el config completo de
    Flask arrastraba los nombres heredados en mayúsculas (CELERY_BROKER_URL,
    CELERY_RESULT_BACKEND) junto a los de Celery 5 en minúsculas, y Celery se
    niega a arrancar con una configuración mezclada:
    ImproperlyConfigured: Cannot mix new and old setting keys.
    """
    celery.conf.update(
        broker_url=app.config['CELERY_BROKER_URL'],
        result_backend=app.config['CELERY_RESULT_BACKEND'],
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
