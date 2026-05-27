from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract, desc
from datetime import datetime, timedelta
import logging

from app import db
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.models.medications import Medications
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter

logger = logging.getLogger(__name__)

health_analytics_ns = Namespace(
    'analytics/health',
    description='🏥 Analytics - Salud animal'
)


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


@health_analytics_ns.route('/statistics')
class HealthStatistics(Resource):
    @health_analytics_ns.doc(
        'get_health_statistics',
        params={
            'months': {'description': 'Meses hacia atrás', 'type': 'integer', 'default': 12},
            'animal_id': {'description': 'ID animal específico', 'type': 'integer'},
        },
        security=['Bearer', 'Cookie'],
        responses={200: 'Estadísticas de salud', 401: 'No autorizado', 500: 'Error del servidor'},
    )
    @jwt_required()
    def get(self):
        """Estadísticas de salud: tratamientos, vacunaciones, enfermedades comunes"""
        try:
            months_back = int(flask.request.args.get('months', 12))
            animal_id = flask.request.args.get('animal_id')
            start_date = datetime.now() - timedelta(days=months_back * 30)

            treatment_q = _tf(db.session.query(Treatments), Treatments).filter(
                Treatments.treatment_date >= start_date,
                Treatments.is_deleted == False
            )
            vaccination_q = _tf(db.session.query(Vaccinations), Vaccinations).filter(
                Vaccinations.vaccination_date >= start_date,
                Vaccinations.is_deleted == False
            )
            if animal_id:
                treatment_q = treatment_q.filter(Treatments.animal_id == animal_id)
                vaccination_q = vaccination_q.filter(Vaccinations.animal_id == animal_id)

            treatments_by_month = (
                _tf(db.session.query(
                    extract('year', Treatments.treatment_date).label('year'),
                    extract('month', Treatments.treatment_date).label('month'),
                    func.count(Treatments.id).label('count'),
                ), Treatments)
                .filter(Treatments.treatment_date >= start_date, Treatments.is_deleted == False)
                .group_by(
                    extract('year', Treatments.treatment_date),
                    extract('month', Treatments.treatment_date),
                )
                .order_by('year', 'month')
                .all()
            )

            vaccinations_by_month = (
                _tf(db.session.query(
                    extract('year', Vaccinations.vaccination_date).label('year'),
                    extract('month', Vaccinations.vaccination_date).label('month'),
                    func.count(Vaccinations.id).label('count'),
                ), Vaccinations)
                .filter(Vaccinations.vaccination_date >= start_date, Vaccinations.is_deleted == False)
                .group_by(
                    extract('year', Vaccinations.vaccination_date),
                    extract('month', Vaccinations.vaccination_date),
                )
                .order_by('year', 'month')
                .all()
            )

            health_status_dist = (
                _tf(db.session.query(
                    Control.health_status,
                    func.count(Control.id).label('count'),
                ), Control)
                .filter(Control.checkup_date >= start_date, Control.is_deleted == False)
                .group_by(Control.health_status)
                .all()
            )

            common_diseases = (
                _tf(db.session.query(
                    Treatments.description,
                    func.count(Treatments.id).label('count'),
                ), Treatments)
                .filter(Treatments.treatment_date >= start_date, Treatments.is_deleted == False)
                .group_by(Treatments.description)
                .order_by(desc(func.count(Treatments.id)))
                .limit(10)
                .all()
            )

            medication_usage = (
                _tf(db.session.query(
                    Medications.name,
                    func.count(Treatments.id).label('usage_count'),
                ), Medications)
                .join(Treatments, Treatments.description.ilike(func.concat('%', Medications.name, '%')))
                .filter(
                    Treatments.treatment_date >= start_date,
                    Treatments.is_deleted == False,
                    Medications.is_deleted == False
                )
                .group_by(Medications.name)
                .order_by(desc(func.count(Treatments.id)))
                .limit(10)
                .all()
            )

            return APIResponse.success(
                data={
                    'treatments_by_month': [
                        {'year': int(y), 'month': int(m), 'count': c, 'period': f'{int(y)}-{int(m):02d}'}
                        for y, m, c in treatments_by_month
                    ],
                    'vaccinations_by_month': [
                        {'year': int(y), 'month': int(m), 'count': c, 'period': f'{int(y)}-{int(m):02d}'}
                        for y, m, c in vaccinations_by_month
                    ],
                    'health_status_distribution': {
                        status.value: count for status, count in health_status_dist
                    },
                    'common_diseases': [
                        {'diagnosis': d, 'count': c} for d, c in common_diseases
                    ],
                    'medication_usage': [
                        {'medication': m, 'usage_count': c} for m, c in medication_usage
                    ],
                    'summary': {
                        'total_treatments': sum(c for _, _, c in treatments_by_month),
                        'total_vaccinations': sum(c for _, _, c in vaccinations_by_month),
                        'period_months': months_back,
                    },
                },
                message='Estadísticas de salud obtenidas exitosamente',
            )
        except Exception as e:
            logger.error('Error en health/statistics: %s', e, exc_info=True)
            return APIResponse.error(message='Error interno del servidor', status_code=500, details={'error': str(e)})
