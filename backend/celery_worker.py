import os
from app import create_app
from app.celery_ext import celery

# Asegurar contexto de la aplicación para que Celery y Flask-SQLAlchemy funcionen
app = create_app(os.getenv('FLASK_ENV', 'development'))
app.app_context().push()

# Importar las tareas para que Celery las registre
import app.tasks.alert_tasks
import app.tasks.system_tasks

# Configurar el cron (Celery Beat) para evaluar alertas cada 6 horas
celery.conf.beat_schedule = {
    'evaluate-alerts-every-6-hours': {
        'task': 'app.tasks.alert_tasks.evaluate_all_alerts',
        'schedule': 21600.0,  # 6 horas en segundos
    },
    'broadcast-live-kpis-every-30-seconds': {
        'task': 'app.tasks.alert_tasks.broadcast_live_kpis',
        'schedule': 30.0,
    },
    'run-self-healing-every-15-minutes': {
        'task': 'app.tasks.system_tasks.run_self_healing',
        'schedule': 900.0,  # 15 minutos
    },
}
celery.conf.timezone = 'UTC'
