import logging
import time
from datetime import datetime, UTC
from sqlalchemy import text
from app import db, cache
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)


class SelfHealingManager:
    """
    Servicio encargado de la detección y corrección automática de fallos lógicos
    en el ecosistema _projects/villaluz.
    """

    @staticmethod
    def run_checkup():
        """Ejecuta un ciclo completo de diagnóstico y reparación."""
        results = {
            "timestamp": datetime.now(UTC).isoformat(),
            "actions_taken": [],
            "status": "healthy",
        }

        try:
            # 1. Verificar Conectividad DB
            db_ok = SelfHealingManager._check_db_health()
            if not db_ok:
                results["actions_taken"].append("DATABASE_RECONNECT_ATTEMPTED")
                results["status"] = "repaired"

            # 2. Verificar Estado de Celery Workers
            celery_ok = SelfHealingManager._check_workers_health()
            if not celery_ok:
                results["actions_taken"].append("WORKERS_WARNING_EMITTED")
                results["status"] = "warning"

            # 3. Verificar Latencia de Redis
            redis_ok = SelfHealingManager._check_redis_latency()
            if not redis_ok:
                results["actions_taken"].append("REDIS_CACHE_PURGE_SUGGESTED")

            # Guardar último resultado en caché para el dashboard
            cache.set("system:self_healing:last_result", results, timeout=86400)  # 24h

            # Registrar si hubo acciones
            if results["actions_taken"]:
                SelfHealingManager._log_healing_action(results)

            return results
        except Exception as e:
            logger.error(f"Error en ciclo de Self-Healing: {e}")
            return {"status": "error", "error": str(e)}

    @staticmethod
    def _check_db_health():
        """Verifica si la DB responde y reconecta si es necesario."""
        try:
            db.session.execute(text("SELECT 1"))
            return True
        except Exception as e:
            logger.warning(f"DB Health Check falló: {e}. Intentando limpiar sesión...")
            try:
                db.session.remove()
                db.engine.dispose()
                return False
            except Exception:
                return False

    @staticmethod
    def _check_workers_health():
        """Verifica si hay workers activos consumiendo tareas."""
        from app.utils.health_check import HealthChecker

        checker = HealthChecker(db, cache)
        # This runs inside the worker itself, so a cached verdict from a Flask
        # request would be misleading: force a fresh probe.
        status = checker.check_celery(use_cache=False)
        if status.get("status") != "healthy":
            # Si no hay workers, emitir evento SSE para notificar al admin en tiempo real
            try:
                import flask

                bus = flask.current_app.extensions.get("event_bus")
                if bus:
                    # publish() takes (endpoint, action, record_id): passing the
                    # dict there produced an event whose ``action`` was an object,
                    # which no SSE consumer matches.
                    bus.publish_payload(
                        {
                            "endpoint": "system",
                            "action": "HEALTH_WARNING",
                            "service": "celery_workers",
                            "message": "No se detectan workers activos. Las tareas programadas podrían retrasarse.",
                            "timestamp": time.time(),
                        }
                    )
            except Exception:
                logger.debug("No se pudo emitir el aviso SSE de workers", exc_info=True)
            return False
        return True

    @staticmethod
    def _check_redis_latency():
        """Mide latencia de Redis para detectar saturación."""
        start = time.time()
        try:
            cache.set("_healing_ping", 1, timeout=5)
            latency = (time.time() - start) * 1000
            if latency > 200:  # > 200ms es preocupante para Redis local
                logger.warning(f"Alta latencia en Redis detectada: {latency:.2f}ms")
                return False
            return True
        except Exception:
            return False

    @staticmethod
    def _log_healing_action(results):
        """Registra la intervención en el log de actividades."""
        try:
            ActivityLog.create(
                action="SYSTEM_SELF_HEALING",
                entity="System",
                title="Intervención de Autorreparación",
                description=f"Acciones ejecutadas: {', '.join(results['actions_taken'])}. Estado resultante: {results['status']}",
                severity="warning" if results["status"] != "healthy" else "info",
            )
        except Exception as e:
            logger.error(f"No se pudo registrar log de self-healing: {e}")
