from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from sqlalchemy import case, func
from datetime import datetime, timedelta
import json
import logging
import time

from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.utils.tenant_context import apply_tenant_filter, get_current_finca_id

logger = logging.getLogger(__name__)

live_ns = Namespace(
    'analytics/live',
    description='⚡ Analytics - KPIs en tiempo real (SSE)'
)


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


def calculate_live_kpis_by_finca(finca_ids) -> dict[int, dict]:
    """Calculate all requested farms with five grouped SQL queries."""
    from app.models.animalDiseases import AnimalDiseases

    ids = sorted({int(value) for value in finca_ids if value is not None})
    if not ids:
        return {}

    timestamp = datetime.now().isoformat()
    metrics = {
        finca_id: {
            'total_animals': 0,
            'active_animals': 0,
            'sick_animals': 0,
            'vaccinations_30d': 0,
            'active_treatments': 0,
            'controls_7d': 0,
        }
        for finca_id in ids
    }

    animal_rows = (
        db.session.query(
            Animals.finca_id,
            func.count(Animals.id),
            func.sum(case((Animals.status == AnimalStatus.Vivo, 1), else_=0)),
        )
        .filter(Animals.finca_id.in_(ids), Animals.is_deleted == False)
        .group_by(Animals.finca_id)
        .all()
    )
    for finca_id, total, active in animal_rows:
        metrics[finca_id]['total_animals'] = int(total or 0)
        metrics[finca_id]['active_animals'] = int(active or 0)

    sick_rows = (
        db.session.query(
            AnimalDiseases.finca_id,
            func.count(func.distinct(AnimalDiseases.animal_id)),
        )
        .join(Animals, Animals.id == AnimalDiseases.animal_id)
        .filter(
            AnimalDiseases.finca_id.in_(ids),
            AnimalDiseases.status.in_(['Activo', 'En Tratamiento', 'Recurrente']),
            AnimalDiseases.is_deleted == False,
            Animals.is_deleted == False,
        )
        .group_by(AnimalDiseases.finca_id)
        .all()
    )
    for finca_id, count in sick_rows:
        metrics[finca_id]['sick_animals'] = int(count or 0)

    thirty_days_ago = datetime.now() - timedelta(days=30)
    seven_days_ago = datetime.now() - timedelta(days=7)
    grouped_queries = (
        ('vaccinations_30d', Vaccinations, Vaccinations.vaccination_date, thirty_days_ago),
        ('active_treatments', Treatments, Treatments.treatment_date, thirty_days_ago),
        ('controls_7d', Control, Control.checkup_date, seven_days_ago),
    )
    for key, model, date_column, cutoff in grouped_queries:
        rows = (
            db.session.query(model.finca_id, func.count(model.id))
            .join(Animals, Animals.id == model.animal_id)
            .filter(
                model.finca_id.in_(ids),
                date_column >= cutoff,
                model.is_deleted == False,
                Animals.is_deleted == False,
            )
            .group_by(model.finca_id)
            .all()
        )
        for finca_id, count in rows:
            metrics[finca_id][key] = int(count or 0)

    result = {}
    for finca_id, values in metrics.items():
        active = values['active_animals']
        sick = values['sick_animals']
        values['health_rate'] = round(((active - sick) / active * 100), 1) if active else 100
        result[finca_id] = {'timestamp': timestamp, 'kpis': values}
    return result


def combine_live_kpis(items) -> dict:
    """Combine per-farm results into a global payload without more SQL."""
    totals = {
        'total_animals': 0,
        'active_animals': 0,
        'sick_animals': 0,
        'vaccinations_30d': 0,
        'active_treatments': 0,
        'controls_7d': 0,
    }
    payloads = list(items)
    for payload in payloads:
        for key in totals:
            totals[key] += int(payload.get('kpis', {}).get(key, 0) or 0)
    active = totals['active_animals']
    totals['health_rate'] = round(((active - totals['sick_animals']) / active * 100), 1) if active else 100
    return {'timestamp': datetime.now().isoformat(), 'kpis': totals}


