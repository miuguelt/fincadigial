import logging
from app.celery_ext import celery
from app.services.alert_engine import AlertEngine
import flask

logger = logging.getLogger(__name__)

@celery.task(name="app.tasks.alert_tasks.evaluate_all_alerts")
def evaluate_all_alerts(finca_id=None):
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

    lock = None
    try:
        from app.extensions import redis_client

        if redis_client is not None:
            lock = redis_client.lock(
                f'villaluz:tasks:evaluate_all_alerts:{finca_id or "global"}',
                timeout=2 * 60 * 60,
                blocking_timeout=0,
            )
            if not lock.acquire(blocking=False):
                logger.info("Evaluación de alertas omitida: ya existe una ejecución activa")
                return {'status': 'skipped', 'reason': 'already_running'}

        results = AlertEngine.evaluate_all(finca_id=finca_id)
        logger.info(f"Evaluación de alertas finalizada: {results}")
        return results
    except Exception as e:
        logger.error(f"Error en la ejecución de AlertEngine en Celery: {e}")
        raise
    finally:
        if lock is not None:
            try:
                if lock.owned():
                    lock.release()
            except Exception:
                logger.warning("No se pudo liberar el lock de evaluación de alertas", exc_info=True)

@celery.task(name="app.tasks.alert_tasks.broadcast_live_kpis")
def broadcast_live_kpis():
    """
    Calcula los KPIs y los difunde a través de Redis Pub/Sub a todos los WebSockets / SSE.
    """
    from app.extensions import redis_client
    if not redis_client:
        return "No Redis Client"

    import json
    from app.namespaces.analytics.live import calculate_live_kpis_by_finca, combine_live_kpis
    from app.models.finca import Finca

    # Fake admin to bypass filters internally
    try:
        flask.g.is_admin = True
    except RuntimeError:
        pass

    try:
        finca_ids = [row[0] for row in Finca.query.with_entities(Finca.id).all()]
        channels = ['live_kpis_global', *(f'live_kpis_{finca_id}' for finca_id in finca_ids)]

        try:
            subscriber_rows = redis_client.pubsub_numsub(*channels)
            subscribers = {
                key.decode('utf-8') if isinstance(key, bytes) else str(key): int(count)
                for key, count in subscriber_rows
            }
            global_active = subscribers.get('live_kpis_global', 0) > 0
            active_ids = [
                finca_id for finca_id in finca_ids
                if subscribers.get(f'live_kpis_{finca_id}', 0) > 0
            ]
        except Exception:
            # Older Redis-compatible servers may not expose PUBSUB NUMSUB.
            global_active = True
            active_ids = finca_ids

        if not global_active and not active_ids:
            return "No active KPI subscribers"

        requested_ids = finca_ids if global_active else active_ids
        per_finca = calculate_live_kpis_by_finca(requested_ids)

        if global_active:
            redis_client.publish(
                'live_kpis_global',
                json.dumps(combine_live_kpis(per_finca.values())),
            )

        for finca_id in active_ids:
            payload = per_finca.get(finca_id)
            if payload:
                redis_client.publish(f'live_kpis_{finca_id}', json.dumps(payload))

        logger.debug("Broadcast de KPIs live completado para %s fincas activas.", len(active_ids))
        return True
    except Exception as e:
        logger.error(f"Error emitiendo KPIs a Redis: {e}")
        raise
