import flask
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.milk_production import MilkProduction, MilkSession
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse, ResponseFormatter
from app.utils.tenant_context import get_current_finca_id
from app import db
import logging
from datetime import datetime, date, timedelta
from sqlalchemy import func, extract

logger = logging.getLogger(__name__)

milk_ns = create_optimized_namespace(
    name='milk-production',
    description='Operaciones relacionadas con el registro de producción láctea',
    model_class=MilkProduction,
    path='/milk-production'
)

# Modelos Swagger para batch entry
batch_entry_model = milk_ns.model('MilkBatchEntry', {
    'animal_id': fields.Integer(required=True, description='ID del animal'),
    'liters': fields.Float(required=True, description='Litros producidos'),
    'milking_session': fields.String(required=True, enum=['AM', 'PM', 'Extra'], description='Sesión de ordeño'),
    'fat_percentage': fields.Float(description='Porcentaje de grasa (opcional)'),
    'protein_percentage': fields.Float(description='Porcentaje de proteína (opcional)'),
    'somatic_cells': fields.Integer(description='Células somáticas (opcional)'),
    'notes': fields.String(description='Notas adicionales'),
})

batch_input_model = milk_ns.model('MilkBatchInput', {
    'date': fields.String(required=True, description='Fecha (YYYY-MM-DD)'),
    'entries': fields.List(fields.Nested(batch_entry_model), required=True, description='Lista de registros de leche'),
})

summary_trend_model = milk_ns.model('MilkTrendPoint', {
    'date': fields.String(description='Fecha'),
    'total_liters': fields.Float(description='Total litros'),
    'avg_liters_per_animal': fields.Float(description='Promedio litros por animal'),
    'animal_count': fields.Integer(description='Cantidad de animales ordeñados'),
    'session_breakdown': fields.Raw(description='Desglose por sesión'),
})


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
        finca_id = flask.request.args.get('finca_id', type=int) or get_current_finca_id()
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


@milk_ns.route('/batch')
class MilkBatchEntry(Resource):
    @milk_ns.doc('create_milk_batch', description='Registrar producción láctea de múltiples animales en una sesión')
    @jwt_required()
    @milk_ns.expect(batch_input_model)
    def post(self):
        """Entrada por lotes: registrar leche de múltiples animales en una sola operación"""
        try:
            data = flask.request.get_json()
            if not data or 'entries' not in data:
                return APIResponse.error('Se requiere lista de entradas (entries)', code=400)
            
            date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return APIResponse.error('Formato de fecha inválido. Use YYYY-MM-DD', code=400)
            
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error('Finca no seleccionada', code=400)
            
            entries = data.get('entries', [])
            if not entries:
                return APIResponse.error('Lista de entradas vacía', code=400)
            
            created = []
            errors = []
            
            for i, entry in enumerate(entries):
                try:
                    # Validar campos requeridos
                    if 'animal_id' not in entry or 'liters' not in entry:
                        errors.append({'index': i, 'error': 'Faltan campos requeridos: animal_id, liters'})
                        continue
                    
                    # Validar sesión
                    session_str = entry.get('milking_session', 'AM')
                    try:
                        session = MilkSession(session_str)
                    except ValueError:
                        errors.append({'index': i, 'error': f'Sesión inválida: {session_str}. Use AM, PM o Extra'})
                        continue
                    
                    # Verificar que el animal pertenece a la finca
                    from app.models.animals import Animals
                    animal = Animals.query.filter_by(id=entry['animal_id'], finca_id=finca_id).first()
                    if not animal:
                        errors.append({'index': i, 'error': f'Animal {entry["animal_id"]} no encontrado en esta finca'})
                        continue
                    
                    # Crear registro
                    record = MilkProduction(
                        animal_id=entry['animal_id'],
                        finca_id=finca_id,
                        date=target_date,
                        liters=float(entry['liters']),
                        milking_session=session,
                        fat_percentage=entry.get('fat_percentage'),
                        protein_percentage=entry.get('protein_percentage'),
                        somatic_cells=entry.get('somatic_cells'),
                        notes=entry.get('notes'),
                    )
                    db.session.add(record)
                    created.append(record.to_namespace_dict())
                    
                except Exception as e:
                    errors.append({'index': i, 'error': str(e)})
            
            db.session.commit()
            
            result = {
                'created': len(created),
                'errors': len(errors),
                'records': created,
                'error_details': errors,
            }
            
            status_code = 207 if errors else 201  # 207 Multi-Status si hay errores parciales
            return APIResponse.success(
                data=result,
                message=f'Sesión de ordeño registrada: {len(created)} animales, {len(errors)} errores',
                status_code=status_code
            )
            
        except Exception as e:
            db.session.rollback()
            logger.error(f'Error en entrada por lotes de leche: {str(e)}')
            return APIResponse.error('Error interno del servidor', status_code=500, details={'error': str(e)})


