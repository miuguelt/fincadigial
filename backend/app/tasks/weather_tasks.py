import logging
from app.celery_ext import celery

logger = logging.getLogger(__name__)


@celery.task(name="app.tasks.weather_tasks.update_all_weather")
def update_all_weather():
    """
    Actualiza datos climáticos de todas las fincas desde Open-Meteo.
    Se ejecuta 3 veces al día: 6:00, 14:00, 22:00 (hora local Colombia).
    """
    logger.info("Iniciando actualización programada de datos climáticos...")

    try:
        from app.services.weather_data_service import WeatherDataService

        results = WeatherDataService.update_all_fincas()
        logger.info(
            f"Actualización climática completada: {results['success']}/{results['total']} fincas"
        )
        return results
    except Exception as e:
        logger.error(f"Error en actualización climática: {e}")
        raise


@celery.task(name="app.tasks.weather_tasks.update_finca_weather")
def update_finca_weather(finca_id: int):
    """
    Actualiza datos climáticos de una finca específica.
    """
    logger.info(f"Iniciando actualización climática para finca {finca_id}...")

    try:
        from app.services.weather_data_service import WeatherDataService

        result = WeatherDataService.update_finca_weather(finca_id)
        logger.info(f"Actualización climática para finca {finca_id}: {result}")
        return result
    except Exception as e:
        logger.error(f"Error en actualización climática para finca {finca_id}: {e}")
        raise


@celery.task(name="app.tasks.weather_tasks.cleanup_old_alerts")
def cleanup_old_alerts():
    """
    Desactiva alertas climáticas vencidas.
    Se ejecuta una vez al día.
    """
    logger.info("Iniciando limpieza de alertas climáticas vencidas...")

    try:
        from datetime import datetime
        from app import db
        from app.models.weather import WeatherAlert

        expired = WeatherAlert.query.filter(
            WeatherAlert.is_active == True,
            WeatherAlert.valid_until < datetime.utcnow(),
        ).update({"is_active": False}, synchronize_session=False)

        db.session.commit()
        logger.info(f"Limpieza completada: {expired} alertas desactivadas")
        return {"cleaned": expired}
    except Exception as e:
        logger.error(f"Error en limpieza de alertas: {e}")
        raise