def calculate_live_kpis(finca_id=None) -> dict:
    """Calculate live KPIs for the explicit farm or current tenant."""
    try:
        effective_finca_id = finca_id or get_current_finca_id()
        if effective_finca_id:
            return calculate_live_kpis_by_finca([effective_finca_id]).get(
                int(effective_finca_id),
                combine_live_kpis([]),
            )

        from app.models.finca import Finca
        finca_ids = [row[0] for row in db.session.query(Finca.id).all()]
        return combine_live_kpis(calculate_live_kpis_by_finca(finca_ids).values())
    except Exception as e:
        logger.error('Error calculando KPIs live: %s', e)
        return {'timestamp': datetime.now().isoformat(), 'kpis': {}, 'error': str(e)}


def _close_pubsub(pubsub) -> None:
    """Best-effort cleanup: the socket may already be closed by the server."""
    if pubsub is None:
        return
    try:
        pubsub.close()
    except Exception:
        pass


def _stream_from_redis(redis_client, channel: str, finca_id):
    """Yield SSE frames from Redis Pub/Sub, reconnecting on connection loss.

    A dropped socket (idle reap, Memurai restart, CLIENT KILL) used to end the
    stream: the ConnectionError was logged and the generator returned. Now the
    subscription is rebuilt with exponential backoff (1s -> 30s), mirroring
    RedisEventBus._listen_to_redis.
    """
    backoff = 1
    last_warning = 0.0
    initial_sent = False

    while True:
        pubsub = None
        try:
            pubsub = redis_client.pubsub()
            pubsub.subscribe(channel)
            backoff = 1
            if not initial_sent:
                # Enviar un primer paquete inmediato para no dejar la UI vacía
                yield f'data: {json.dumps(calculate_live_kpis(finca_id))}\n\n'
                initial_sent = True

            for message in pubsub.listen():
                if message['type'] == 'message':
                    # El cliente no usa decode_responses: el payload llega en bytes.
                    data = message['data']
                    if isinstance(data, bytes):
                        data = data.decode('utf-8')
                    yield f'data: {data}\n\n'
        except Exception as exc:
            now = time.time()
            # Rule: at most one warning per minute for repeating errors.
            if now - last_warning >= 60:
                logger.warning(
                    'SSE PubSub desconectado (%s). Reintentando en %ss', exc, backoff
                )
                last_warning = now
        finally:
            _close_pubsub(pubsub)

        # Comentario SSE: mantiene viva la conexión y detecta al cliente ido
        # (si se desconectó, este yield rompe el generador en vez de dormir).
        yield ': reconnecting\n\n'
        time.sleep(backoff)
        backoff = min(backoff * 2, 30)


@live_ns.route('/stream')
class LiveAnalyticsStream(Resource):
    @live_ns.doc(
        'live_analytics_stream',
        description='Stream SSE con KPIs actualizados cada 30 segundos.',
        security=['Bearer', 'Cookie'],
        responses={200: 'Stream SSE', 401: 'No autorizado'},
    )
    @jwt_required()
    def get(self):
        """Stream de KPIs en tiempo real via Server-Sent Events (Optimizadas con Redis Pub/Sub)"""
        def generate_sse():
            finca_id = get_current_finca_id()
            channel = f"live_kpis_{finca_id}" if finca_id else "live_kpis_global"

            from app.extensions import redis_client
            if redis_client:
                yield from _stream_from_redis(redis_client, channel, finca_id)
            else:
                # Fallback sin Redis (antiguo comportamiento pesado)
                while True:
                    try:
                        data = calculate_live_kpis(finca_id)
                        yield f'data: {json.dumps(data)}\n\n'
                        time.sleep(30)
                    except Exception as e:
                        logger.error('Error en SSE stream: %s', e)
                        yield f'data: {json.dumps({"error": str(e), "timestamp": datetime.now().isoformat()})}\n\n'
                        time.sleep(30)

        return flask.Response(
            flask.stream_with_context(generate_sse()),
            mimetype='text/event-stream',
            headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
        )
