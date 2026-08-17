import logging
from app.celery_ext import celery
from app.services.predictive_engine_service import PredictiveEngineService
import flask

logger = logging.getLogger(__name__)


@celery.task(name="app.tasks.predictive_tasks.run_finca_predictive_analysis")
def run_finca_predictive_analysis(finca_id):
    """
    Tarea asíncrona para ejecutar el análisis predictivo de IA en una finca.
    Evita bloqueos en el hilo principal del servidor web (Hito F8).
    """
    logger.info(f"Iniciando análisis predictivo asíncrono para finca {finca_id}...")

    # Simular contexto de admin para saltar filtros de tenant si es necesario
    try:
        flask.g.is_admin = True
    except RuntimeError:
        pass

    try:
        result = PredictiveEngineService.run_finca_analysis(finca_id)
        logger.info(f"Análisis predictivo completado para finca {finca_id}: {result}")

        # Opcional: Publicar resultado en Redis para que el frontend lo sepa
        try:
            from app.extensions import redis_client
            import json

            if redis_client:
                redis_client.publish(
                    f"predictive_analysis_status_{finca_id}",
                    json.dumps({"status": "completed", "result": result}),
                )
        except Exception as re:
            logger.warning(f"No se pudo publicar el estado en Redis: {re}")

        return result
    except Exception as e:
        logger.error(f"Error en tarea de análisis predictivo: {e}")

        # Notificar fallo
        try:
            from app.extensions import redis_client
            import json

            if redis_client:
                redis_client.publish(
                    f"predictive_analysis_status_{finca_id}",
                    json.dumps({"status": "error", "message": str(e)}),
                )
        except:
            pass

        raise
