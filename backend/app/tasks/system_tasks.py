from celery import shared_task
from app.services.self_healing_service import SelfHealingManager
import logging

logger = logging.getLogger(__name__)


@shared_task(name="app.tasks.system_tasks.run_self_healing", ignore_result=True)
def run_self_healing():
    """Tarea periódica para diagnosticar y reparar el sistema."""
    logger.info("Iniciando ciclo de autorreparación (Self-Healing)...")
    try:
        results = SelfHealingManager.run_checkup()
        return results
    except Exception as e:
        logger.error(f"Fallo crítico en tarea de Self-Healing: {e}")
        return {"status": "error", "message": str(e)}
