from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from sqlalchemy import func
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


def calculate_live_kpis(finca_id=None) -> dict:
    """Calcula KPIs en tiempo real para el dashboard live."""
    try:
        animals_q = _tf(Animals.query, Animals).filter(Animals.is_deleted == False)
        total_animals = animals_q.count()
        active_animals = animals_q.filter(Animals.status == AnimalStatus.Vivo).count()

        from app.models.animalDiseases import AnimalDiseases
        sick_count = (
            _tf(db.session.query(func.count(func.distinct(AnimalDiseases.animal_id))), AnimalDiseases)
            .join(Animals, Animals.id == AnimalDiseases.animal_id)
            .filter(
                AnimalDiseases.status.in_(['Activo', 'En Tratamiento', 'Recurrente']),
                AnimalDiseases.is_deleted == False,
                Animals.is_deleted == False
            )
            .scalar() or 0
        )

        thirty_days_ago = datetime.now() - timedelta(days=30)
        vaccinations_30d = (
            _tf(Vaccinations.query, Vaccinations)
            .join(Animals, Animals.id == Vaccinations.animal_id)
            .filter(
                Vaccinations.vaccination_date >= thirty_days_ago,
                Vaccinations.is_deleted == False,
                Animals.is_deleted == False
            )
            .count()
        )

        active_treatments = (
            _tf(Treatments.query, Treatments)
            .join(Animals, Animals.id == Treatments.animal_id)
            .filter(
                Treatments.treatment_date >= thirty_days_ago,
                Treatments.is_deleted == False,
                Animals.is_deleted == False
            )
            .count()
        )

        seven_days_ago = datetime.now() - timedelta(days=7)
        controls_7d = (
            _tf(Control.query, Control)
            .join(Animals, Animals.id == Control.animal_id)
            .filter(
                Control.checkup_date >= seven_days_ago,
                Control.is_deleted == False,
                Animals.is_deleted == False
            )
            .count()
        )

        health_rate = (
            round(((active_animals - sick_count) / active_animals * 100), 1)
            if active_animals > 0 else 100
        )

        return {
            'timestamp': datetime.now().isoformat(),
            'kpis': {
                'total_animals': total_animals,
                'active_animals': active_animals,
                'sick_animals': sick_count,
                'health_rate': health_rate,
                'vaccinations_30d': vaccinations_30d,
                'active_treatments': active_treatments,
                'controls_7d': controls_7d,
            },
        }
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
