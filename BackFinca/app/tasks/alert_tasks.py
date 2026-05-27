import logging
from app.celery_ext import celery
from app.services.alert_engine import AlertEngine
import flask

logger = logging.getLogger(__name__)

@celery.task(name="app.tasks.alert_tasks.evaluate_all_alerts")
def evaluate_all_alerts():
    """
    Ejecuta el motor de alertas en background a través de Celery.
    Esto permite escalabilidad multi-worker sin problemas de concurrencia.
    """
    logger.info("Iniciando evaluación programada de AlertEngine vía Celery...")

    # Nos aseguramos de tener el contexto de flask (el celery_app.py pushará el contexto global)
    # y emulamos permisos admin para que brinque el tenant-filter (Mismo hack que se usaba antes)
    try:
        flask.g.is_admin = True
    except RuntimeError:
        pass

    try:
        results = AlertEngine.evaluate_all()
        logger.info(f"Evaluación de alertas finalizada: {results}")
        return results
    except Exception as e:
        logger.error(f"Error en la ejecución de AlertEngine en Celery: {e}")
        raise

@celery.task(name="app.tasks.alert_tasks.broadcast_live_kpis")
def broadcast_live_kpis():
    """
    Calcula los KPIs y los difunde a través de Redis Pub/Sub a todos los WebSockets / SSE.
    """
    from app.extensions import redis_client
    if not redis_client:
        return "No Redis Client"

    import json
    from app.namespaces.analytics.live import calculate_live_kpis
    from app.models.finca import Finca

    # Fake admin to bypass filters internally
    try:
        flask.g.is_admin = True
    except RuntimeError:
        pass

    try:
        # Finca agnostic (global)
        global_kpis = calculate_live_kpis(None)
        redis_client.publish('live_kpis_global', json.dumps(global_kpis))

        # Por finca (Multi-Tenant)
        fincas = Finca.query.all()
        for f in fincas:
            finca_data = calculate_live_kpis(f.id)
            redis_client.publish(f'live_kpis_{f.id}', json.dumps(finca_data))

        logger.info(f"Broadcast de KPIs live completado para {len(fincas)} fincas.")
        return True
    except Exception as e:
        logger.error(f"Error emitiendo KPIs a Redis: {e}")
        raise
