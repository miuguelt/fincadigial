# stats.py - Análisis estadístico del hato
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
import decimal
from datetime import datetime
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.breeds import Breeds
from app.models.system_content import SystemContent
from app.utils.response_handler import APIResponse
from ._helpers import _tf
from . import analytics_ns # Usaremos el namespace común


def _get_stats_config(key, default):
    entry = SystemContent.get_by_key(key)
    if entry and entry.extra:
        return entry.extra
    return default

animal_stats_model = analytics_ns.model('AnimalStats', {
    'by_status': fields.Raw(description='Por estado'),
    'by_sex': fields.Raw(description='Por sexo'),
    'by_breed': fields.List(fields.Raw, description='Por raza'),
    'by_age_group': fields.Raw(description='Por grupo de edad'),
    'weight_distribution': fields.Raw(description='Distribución de pesos'),
    'total_animals': fields.Integer(description='Total de animales'),
    'average_weight': fields.Float(description='Peso promedio')
})

@analytics_ns.route('/animals/statistics')
class AnimalStatistics(Resource):
    @analytics_ns.doc('get_animal_statistics', security=['Bearer', 'Cookie'])
    @jwt_required()
    def get(self):
        """Obtener estadísticas detalladas de animales"""
        try:
            status_stats = _tf(db.session.query(Animals.status, func.count(Animals.id).label('count')), Animals).filter(Animals.is_deleted == False).group_by(Animals.status).all()
            sex_stats = _tf(db.session.query(Animals.sex, func.count(Animals.id).label('count')), Animals).filter(Animals.is_deleted == False).group_by(Animals.sex).all()
            breed_stats = _tf(db.session.query(Breeds.name, func.count(Animals.id).label('count')), Breeds).join(Animals).filter(Animals.is_deleted == False, Breeds.is_deleted == False).group_by(Breeds.name).order_by(desc(func.count(Animals.id))).limit(10).all()

            current_date = datetime.now().date()
            age_config = _get_stats_config('config.age_groups', {'Terneros (0-1 año)': {'min': 0, 'max': 1}, 'Jóvenes (1-2 años)': {'min': 1, 'max': 2}, 'Adultos (2-5 años)': {'min': 2, 'max': 5}, 'Maduros (5+ años)': {'min': 5, 'max': 999}})
            age_groups = {k: 0 for k in age_config}
            animals_with_age = _tf(db.session.query(Animals.birth_date), Animals).filter(Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False).all()

            for animal in animals_with_age:
                if animal.birth_date:
                    age_years = (current_date - animal.birth_date).days / 365.25
                    for group_name, bounds in age_config.items():
                        if bounds['min'] <= age_years < bounds['max']:
                            age_groups[group_name] += 1
                            break

            weight_config = _get_stats_config('config.weight_ranges', {'0-200 kg': 200, '201-400 kg': 400, '401-600 kg': 600, '601+ kg': 9999})
            weight_ranges = {k: 0 for k in weight_config}
            animals_weights = _tf(db.session.query(Animals.weight), Animals).filter(Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False).all()
            for animal in animals_weights:
                weight = animal.weight
                for range_name, upper_bound in weight_config.items():
                    if weight <= upper_bound:
                        weight_ranges[range_name] += 1
                        break

            avg_weight = _tf(db.session.query(func.avg(Animals.weight)), Animals).filter(Animals.status == AnimalStatus.Vivo, Animals.is_deleted == False).scalar() or 0
            if isinstance(avg_weight, decimal.Decimal):
                avg_weight = float(avg_weight)

            by_sex_dict = {}
            for sex, count in sex_stats:
                if sex is not None:
                    key = sex.value if hasattr(sex, 'value') else str(sex)
                    by_sex_dict[key] = count

            age_distribution_list = [{'age_range': k, 'count': v} for k, v in age_groups.items()]

            return APIResponse.success(data={
                'by_status': {status.value if hasattr(status, 'value') else str(status): count for status, count in status_stats if status is not None},
                'by_sex': by_sex_dict,
                'by_gender': by_sex_dict,
                'by_breed': [{'breed': breed, 'count': count} for breed, count in breed_stats],
                'by_age_group': age_groups,
                'age_distribution': age_distribution_list,
                'weight_distribution': weight_ranges,
                'total_animals': sum((count for _, count in status_stats)),
                'average_weight': avg_weight
            })
        except Exception as e:
            return APIResponse.error(message='Error obteniendo estadísticas', details={'error': str(e)})
