
from flask_restx import Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt
from app.models.user import User
from app.models.base_model import ValidationError
from app.models.finca import Finca
from app.models.user_finca import UserFinca
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse
from app import db
from sqlalchemy.exc import IntegrityError
import logging

from app.services.users_service import (
    _format_activity_item,
    get_user_statistics, get_user_status_stats, get_user_roles_stats,
    build_user_activity_query,
)
logger = logging.getLogger(__name__)

limiter = None

users_ns = create_optimized_namespace(
    name='users',
    description='👥 Gestión Optimizada de Usuarios del Sistema',
    model_class=User,
    path='/users',
    public_create=True,
)

# Configurar rate limiting específico para creación de usuarios (sólo POST /users)
def set_limiter(app_limiter):
    global limiter
    limiter = app_limiter
    try:
        if not limiter:
            return
        from app.utils.rate_limiter import RATE_LIMIT_CONFIG, get_remote_address_with_forwarded
        create_limit = (RATE_LIMIT_CONFIG.get('users', {}) or {}).get('create', "10 per hour")
        list_resource = getattr(users_ns, '_model_list_resource', None)
        if list_resource and hasattr(list_resource, 'post') and not getattr(list_resource.post, '_rate_limit_applied', False):
            list_resource.post = limiter.limit(create_limit, key_func=get_remote_address_with_forwarded, methods=["POST"])(list_resource.post)
            list_resource.post._rate_limit_applied = True
            logger.info("Rate limit aplicado a creación de usuarios: %s", create_limit)
    except Exception:
        logger.exception("No se pudo aplicar rate limit a creación de usuarios")

# El endpoint POST se crea automáticamente por create_optimized_namespace
# Configurado como ruta pública en security_middleware (sin JWT)

