from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import date, timedelta

from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.services.analytics.prediction_service import PredictionService

predictions_ns = Namespace(
    'analytics/predictions',
    description='🔮 Analytics - Predicciones de crecimiento'
)


@predictions_ns.route('/weight/<int:animal_id>')
class AnimalWeightPrediction(Resource):
    @predictions_ns.doc(
        'predict_animal_weight',
        params={'date': {'description': 'Fecha objetivo (YYYY-MM-DD)', 'type': 'string'}},
        security=['Bearer', 'Cookie'],
        responses={200: 'Predicción de peso', 400: 'Fecha inválida', 401: 'No autorizado'},
    )
    @jwt_required()
    def get(self, animal_id):
        """Predice el peso de un animal para una fecha futura"""
        target_date_str = flask.request.args.get('date')
        try:
            target_date = (
                date.fromisoformat(target_date_str)
                if target_date_str
                else date.today() + timedelta(days=30)
            )
        except ValueError:
            return APIResponse.error('Formato de fecha inválido (YYYY-MM-DD)', status_code=400)

        prediction = PredictionService.predict_animal_weight(animal_id, target_date)
        return APIResponse.success(prediction)


@predictions_ns.route('/market-readiness/<int:animal_id>')
class AnimalMarketReadiness(Resource):
    @predictions_ns.doc(
        'predict_market_readiness',
        params={'target_weight': {'description': 'Peso objetivo en kg', 'type': 'integer', 'default': 450}},
        security=['Bearer', 'Cookie'],
        responses={200: 'Estimación de readiness', 401: 'No autorizado'},
    )
    @jwt_required()
    def get(self, animal_id):
        """Estima cuándo el animal llegará al peso de venta ideal"""
        target_w = flask.request.args.get('target_weight', default=450, type=int)
        readiness = PredictionService.estimate_market_readiness(animal_id, target_w)
        return APIResponse.success(readiness)


@predictions_ns.route('/anomalies')
class GrowthAnomalyMonitor(Resource):
    @predictions_ns.doc(
        'monitor_growth_anomalies',
        security=['Bearer', 'Cookie'],
        responses={200: 'Resultado del análisis', 400: 'Sin finca', 401: 'No autorizado'},
    )
    @jwt_required()
    def post(self):
        """Dispara análisis de anomalías de crecimiento para la finca actual"""
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error('No se pudo determinar la finca', status_code=400)
        results = PredictionService.monitor_growth_anomalies(finca_id)
        return APIResponse.success(results, message='Análisis de anomalías completado')
