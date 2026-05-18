from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime, timezone
import logging

from app.models.animals import Animals, AnimalStatus
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter
from app.services.cortex_service import CortexService, PromptRole

logger = logging.getLogger(__name__)

ai_ns = Namespace(
    'ai-insights',
    description='🤖 Analytics - Insights de IA',
    path='/analytics/ai-insights'
)


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


@ai_ns.route('')
class AIInsights(Resource):
    @ai_ns.doc(
        'get_ai_insights',
        params={
            'action': {
                'description': 'Tipo de análisis',
                'type': 'string',
                'enum': ['general_status', 'health_warning', 'productivity_opt'],
                'default': 'general_status',
            },
            'animal_id': {'description': 'ID animal para análisis individual', 'type': 'integer'},
        },
        security=['Bearer', 'Cookie'],
        responses={200: 'Insight generado', 401: 'No autorizado', 404: 'Animal no encontrado', 500: 'Error del servidor'},
    )
    @jwt_required()
    def get(self):
        """Genera prompts y predicciones usando el método CREA"""
        try:
            action_type = flask.request.args.get('action', 'general_status')
            animal_id = flask.request.args.get('animal_id')

            target_obj = None
            role = PromptRole.ASSISTANT
            action_desc = ''

            if animal_id:
                target_obj = _tf(Animals.query, Animals).get(animal_id)
                if not target_obj:
                    return APIResponse.error('Animal no encontrado', status_code=404)
                if action_type == 'health_warning':
                    role = PromptRole.ANALYST
                    action_desc = (
                        f'Analiza el historial de salud del animal {target_obj.record} '
                        'y determina si requiere intervención inmediata.'
                    )
                else:
                    action_desc = f'Proporciona un resumen ejecutivo del estado del animal {target_obj.record}.'
            else:
                target_obj = _tf(Animals.query, Animals).filter_by(status=AnimalStatus.Vivo).limit(5).all()
                action_desc = 'Analiza el estado general de estos animales representativos y sugiere mejoras operativas.'

            prompt = CortexService.assemble_prompt(target_object=target_obj, role=role, action=action_desc)

            result = CortexService.call_claude(prompt, role=role, max_tokens=600)

            return APIResponse.success({
                'insight':      result['text'],
                'model':        result['model'],
                'cached':       result.get('cached', False),
                'is_mock':      result.get('mock', False),
                'usage':        result.get('usage', {}),
                'generated_at': datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            logger.error('Error generando AI insights: %s', e, exc_info=True)
            return APIResponse.error('Error al generar insights de IA', status_code=500)
