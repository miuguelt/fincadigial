import os
from app import create_app
from app.celery_ext import celery

# Asegurar contexto de la aplicación para que Celery y Flask-SQLAlchemy funcionen
app = create_app(os.getenv('FLASK_ENV', 'development'))
app.app_context().push()

# Importar las tareas para que Celery las registre
import app.tasks.alert_tasks
import app.tasks.system_tasks
import app.tasks.weather_tasks

# Configurar el cron (Celery Beat) para evaluar alertas cada 6 horas
celery.conf.beat_schedule = {
    'evaluate-alerts-every-hour': {
        'task': 'app.tasks.alert_tasks.evaluate_all_alerts',
        'schedule': 3600.0,  # 1 hora en segundos
    },
    'broadcast-live-kpis-every-60-seconds': {
        'task': 'app.tasks.alert_tasks.broadcast_live_kpis',
        'schedule': float(os.getenv('LIVE_KPI_INTERVAL_SECONDS', '60')),
    },
    'run-self-healing-every-15-minutes': {
        'task': 'app.tasks.system_tasks.run_self_healing',
        'schedule': 900.0,  # 15 minutos
    },
    # Tareas de clima - 2 veces al día (cada 12 horas)
    'update-weather-twice-daily': {
        'task': 'app.tasks.weather_tasks.update_all_weather',
        'schedule': 43200.0,  # 12 horas en segundos
    },
    'cleanup-weather-alerts-daily': {
        'task': 'app.tasks.weather_tasks.cleanup_old_alerts',
        'schedule': 86400.0,  # 24 horas en segundos
    },
}
celery.conf.timezone = 'UTC'