@users_ns.route('/search')
class UserSearchResource(Resource):
    @users_ns.doc('search_users', description='Buscar usuarios por nombre o correo', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            q = flask.request.args.get('q', '')
            limit = flask.request.args.get('limit', default=10, type=int)
            
            if len(q) < 3:
                return APIResponse.success(data=[], message='Query too short')

            # Búsqueda ILIKE
            users = User.query.filter(
                (User.fullname.ilike(f'%{q}%')) | 
                (User.email.ilike(f'%{q}%'))
            ).limit(limit).all()

            result = []
            for u in users:
                # Enmascarar email: mig***@domain.com
                email = u.email
                if email and '@' in email:
                    prefix, domain = email.split('@')
                    masked_email = f"{prefix[:3]}***@{domain}"
                else:
                    masked_email = email

                result.append({
                    'id': u.id,
                    'full_name': u.fullname,
                    'avatar_url': u.avatar_url,
                    'email_masked': masked_email,
                    'tiene_finca': u.finca_id is not None
                })

            return APIResponse.success(data=result, message='Usuarios encontrados')
        except Exception as e:
            logger.error('Error en búsqueda de usuarios: %s', e)
            return APIResponse.error('Error interno', details={'error': str(e)})

@users_ns.route('/<int:user_id>/avatar')
class UserAvatarResource(Resource):
    @users_ns.doc('update_user_avatar', description='Actualizar foto de perfil del usuario', security=['Bearer'])
    @jwt_required()
    def patch(self, user_id):
        try:
            current_user_id = int(get_jwt().get('id'))
            if current_user_id != user_id and get_jwt().get('role') != 'Administrador':
                return APIResponse.forbidden('No puede cambiar el avatar de otro usuario')

            if 'file' not in flask.request.files:
                return APIResponse.validation_error({'file': 'No se proporcionó archivo'})

            file = flask.request.files['file']
            if not file or file.filename == '':
                return APIResponse.validation_error({'file': 'Archivo vacío'})

            # Validar tipo MIME
            if not file.content_type.startswith('image/'):
                return APIResponse.validation_error({'file': 'El archivo debe ser una imagen'})

            # Guardar archivo (usando un servicio de almacenamiento)
            from app.utils.file_storage import save_user_avatar
            avatar_url = save_user_avatar(user_id, file)

            user = User.query.get(user_id)
            user.avatar_url = avatar_url
            db.session.commit()

            return APIResponse.success(data={'avatar_url': avatar_url}, message='Avatar actualizado')
        except Exception as e:
            db.session.rollback()
            logger.error('Error actualizando avatar: %s', e)
            return APIResponse.error('Error interno', details={'error': str(e)})

    @users_ns.doc('delete_user_avatar', description='Eliminar foto de perfil del usuario', security=['Bearer'])
    @jwt_required()
    def delete(self, user_id):
        try:
            current_user_id = int(get_jwt().get('id'))
            if current_user_id != user_id and get_jwt().get('role') != 'Administrador':
                return APIResponse.forbidden('No puede eliminar el avatar de otro usuario')

            user = User.query.get(user_id)
            if user.avatar_url:
                # Opcional: eliminar archivo físico
                user.avatar_url = None
                db.session.commit()

            return APIResponse.success(message='Avatar eliminado')
        except Exception as e:
            db.session.rollback()
            return APIResponse.error('Error interno', details={'error': str(e)})

# Modelos Swagger para estadísticas...
user_role_stats_model = users_ns.model('UserRoleStats', {
    'count': fields.Integer,
    'percentage': fields.Float
})
user_status_stats_model = users_ns.model('UserStatusStats', {
    'active_users': fields.Integer,
    'inactive_users': fields.Integer,
    'total_users': fields.Integer,
    'active_percentage': fields.Float
})
user_roles_distribution_model = users_ns.model('UserRolesDistribution', {
    'roles': fields.Raw,  # Dict[str, {count, percentage}]
    'total_users': fields.Integer
})
user_statistics_model = users_ns.model('UserStatistics', {
    'total_users': fields.Integer,
    'role_distribution': fields.Raw,
    'status_distribution': fields.Raw
})

# Definir rutas personalizadas adicionales
@users_ns.route('/statistics')
class UserStatistics(Resource):
    @users_ns.doc('get_user_statistics', description='Estadísticas completas de usuarios', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            payload = get_user_statistics()
            return APIResponse.success(data=payload, message='Estadísticas completas de usuarios')
        except Exception as e:
            logger.error('Error obteniendo estadísticas de usuarios: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)




@users_ns.route('/<int:user_id>/activity')
class UserActivity(Resource):
    @users_ns.doc(
        'get_user_activity',
        description='Get paginated activity feed for a specific actor',
        security=['Bearer'],
        params={
            'page': 'Page number',
            'limit': 'Items per page',
            'per_page': 'Items per page (alias)',
            'entity': 'Filter by entity',
            'action': 'Filter by action',
            'severity': 'Filter by severity',
            'entity_id': 'Filter by entity id',
            'animal_id': 'Filter by animal id',
            'from': 'ISO datetime lower bound',
            'to': 'ISO datetime upper bound',
        }
    )
    @jwt_required()
    def get(self, user_id):
        page = flask.request.args.get('page', default=1, type=int) or 1
        limit = flask.request.args.get('limit', type=int) or flask.request.args.get('per_page', type=int) or 50

        query = build_user_activity_query(user_id, flask.request.args)
        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)
        items = [_format_activity_item(item) for item in pagination.items]

        return APIResponse.paginated_success(
            data=items,
            page=page,
            limit=int(limit),
            total_items=pagination.total,
            message='Actividad obtenida'
        )

@users_ns.route('/<int:user_id>/fincas')
class UserFincas(Resource):
    @users_ns.doc('get_user_fincas', description='Obtener fincas asociadas a un usuario', security=['Bearer'])
    @jwt_required()
    def get(self, user_id):
        try:
            # Obtener fincas del usuario
            fincas_raw = UserFinca.get_user_fincas(user_id, active_only=False)

            # Enriquecer con datos básicos de la finca
            fincas_enriched = []
            for f in fincas_raw:
                finca = Finca.query.get(f['finca_id'])
                if finca:
                    f['finca_name'] = finca.name
                    f['finca_type'] = finca.type.value if finca.type else None
                    f['finca_logo'] = finca.logo_url
                    fincas_enriched.append(f)

            return APIResponse.success(
                data={'fincas': fincas_enriched, 'count': len(fincas_enriched)},
                message='Fincas del usuario obtenidas'
            )
        except Exception as e:
            logger.error('Error obteniendo fincas del usuario %s: %s', user_id, e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

@users_ns.route('/global')
class GlobalUsersResource(Resource):
    @users_ns.doc('get_global_users', description='[ADMIN] Obtener todos los usuarios del sistema con sus fincas', security=['Bearer'])
    @jwt_required()
    def get(self):
        """
        Vista global para Administrador General.
        OPTIMIZADO: una sola consulta SQL + carga en bloque de UserFinca (sin N+1).
        """
        try:
            jwt_data = get_jwt()
            from app.utils.tenant_context import is_system_admin_identity
            if not is_system_admin_identity(jwt_data.get('role'), jwt_data.get('identification')):
                return APIResponse.error('No tiene permisos para acceder a la vista global', status_code=403)

            from sqlalchemy.orm import joinedload

            # ── 1) Un solo SELECT con JOIN a Finca ──────────────────────────────────────────
            users = (
                db.session.query(User)
                .options(joinedload(User.finca))
                .all()
            )

            if not users:
                return APIResponse.success(data=[], message='No hay usuarios registrados')

            user_ids = [u.id for u in users]

            # ── 2) Un solo SELECT de UserFinca para todos los usuarios (con JOIN a Finca) ──
            uf_rows = (
                db.session.query(UserFinca)
                .options(joinedload(UserFinca.finca))
                .filter(UserFinca.user_id.in_(user_ids))
                .all()
            )

            # Indexar por user_id para lookup O(1)
            uf_by_user: dict = {}
            for uf in uf_rows:
                uf_by_user.setdefault(uf.user_id, []).append(uf)

            # ── 3) Construir respuesta sin queries adicionales ───────────────────────────
            result = []
            for user in users:
                user_data = user.to_namespace_dict()
                fincas_enriched = []
                associated_finca_ids = set()
                for uf in uf_by_user.get(user.id, []):
                    if uf.finca:
                        associated_finca_ids.add(uf.finca.id)
                        fincas_enriched.append({
                            'id': uf.finca.id,
                            'name': uf.finca.name,
                            'type': uf.finca.type.value if uf.finca.type else None,
                            'role': uf.role,
                            'is_active': uf.is_active,
                            'is_primary': uf.is_primary,
                        })
                # Compatibilidad con instalaciones anteriores a UserFinca:
                # una finca directa también debe verse en el catálogo maestro.
                if user.finca and user.finca.id not in associated_finca_ids:
                    fincas_enriched.append({
                        'id': user.finca.id,
                        'name': user.finca.name,
                        'type': user.finca.type.value if user.finca.type else None,
                        'role': getattr(user.role, 'value', str(user.role)),
                        'is_active': bool(user.status),
                        'is_primary': True,
                    })
                user_data['fincas'] = fincas_enriched
                result.append(user_data)

            return APIResponse.success(
                data=result,
                message=f'Se obtuvieron {len(result)} usuarios globalmente'
            )
        except Exception as e:
            logger.error('Error en vista global de usuarios: %s', e, exc_info=True)
            return APIResponse.error('Error al obtener vista global', details={'error': str(e)}, status_code=500)

@users_ns.route('/<int:user_id>/approval-status')
class UserApprovalStatus(Resource):
    @users_ns.doc(
        'update_approval_status',
        description='Cambiar el estado de aprobación de un usuario (Administrador/Instructor/Propietario)',
        security=['Bearer']
    )
    @jwt_required()
    def patch(self, user_id):
        try:
            jwt_data = get_jwt()
            current_role = jwt_data.get('role')
            current_user_id = int(jwt_data.get('id', 0))

            if current_role not in ('Administrador', 'Instructor', 'Propietario'):
                return APIResponse.forbidden(
                    'Se requiere rol de Administrador, Instructor o Propietario para esta operación'
                )

            data = flask.request.get_json() or {}
            new_status = data.get('approval_status')

            if not new_status or new_status not in ('Approved', 'Rejected', 'Suspended'):
                return APIResponse.validation_error(
                    {'approval_status': 'Debe ser Approved, Rejected o Suspended'}
                )

            target_user = User.query.get(user_id)
            if not target_user:
                return APIResponse.not_found('Usuario no encontrado')

            from app.models.user import ApprovalStatus
            old_status = str(target_user.approval_status.value) if target_user.approval_status else 'None'
            target_user.approval_status = ApprovalStatus(new_status)
            if new_status == 'Approved':
                target_user.status = True
            elif new_status in ('Rejected', 'Suspended'):
                target_user.status = False

            db.session.commit()

            logger.info(
                'Usuario %s (ID:%d) cambió approval_status de %s a %s',
                jwt_data.get('fullname'), current_user_id,
                old_status, new_status
            )

            return APIResponse.success(
                data=target_user.to_namespace_dict(),
                message=f'Usuario {"aprobado" if new_status == "Approved" else "rechazado"} exitosamente'
            )
        except Exception as e:
            db.session.rollback()
            logger.error('Error al actualizar approval_status: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)


@users_ns.route('/status')
class UserStatusStats(Resource):
    @users_ns.doc('get_user_status_stats', description='Resumen de usuarios por estado', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            return APIResponse.success(data=get_user_status_stats(), message='Estadísticas de estado de usuarios')
        except Exception as e:
            logger.error('Error obteniendo estadísticas de estado: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

@users_ns.route('/roles')
class UserRolesStats(Resource):
    @users_ns.doc('get_user_roles_stats', description='Distribución de usuarios por roles', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            return APIResponse.success(data=get_user_roles_stats(), message='Distribución por roles')
        except Exception as e:
            logger.error('Error obteniendo estadísticas de roles: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

# Ruta pública opcional para crear usuarios iniciales cuando no existe autenticación todavía
@users_ns.route('/public', endpoint='users_public_create')
class UserPublicCreate(Resource):
    @users_ns.doc('public_create_user', description='Crear un usuario sin autenticacion (habilitado por defecto; se puede desactivar con PUBLIC_USER_CREATION_ENABLED=false). Si no existe ninguna finca, se crea una automáticamente.')
    def post(self):
        try:
            data = flask.request.get_json() or {}
            missing = [f for f in ['identification','fullname','password','email','phone','role'] if f not in data]
            if missing:
                return APIResponse.validation_error({m: 'Requerido' for m in missing})

            # Asignar finca_id como None para que el usuario pueda seleccionar o crear su finca
            data['finca_id'] = None

            # Forzar hashing de contraseña usando método del modelo
            password_raw = data.pop('password')
            password_confirmation = data.pop('password_confirmation', None)
            if password_confirmation is not None and password_confirmation != password_raw:
                return APIResponse.validation_error({'password_confirmation': 'No coincide'})

            # Crear usuario con aprobación automática si es el primer usuario
            existing_users = User.query.count()
            from app.models.user import ApprovalStatus
            if existing_users == 0:
                data['approval_status'] = ApprovalStatus.Approved
                data['status'] = True

            # Usar el método create de User para que sincronice con UserFinca automáticamente
            data['password'] = password_raw
            user = User.create(commit=True, **data)

            logger.info(f"Usuario público creado: {user.email} (Sin finca asociada)")

            # Notificar a administradores sobre el nuevo usuario
            try:
                from app.services.push_notification_service import PushNotificationService
                from app.services.event_service import EventService
                from app.models.user import Role
                from app.models.user_finca import UserFinca

                role_val = user.role
                role_display = role_val.value if hasattr(role_val, 'value') else str(role_val)
                user_name = user.fullname or 'Un usuario'

                # 1. Obtener IDs únicos de destinatarios (Administrador principal e Instructores de la finca)
                target_user_ids = set()

                # Administradores del sistema globalmente
                global_admins = User.query.filter(User.role == Role.Administrador).all()
                for ga in global_admins:
                    target_user_ids.add(ga.id)

                # Sin finca inicial, solo notificar a admins globales

                logger.info(f"Enviando alertas de registro a {len(target_user_ids)} destinatarios (Admin global)")

                # 2. Despachar notificaciones y eventos a cada destinatario
                for target_uid in target_user_ids:
                    # Web Push
                    PushNotificationService.send_to_user(
                        user_id=target_uid,
                        title='Nuevo Usuario Registrado',
                        body=f'{user_name} se ha registrado como {role_display}.',
                        tag='new-user',
                        data={'type': 'new_user', 'user_id': user.id, 'url': '/admin/users'}
                    )
                    
                    # Evento en tiempo real (SSE)
                    EventService.emit_to_user(
                        user_id=target_uid,
                        event_type="new_user",
                        data={
                            "title": "Nuevo Usuario Registrado",
                            "message": f'{user_name} se ha registrado como {role_display}.',
                            "type": "info",
                            "action": {
                                "label": "Ver Usuarios",
                                "url": "/admin/users"
                            }
                        }
                    )
            except Exception as e:
                logger.warning(f"No se pudo enviar notificación de nuevo usuario: {e}")

            return APIResponse.created(user.to_namespace_dict(), message='Usuario creado exitosamente')
        except ValidationError as e:
            db.session.rollback()
            errors = e.errors if getattr(e, 'errors', None) else {}
            if not errors and getattr(e, 'field', None):
                errors = {e.field: e.message}
            if not errors:
                errors = {'general': str(e)}
            return APIResponse.validation_error(errors)
        except IntegrityError as ie:
            db.session.rollback()
            import re
            msg = str(getattr(ie, 'orig', ie))
            value = None
            key_name = None
            cols = []
            
            # MySQL
            m = re.search(r"Duplicate entry '(.+?)' for key '(.+?)'", msg, flags=re.IGNORECASE)
            if m:
                value = m.group(1)
                key_name = m.group(2)
            else:
                # SQLite
                m2 = re.search(r"UNIQUE constraint failed: (.+)", msg, flags=re.IGNORECASE)
                if m2:
                    key_name = m2.group(1)
                else:
                    # PostgreSQL
                    m3 = re.search(r"duplicate key value violates unique constraint \"(.+?)\"", msg, flags=re.IGNORECASE)
                    if m3:
                        key_name = m3.group(1)
                        m_val = re.search(r"Key \((.+?)\)=\((.+?)\) already exists", msg, flags=re.IGNORECASE)
                        if m_val:
                            cols = [m_val.group(1)]
                            value = m_val.group(2)

            if not cols and key_name:
                try:
                    for col in User.__table__.columns:
                        if col.name in key_name:
                            cols.append(col.name)
                except Exception:
                    pass
            if not cols:
                unique_fields = getattr(User, '_unique_fields', []) or []
                for uf in unique_fields:
                    if uf in (key_name or '') or uf in msg:
                        cols.append(uf)
            labels = {'email': 'correo', 'identification': 'número de identificación', 'phone': 'teléfono'}
            if cols:
                if len(cols) == 1:
                    field = cols[0]
                    label = labels.get(field, field)
                    friendly = f"Ya existe un usuario con ese {label}. Cambia el {label}."
                    return APIResponse.conflict(friendly, details={'conflict': {'field': field, 'label': label, 'value': value, 'key': key_name, 'suggestion': f"Cambia el {label} por otro que no esté registrado."}})
                else:
                    friendly = "Ya existe un usuario con esa combinación de datos. Modifica uno de esos campos."
                    return APIResponse.conflict(friendly, details={'conflict': {'fields': cols, 'value': value, 'key': key_name, 'suggestion': "Modifica al menos uno de los campos para que la combinación sea única."}})
            return APIResponse.conflict('Violación de unicidad', details={'error': msg})
        except Exception as e:
            db.session.rollback()
            logger.error('Error en creación pública de usuario: %s', e, exc_info=True)
            return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)
