import flask
from flask_restx import Resource
from flask_jwt_extended import jwt_required
from app.models.milk_production import MilkProduction
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse, ResponseFormatter
from app import db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

milk_ns = create_optimized_namespace(
    name='milk-production',
    description='Operaciones relacionadas con el registro de producción láctea',
    model_class=MilkProduction,
    path='/milk-production'
)

@milk_ns.route('/animal/<int:animal_id>')
class MilkProductionByAnimal(Resource):
    @milk_ns.doc('get_milk_by_animal', description='Obtener producción láctea por animal (paginado)')
    @jwt_required()
    def get(self, animal_id):
        page = flask.request.args.get('page', default=1, type=int) or 1
        limit = flask.request.args.get('limit', type=int) or flask.request.args.get('per_page', type=int) or 50
        
        query = MilkProduction.query.filter_by(animal_id=animal_id).order_by(MilkProduction.date.desc())
        
        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)
        items = [
            (m.to_namespace_dict() if hasattr(m, 'to_namespace_dict') else m.to_json()) 
            for m in pagination.items
        ]
        
        sanitized = ResponseFormatter.sanitize_for_frontend(items)
        return APIResponse.paginated_success(
            data=sanitized,
            page=page,
            limit=int(limit),
            total_items=pagination.total,
            message='Producción láctea por animal obtenida'
        )

@milk_ns.route('/summary/daily')
class MilkProductionDailySummary(Resource):
    @milk_ns.doc('get_milk_daily_summary', description='Resumen diario de producción por finca')
    @jwt_required()
    def get(self):
        finca_id = flask.request.args.get('finca_id', type=int)
        if not finca_id:
            return APIResponse.error('finca_id es requerido', code=400)
            
        date_str = flask.request.args.get('date', default=datetime.now().strftime('%Y-%m-%d'))
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return APIResponse.error('Formato de fecha inválido. Use YYYY-MM-DD', code=400)
            
        production = MilkProduction.query.filter_by(finca_id=finca_id, date=target_date).all()
        
        total_liters = sum(m.liters for m in production)
        by_session = {}
        for m in production:
            session_name = str(m.milking_session)
            by_session[session_name] = by_session.get(session_name, 0) + m.liters
            
        return APIResponse.success(data={
            'date': date_str,
            'total_liters': total_liters,
            'by_session': by_session,
            'count': len(production)
        })
