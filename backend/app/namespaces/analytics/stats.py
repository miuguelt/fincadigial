# stats.py - Análisis estadístico del hato
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required
from sqlalchemy import func, desc
import decimal
from datetime import datetime
from app import db
from app.models.animals import Animals, AnimalStatus
from app.models.breeds import Breeds
from app.utils.response_handler import APIResponse
from ._helpers import _tf, _round
from . import analytics_ns # Usaremos el namespace común

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
            status_stats = _tf(db.session.query(Animals.status, func.count(Animals.id).label('count')), Animals).group_by(Animals.status).all()
            sex_stats = _tf(db.session.query(Animals.sex, func.count(Animals.id).label('count')), Animals).group_by(Animals.sex).all()
            breed_stats = _tf(db.session.query(Breeds.name, func.count(Animals.id).label('count')), Breeds).join(Animals).group_by(Breeds.name).order_by(desc(func.count(Animals.id))).limit(10).all()
            
            current_date = datetime.now().date()
            age_groups = {'Terneros (0-1 año)': 0, 'Jóvenes (1-2 años)': 0, 'Adultos (2-5 años)': 0, 'Maduros (5+ años)': 0}
            animals_with_age = _tf(db.session.query(Animals.birth_date), Animals).filter(Animals.status == AnimalStatus.Vivo).all()
            
            for animal in animals_with_age:
                if animal.birth_date:
                    age_years = (current_date - animal.birth_date).days / 365.25
                    if age_years < 1: age_groups['Terneros (0-1 año)'] += 1
                    elif age_years < 2: age_groups['Jóvenes (1-2 años)'] += 1
                    elif age_years < 5: age_groups['Adultos (2-5 años)'] += 1
                    else: age_groups['Maduros (5+ años)'] += 1

            weight_ranges = {'0-200 kg': 0, '201-400 kg': 0, '401-600 kg': 0, '601+ kg': 0}
            animals_weights = _tf(db.session.query(Animals.weight), Animals).filter(Animals.status == AnimalStatus.Vivo).all()
            for animal in animals_weights:
                weight = animal.weight
                if weight <= 200: weight_ranges['0-200 kg'] += 1
                elif weight <= 400: weight_ranges['201-400 kg'] += 1
                elif weight <= 600: weight_ranges['401-600 kg'] += 1
                else: weight_ranges['601+ kg'] += 1

            avg_weight = _tf(db.session.query(func.avg(Animals.weight)), Animals).filter(Animals.status == AnimalStatus.Vivo).scalar() or 0
            if isinstance(avg_weight, decimal.Decimal):
                avg_weight = float(avg_weight)

            return APIResponse.success(data={
                'by_status': {status.value: count for status, count in status_stats},
                'by_sex': {sex.value: count for sex, count in sex_stats},
                'by_breed': [{'breed': breed, 'count': count} for breed, count in breed_stats],
                'by_age_group': age_groups,
                'weight_distribution': weight_ranges,
                'total_animals': sum((count for _, count in status_stats)),
                'average_weight': avg_weight
            })
        except Exception as e:
            return APIResponse.error(message='Error obteniendo estadísticas', details={'error': str(e)})
