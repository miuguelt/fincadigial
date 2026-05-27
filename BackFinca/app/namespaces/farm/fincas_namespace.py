
import flask
from app.models.finca import Finca
from app.models.activity_log import ActivityLog
from app.utils.namespace_helpers import create_optimized_namespace
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required
from app.utils.response_handler import APIResponse
from app import db
from sqlalchemy import func, or_
import logging

logger = logging.getLogger(__name__)

fincas_ns = create_optimized_namespace(
    name='fincas',
    description='🏘️ Gestión Global de Fincas',
    model_class=Finca,
    path='/fincas'
)

# Modelos para estadísticas
finca_stats_model = fincas_ns.model('FincaStats', {
    'total_fincas': fields.Integer,
    'by_type': fields.Raw,
    'active_fincas': fields.Integer,
    'inactive_fincas': fields.Integer
})

@fincas_ns.route('/statistics')
class FincaStatistics(Resource):
    @fincas_ns.doc('get_finca_statistics', description='Estadísticas globales de fincas', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            from flask_jwt_extended import get_jwt_identity, get_jwt
            user_id = get_jwt_identity()
            jwt_data = get_jwt()
            role = jwt_data.get('role')

            # Si no es admin global, filtrar por sus fincas
            query_base = db.session.query(Finca)
            if role not in ['Administrador', 'Propietario']:
                from app.models.user_finca import UserFinca
                query_base = query_base.join(UserFinca).filter(UserFinca.user_id == user_id, UserFinca.is_active == True)

            type_stats = db.session.query(Finca.type, func.count(Finca.id)).select_from(Finca)
            if role not in ['Administrador', 'Propietario']:
                type_stats = type_stats.join(UserFinca).filter(UserFinca.user_id == user_id, UserFinca.is_active == True)
            type_stats = type_stats.group_by(Finca.type).all()

            status_stats = db.session.query(Finca.is_active, func.count(Finca.id)).select_from(Finca)
            if role not in ['Administrador', 'Propietario']:
                status_stats = status_stats.join(UserFinca).filter(UserFinca.user_id == user_id, UserFinca.is_active == True)
            status_stats = status_stats.group_by(Finca.is_active).all()

            type_dict = {t.value if hasattr(t, 'value') else str(t): count for t, count in type_stats}
            status_dict = {str(status): count for status, count in status_stats}
            total = sum(type_dict.values())

            payload = {
                'total_fincas': total,
                'by_type': type_dict,
                'active_fincas': status_dict.get('True', 0),
                'inactive_fincas': status_dict.get('False', 0)
            }
            return APIResponse.success(data=payload, message='Estadísticas de fincas obtenidas')
        except Exception as e:
            logger.error('Error obteniendo estadísticas de fincas: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

@fincas_ns.route('/activity')
class FincaGlobalActivity(Resource):
    @fincas_ns.doc('get_finca_global_activity', description='Historial de movimientos global de fincas', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            page = flask.request.args.get('page', default=1, type=int)
            limit = flask.request.args.get('limit', default=20, type=int)

            from app.utils.tenant_context import apply_tenant_filter
            query = apply_tenant_filter(ActivityLog.query, ActivityLog)
            query = query.order_by(ActivityLog.created_at.desc())
            pagination = query.paginate(page=page, per_page=limit, error_out=False)

            items = []
            for item in pagination.items:
                actor_name = item.actor.fullname if item.actor else "Sistema"
                items.append({
                    'id': item.id,
                    'action': item.action,
                    'entity': item.entity,
                    'title': item.title,
                    'description': item.description,
                    'created_at': item.created_at.isoformat() if item.created_at else None,
                    'actor_name': actor_name,
                    'finca_id': item.finca_id
                })

            return APIResponse.paginated_success(
                data=items,
                page=page,
                limit=limit,
                total_items=pagination.total,
                message='Actividad global obtenida'
            )
        except Exception as e:
            logger.error('Error obteniendo actividad global de fincas: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)


@fincas_ns.route('/public', endpoint='public_fincas_list')
class PublicFincasList(Resource):
    @fincas_ns.doc('public_fincas_list', description='Listar fincas públicas disponibles para solicitar membresía. No requiere autenticación.')
    def get(self):
        try:
            search = flask.request.args.get('search', '').strip()
            page = flask.request.args.get('page', default=1, type=int)
            limit = flask.request.args.get('limit', default=20, type=int)
            finca_type = flask.request.args.get('type', '').strip()
            department = flask.request.args.get('department', '').strip()

            # Base query - solo fincas activas
            query = Finca.query.filter(Finca.is_active == True)

            # Filtros
            if search:
                search_pattern = f'%{search}%'
                query = query.filter(
                    or_(
                        Finca.name.ilike(search_pattern),
                        Finca.department.ilike(search_pattern),
                        Finca.municipality.ilike(search_pattern)
                    )
                )

            if finca_type and finca_type in ['Educativa', 'Tradicional']:
                from app.models.finca import FarmType
                query = query.filter(Finca.type == FarmType(finca_type))

            if department:
                query = query.filter(Finca.department.ilike(f'%{department}%'))

            # Ordenar por nombre
            query = query.order_by(Finca.name.asc())

            # Paginación
            pagination = query.paginate(page=page, per_page=limit, error_out=False)

            # Construir respuesta pública (solo campos seguros)
            items = []
            for finca in pagination.items:
                items.append({
                    'id': finca.id,
                    'name': finca.name,
                    'type': finca.type.value if finca.type else None,
                    'department': finca.department,
                    'municipality': finca.municipality,
                    'address': finca.address,
                    'created_at': finca.created_at.isoformat() if finca.created_at else None,
                })

            return APIResponse.paginated_success(
                data=items,
                page=page,
                limit=limit,
                total_items=pagination.total,
                message='Fincas disponibles'
            )

        except Exception as e:
            logger.error('Error listando fincas públicas: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', status_code=500)


@fincas_ns.route('/public/<int:finca_id>', endpoint='public_finca_detail')
class PublicFincaDetail(Resource):
    @fincas_ns.doc('public_finca_detail', description='Obtener detalles públicos de una finca específica')
    def get(self, finca_id):
        try:
            finca = Finca.query.get(finca_id)

            if not finca:
                return APIResponse.error('Finca no encontrada', status_code=404)

            if not finca.is_active:
                return APIResponse.error('Esta finca no está disponible', status_code=400)

            # Información pública
            data = {
                'id': finca.id,
                'name': finca.name,
                'type': finca.type.value if finca.type else None,
                'department': finca.department,
                'municipality': finca.municipality,
                'address': finca.address,
                'nit': finca.nit,
                'logo_url': finca.logo_url,
                'created_at': finca.created_at.isoformat() if finca.created_at else None,
            }

            return APIResponse.success(data=data, message='Información de la finca')

        except Exception as e:
            logger.error('Error obteniendo finca pública %s: %s', finca_id, e, exc_info=True)
            return APIResponse.error('Error interno del servidor', status_code=500)
