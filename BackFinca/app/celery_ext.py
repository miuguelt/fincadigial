from celery import Celery

celery = Celery(__name__)

def init_celery(app):
    """
    Inicializa Celery con la configuración de flask.Flask.
    """
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery
