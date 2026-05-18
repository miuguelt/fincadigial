from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime

from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

alerts_analytics_ns = Namespace(
    'analytics/alerts',
    description='🚨 Analytics - Alertas del sistema'
)


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


@alerts_analytics_ns.route('/')
class SystemAlerts(Resource):
    @alerts_analytics_ns.doc(
        'get_system_alerts',
        params={
            'priority': {'description': 'Prioridad (Alta, Media, Baja, Crítica)', 'type': 'string'},
            'animal_id': {'description': 'ID del animal', 'type': 'integer'},
            'is_read': {'description': '¿Leída?', 'type': 'boolean'},
            'limit': {'description': 'Máximo de alertas', 'type': 'integer', 'default': 50},
        },
        security=['Bearer', 'Cookie'],
        responses={200: 'Lista de alertas', 401: 'No autorizado', 500: 'Error del servidor'},
    )
    @jwt_required()
    def get(self):
        """Obtener alertas del sistema con filtros opcionales"""
        try:
            from app.models.alerts import AnimalAlert, AlertPriority

            priority_filter = flask.request.args.get('priority')
            animal_id = flask.request.args.get('animal_id')
            is_read = flask.request.args.get('is_read')
            limit = int(flask.request.args.get('limit', 50))

            # Mapa de valores en español → enum (SQLAlchemy compara por objeto enum, no por string)
            _PRIORITY_MAP = {
                'crítica': AlertPriority.CRITICAL,
                'critica': AlertPriority.CRITICAL,
                'alta':    AlertPriority.HIGH,
                'media':   AlertPriority.MEDIUM,
                'baja':    AlertPriority.LOW,
            }

            query = _tf(AnimalAlert.query, AnimalAlert)
            if priority_filter:
                pf_lower = priority_filter.lower()
                if pf_lower == 'urgente':
                    # Alias: Alta + Crítica juntas
                    query = query.filter(
                        AnimalAlert.priority.in_([AlertPriority.HIGH, AlertPriority.CRITICAL])
                    )
                elif pf_lower in _PRIORITY_MAP:
                    query = query.filter(AnimalAlert.priority == _PRIORITY_MAP[pf_lower])
                # Si no coincide, no se filtra (devuelve todas)
            if animal_id:
                query = query.filter_by(animal_id=animal_id)
            if is_read is not None:
                query = query.filter_by(is_read=is_read.lower() == 'true')

            db_alerts = query.order_by(AnimalAlert.triggered_at.desc()).limit(limit).all()

            formatted = [
                {
                    'id': f'alert_{a.id}',
                    'db_id': a.id,
                    'type': a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type),
                    'priority': a.priority.value.lower() if hasattr(a.priority, 'value') else str(a.priority).lower(),
                    'title': f"{a.alert_type.value if hasattr(a.alert_type, 'value') else str(a.alert_type)} - {a.animal.record if a.animal else 'Animal Desconocido'}",
                    'message': a.message,
                    'animal_id': a.animal_id,
                    'animal_record': a.animal.record if a.animal else 'N/A',
                    'is_read': a.is_read,
                    'created_at': a.triggered_at.isoformat() if a.triggered_at else datetime.now().isoformat(),
                    'icon': '⚠️' if a.priority == AlertPriority.MEDIUM
                           else '🚨' if a.priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]
                           else 'ℹ️',
                    'color': 'orange' if a.priority == AlertPriority.MEDIUM
                             else 'red' if a.priority in [AlertPriority.HIGH, AlertPriority.CRITICAL]
                             else 'blue',
                }
                for a in db_alerts
            ]

            stats = {
                'total': len(formatted),
                'unread': sum(1 for a in formatted if not a['is_read']),
                'by_priority': {
                    'critica': sum(1 for a in formatted if a['priority'] == 'crítica'),
                    'alta': sum(1 for a in formatted if a['priority'] == 'alta'),
                    'media': sum(1 for a in formatted if a['priority'] == 'media'),
                    'baja': sum(1 for a in formatted if a['priority'] == 'baja'),
                    # Alias para compatibilidad con código legado
                    'high': sum(1 for a in formatted if a['priority'] in ['alta', 'crítica']),
                    'medium': sum(1 for a in formatted if a['priority'] == 'media'),
                    'low': sum(1 for a in formatted if a['priority'] == 'baja'),
                },
            }

            return APIResponse.success(
                data={'alerts': formatted, 'statistics': stats, 'generated_at': datetime.now().isoformat()},
                message=f'Se recuperaron {len(formatted)} alertas',
            )
        except Exception as e:
            return APIResponse.error(message='Error interno del servidor', status_code=500, details={'error': str(e)})
