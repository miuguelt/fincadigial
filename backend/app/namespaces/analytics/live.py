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
from app.utils.response_handler import APIResponse
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
        animals_q = _tf(Animals.query, Animals)
        total_animals = animals_q.count()
        active_animals = animals_q.filter(Animals.status == AnimalStatus.Vivo).count()

        from app.models.animalDiseases import AnimalDiseases
        sick_count = (
            _tf(db.session.query(func.count(func.distinct(AnimalDiseases.animal_id))), AnimalDiseases)
            .filter(AnimalDiseases.status.in_(['Activo', 'En Tratamiento', 'Recurrente']))
            .scalar() or 0
        )

        thirty_days_ago = datetime.now() - timedelta(days=30)
        vaccinations_30d = (
            _tf(Vaccinations.query, Vaccinations)
            .filter(Vaccinations.vaccination_date >= thirty_days_ago)
            .count()
        )

        active_treatments = (
            _tf(Treatments.query, Treatments)
            .filter(Treatments.treatment_date >= thirty_days_ago)
            .count()
        )

        seven_days_ago = datetime.now() - timedelta(days=7)
        controls_7d = (
            _tf(Control.query, Control)
            .filter(Control.checkup_date >= seven_days_ago)
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
            
            from app.redis_client import redis_client
            if redis_client:
                pubsub = redis_client.pubsub()
                try:
                    pubsub.subscribe(channel)
                    # Enviar un primer paquete inmediato para no dejar la UI vacía
                    initial_data = calculate_live_kpis(finca_id)
                    yield f'data: {json.dumps(initial_data)}\n\n'
                    
                    for message in pubsub.listen():
                        if message['type'] == 'message':
                            yield f'data: {message["data"]}\n\n'
                except Exception as e:
                    logger.error(f"Error en PubSub SSE: {e}")
                finally:
                    pubsub.unsubscribe()
                    pubsub.close()
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