@milk_ns.route('/summary/weekly')
class MilkProductionWeeklySummary(Resource):
    @milk_ns.doc('get_milk_weekly_summary', description='Resumen semanal con tendencias')
    @jwt_required()
    def get(self):
        finca_id = flask.request.args.get('finca_id', type=int) or get_current_finca_id()
        if not finca_id:
            return APIResponse.error('finca_id es requerido', code=400)
        
        # Obtener fecha de inicio (por defecto, lunes de esta semana)
        date_str = flask.request.args.get('start_date')
        if date_str:
            try:
                start_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return APIResponse.error('Formato de fecha inválido. Use YYYY-MM-DD', code=400)
        else:
            today = date.today()
            start_date = today - timedelta(days=today.weekday())  # Lunes
        
        end_date = start_date + timedelta(days=6)  # Domingo
        
        # Consulta agregada por día
        daily_stats = db.session.query(
            MilkProduction.date,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
            func.count(func.distinct(MilkProduction.animal_id)).label('animal_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
        ).group_by(MilkProduction.date).order_by(MilkProduction.date).all()
        
        # Desglose por sesión para toda la semana
        session_stats = db.session.query(
            MilkProduction.milking_session,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.date >= start_date,
            MilkProduction.date <= end_date,
        ).group_by(MilkProduction.milking_session).all()
        
        week_total = sum(row.total_liters for row in daily_stats) if daily_stats else 0
        week_avg = week_total / len(daily_stats) if daily_stats else 0
        
        return APIResponse.success(data={
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
            },
            'total_liters': week_total,
            'avg_daily_liters': round(week_avg, 2),
            'days_with_records': len(daily_stats),
            'daily_breakdown': [
                {
                    'date': row.date.isoformat(),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                    'animal_count': row.animal_count,
                }
                for row in daily_stats
            ],
            'session_breakdown': {
                str(row.milking_session): {
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                }
                for row in session_stats
            },
        })


@milk_ns.route('/summary/monthly')
class MilkProductionMonthlySummary(Resource):
    @milk_ns.doc('get_milk_monthly_summary', description='Resumen mensual con tendencias')
    @jwt_required()
    def get(self):
        finca_id = flask.request.args.get('finca_id', type=int) or get_current_finca_id()
        if not finca_id:
            return APIResponse.error('finca_id es requerido', code=400)
        
        # Obtener mes/año (por defecto, mes actual)
        year = flask.request.args.get('year', type=int) or date.today().year
        month = flask.request.args.get('month', type=int) or date.today().month
        
        # Consulta agregada por día del mes
        daily_stats = db.session.query(
            MilkProduction.date,
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
            func.count(func.distinct(MilkProduction.animal_id)).label('animal_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
        ).group_by(MilkProduction.date).order_by(MilkProduction.date).all()
        
        # Consulta agregada por semana del mes
        weekly_stats = db.session.query(
            func.extract('week', MilkProduction.date).label('week_num'),
            func.sum(MilkProduction.liters).label('total_liters'),
            func.count(MilkProduction.id).label('record_count'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
        ).group_by(func.extract('week', MilkProduction.date)).order_by(func.extract('week', MilkProduction.date)).all()
        
        month_total = sum(row.total_liters for row in daily_stats) if daily_stats else 0
        month_avg = month_total / len(daily_stats) if daily_stats else 0
        
        # Comparación con mes anterior
        prev_month = month - 1 if month > 1 else 12
        prev_year = year if month > 1 else year - 1
        
        prev_month_total = db.session.query(
            func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == prev_year,
            extract('month', MilkProduction.date) == prev_month,
        ).scalar() or 0
        
        trend_pct = 0
        if prev_month_total > 0:
            trend_pct = ((month_total - prev_month_total) / prev_month_total) * 100
        
        return APIResponse.success(data={
            'period': {
                'year': year,
                'month': month,
            },
            'total_liters': month_total,
            'avg_daily_liters': round(month_avg, 2),
            'days_with_records': len(daily_stats),
            'trend_vs_previous_month': {
                'previous_month_liters': float(prev_month_total),
                'change_percentage': round(trend_pct, 2),
                'direction': 'up' if trend_pct > 0 else 'down' if trend_pct < 0 else 'stable',
            },
            'daily_breakdown': [
                {
                    'date': row.date.isoformat(),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                    'animal_count': row.animal_count,
                }
                for row in daily_stats
            ],
            'weekly_breakdown': [
                {
                    'week': int(row.week_num),
                    'total_liters': float(row.total_liters),
                    'record_count': row.record_count,
                }
                for row in weekly_stats
            ],
        })


@milk_ns.route('/revenue/estimate')
class MilkRevenueEstimate(Resource):
    @milk_ns.doc('estimate_milk_revenue', description='Estimar ingresos por producción de leche')
    @jwt_required()
    def get(self):
        finca_id = flask.request.args.get('finca_id', type=int) or get_current_finca_id()
        if not finca_id:
            return APIResponse.error('finca_id es requerido', code=400)
        
        # Precio por litro (por defecto, precio promedio en Colombia ~$1,200 COP)
        price_per_liter = flask.request.args.get('price_per_liter', type=float) or 1200.0
        
        # Período (por defecto, mes actual)
        year = flask.request.args.get('year', type=int) or date.today().year
        month = flask.request.args.get('month', type=int) or date.today().month
        
        # Obtener producción total del período
        total_liters = db.session.query(
            func.sum(MilkProduction.liters)
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
        ).scalar() or 0
        
        estimated_revenue = float(total_liters) * price_per_liter
        
        # Desglose por sesión
        session_revenue = db.session.query(
            MilkProduction.milking_session,
            func.sum(MilkProduction.liters).label('total_liters'),
        ).filter(
            MilkProduction.finca_id == finca_id,
            extract('year', MilkProduction.date) == year,
            extract('month', MilkProduction.date) == month,
        ).group_by(MilkProduction.milking_session).all()
        
        return APIResponse.success(data={
            'period': {
                'year': year,
                'month': month,
            },
            'total_liters': float(total_liters),
            'price_per_liter': price_per_liter,
            'estimated_revenue': estimated_revenue,
            'currency': 'COP',
            'session_breakdown': [
                {
                    'session': str(row.milking_session),
                    'liters': float(row.total_liters),
                    'revenue': float(row.total_liters) * price_per_liter,
                }
                for row in session_revenue
            ],
        })
