"""
Multi-Finca Namespace
=====================

Endpoints para gestionar múltiples fincas por usuario:
- Listar fincas del usuario autenticado
- Cambiar de finca activa
- Verificar acceso a finca

Uso:
    GET  /api/v1/multi-finca/my-fincas      - Listar mis fincas
    POST /api/v1/multi-finca/switch        - Cambiar finca activa
    GET  /api/v1/multi-finca/current       - Obtener finca actual
"""

import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

from app.utils.response_handler import APIResponse
from app.models import UserFinca, User, Finca, Role, FarmType, get_default_role_for_finca
from app.extensions import db
import logging

logger = logging.getLogger(__name__)

# Namespace
multi_finca_ns = Namespace('multi-finca', description='Gestión multi-finca por usuario')

# =============================================================================
# Modelos para documentación Swagger
# =============================================================================

finca_summary_model = multi_finca_ns.model('FincaSummary', {
    'id': fields.Integer(description='ID de la relación user_finca'),
    'finca_id': fields.Integer(description='ID de la finca'),
    'finca_name': fields.String(description='Nombre de la finca'),
    'finca_type': fields.String(description='Tipo: Educativa o Tradicional'),
    'role': fields.String(description='Rol del usuario en la finca'),
    'is_active': fields.Boolean(description='Si la relación está activa'),
    'is_primary': fields.Boolean(description='Si es la finca activa/primary'),
})

switch_finca_model = multi_finca_ns.model('SwitchFincaRequest', {
    'finca_id': fields.Integer(required=True, description='ID de la finca a activar'),
})

current_finca_model = multi_finca_ns.model('CurrentFincaResponse', {
    'finca_id': fields.Integer(description='ID de la finca activa'),
    'finca_name': fields.String(description='Nombre de la finca'),
    'finca_type': fields.String(description='Tipo de finca'),
    'role': fields.String(description='Rol actual en la finca'),
})

switch_response_model = multi_finca_ns.model('SwitchFincaResponse', {
    'message': fields.String(description='Mensaje de éxito'),
    'finca': fields.Nested(finca_summary_model, description='Datos de la finca activada'),
    'access_token': fields.String(description='Nuevo token JWT'),
})


# =============================================================================
# Endpoints
# =============================================================================

@multi_finca_ns.route('/my-fincas')
class MyFincasResource(Resource):
    """Obtener todas las fincas del usuario autenticado."""

    @jwt_required()
    @multi_finca_ns.doc('list_user_fincas', security='jwt')
    @multi_finca_ns.response(200, 'Lista de fincas', [finca_summary_model])
    @multi_finca_ns.response(401, 'No autenticado')
    def get(self):
        """
        Listar fincas del usuario autenticado.

        Retorna todas las fincas a las que el usuario tiene acceso,
        incluyendo el rol en cada una y cuál es la activa.
        """
        try:
            user_id = get_jwt_identity()

            # Convertir a int si es string
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            # Obtener fincas del usuario
            fincas = UserFinca.get_user_fincas(user_id, active_only=True)

            # Agregar información adicional
            for f in fincas:
                finca = Finca.query.get(f['finca_id'])
                if finca:
                    f['finca_logo'] = finca.logo_url
                    f['department'] = finca.department
                    f['municipality'] = finca.municipality

            return APIResponse.success(
                message='Fincas obtenidas exitosamente',
                data={
                    'fincas': fincas,
                    'count': len(fincas),
                    'is_multi_finca': len(fincas) > 1,
                }
            )

        except Exception as e:
            logger.error(f'Error al listar fincas: {e}', exc_info=True)
            return APIResponse.error(
                'Error al obtener fincas',
                details={'error': str(e)},
                status_code=500
            )


@multi_finca_ns.route('/current')
class CurrentFincaResource(Resource):
    """Obtener la finca activa del usuario."""

    @jwt_required()
    @multi_finca_ns.doc('get_current_finca', security='jwt')
    @multi_finca_ns.response(200, 'Finca actual', current_finca_model)
    @multi_finca_ns.response(401, 'No autenticado')
    @multi_finca_ns.response(404, 'No tiene finca asignada')
    def get(self):
        """
        Obtener la finca activa/principal del usuario.

        Retorna la información de la finca que está actualmente activa
        en el contexto del usuario.
        """
        try:
            user_id = get_jwt_identity()
            jwt_data = get_jwt()

            # Convertir a int
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            # Obtener finca activa
            active_finca = UserFinca.get_active_finca(user_id)

            if not active_finca:
                return APIResponse.error(
                    'No tiene finca asignada',
                    status_code=404
                )

            # Verificar consistencia con JWT
            jwt_finca_id = jwt_data.get('finca_id')

            return APIResponse.success(
                message='Finca actual obtenida',
                data={
                    **active_finca,
                    'jwt_finca_id': jwt_finca_id,
                    'consistent': jwt_finca_id == active_finca['finca_id'],
                }
            )

        except Exception as e:
            logger.error(f'Error al obtener finca actual: {e}', exc_info=True)
            return APIResponse.error(
                'Error al obtener finca actual',
                details={'error': str(e)},
                status_code=500
            )


@multi_finca_ns.route('/switch')
class SwitchFincaResource(Resource):
    """Cambiar la finca activa del usuario."""

    @jwt_required()
    @multi_finca_ns.doc('switch_finca', security='jwt')
    @multi_finca_ns.expect(switch_finca_model)
    @multi_finca_ns.response(200, 'Finca cambiada', switch_response_model)
    @multi_finca_ns.response(400, 'Datos inválidos')
    @multi_finca_ns.response(401, 'No autenticado')
    @multi_finca_ns.response(403, 'No tiene acceso a esta finca')
    @multi_finca_ns.response(404, 'Finca no encontrada')
    def post(self):
        """
        Cambiar la finca activa del usuario.

        Actualiza la finca activa del usuario y genera un nuevo token JWT
        con los claims actualizados de la nueva finca.

        El cliente debe usar el nuevo access_token para las siguientes peticiones.
        """
        from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies
        import flask

        try:
            data = flask.request.get_json() or {}
            target_finca_id = data.get('finca_id')

            if not target_finca_id:
                return APIResponse.validation_error({
                    'finca_id': 'Requerido. ID de la finca a activar.'
                })

            # Convertir a int
            try:
                target_finca_id = int(target_finca_id)
            except (ValueError, TypeError):
                return APIResponse.validation_error({
                    'finca_id': 'Debe ser un número entero válido'
                })

            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            # Verificar que el usuario existe
            user = User.query.get(user_id)
            if not user:
                return APIResponse.error('Usuario no encontrado', status_code=404)

            # Verificar que la finca existe
            target_finca = Finca.query.get(target_finca_id)
            if not target_finca:
                return APIResponse.error(
                    'Finca no encontrada',
                    status_code=404,
                    error_code='FINCA_NOT_FOUND'
                )

            # Verificar que el usuario tiene acceso a la finca
            if not UserFinca.has_access(user_id, target_finca_id):
                logger.warning(
                    f'Usuario {user_id} intentó acceder a finca {target_finca_id} sin permiso'
                )
                return APIResponse.error(
                    'No tiene acceso a esta finca',
                    status_code=403,
                    error_code='ACCESS_DENIED'
                )

            # Obtener rol en la finca destino
            role_in_finca = UserFinca.get_role_in_finca(user_id, target_finca_id)

            # Cambiar finca activa
            success = UserFinca.set_active_finca(user_id, target_finca_id)

            if not success:
                return APIResponse.error(
                    'No se pudo cambiar la finca activa',
                    status_code=500
                )

            # Generar nuevos tokens JWT con los claims actualizados
            user_claims = {
                'id': user.id,
                'identification': user.identification,
                'role': role_in_finca or user.role.value,
                'fullname': user.fullname,
                'finca_id': target_finca_id,
                'finca_type': target_finca.type.value if target_finca.type else 'Educativa',
            }

            identity = str(user.id)
            new_access_token = create_access_token(
                identity=identity,
                additional_claims=user_claims
            )
            new_refresh_token = create_refresh_token(
                identity=identity,
                additional_claims=user_claims
            )

            logger.info(
                f'Usuario {user_id} cambió a finca {target_finca_id} '
                f'(rol: {role_in_finca})'
            )

            api_response_dict, status_code = APIResponse.success(
                message=f'Cambiado a {target_finca.name} exitosamente',
                data={
                    'finca': {
                        'id': None,  # Se actualizará después
                        'finca_id': target_finca_id,
                        'finca_name': target_finca.name,
                        'finca_type': target_finca.type.value if target_finca.type else None,
                        'role': role_in_finca,
                        'is_active': True,
                        'is_primary': True,
                    },
                    'access_token': new_access_token,
                    'refresh_token': new_refresh_token,
                    'token_type': 'Bearer',
                }
            )

            resp = flask.jsonify(api_response_dict)
            set_access_cookies(resp, new_access_token)
            set_refresh_cookies(resp, new_refresh_token)
            resp.status_code = status_code
            return resp

        except Exception as e:
            logger.error(f'Error al cambiar finca: {e}', exc_info=True)
            return APIResponse.error(
                'Error al cambiar de finca',
                details={'error': str(e)},
                status_code=500
            )


@multi_finca_ns.route('/check-access/<int:finca_id>')
class CheckAccessResource(Resource):
    """Verificar si el usuario tiene acceso a una finca específica."""

    @jwt_required()
    @multi_finca_ns.doc('check_finca_access', security='jwt')
    @multi_finca_ns.response(200, 'Resultado de verificación')
    @multi_finca_ns.response(401, 'No autenticado')
    def get(self, finca_id: int):
        """
        Verificar si el usuario autenticado tiene acceso a una finca.

        Útil para validar antes de intentar operaciones en una finca específica.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            has_access = UserFinca.has_access(user_id, finca_id)
            role = None

            if has_access:
                role = UserFinca.get_role_in_finca(user_id, finca_id)

            # Obtener finca activa para comparar
            active_finca = UserFinca.get_active_finca(user_id)
            is_active = active_finca and active_finca['finca_id'] == finca_id

            return APIResponse.success(
                message='Verificación completada',
                data={
                    'finca_id': finca_id,
                    'has_access': has_access,
                    'role': role,
                    'is_active_finca': is_active,
                }
            )

        except Exception as e:
            logger.error(f'Error al verificar acceso: {e}', exc_info=True)
            return APIResponse.error(
                'Error al verificar acceso',
                details={'error': str(e)},
                status_code=500
            )


@multi_finca_ns.route('/create')
class CreateFincaResource(Resource):
    """Crear una nueva finca como usuario existente (logueado)."""

    create_finca_model = multi_finca_ns.model('CreateFincaRequest', {
        'name': fields.String(required=True, description='Nombre de la finca', example='Mi Nueva Finca'),
        'type': fields.String(required=True, description='Tipo: Educativa o Tradicional', example='Tradicional'),
        'nit': fields.String(required=False, description='NIT de la finca', example='123456789-0'),
        'department': fields.String(required=False, description='Departamento', example='Santander'),
        'municipality': fields.String(required=False, description='Municipio', example='Bucaramanga'),
        'address': fields.String(required=False, description='Dirección', example='Vereda El Carmen'),
    })

    create_finca_response = multi_finca_ns.model('CreateFincaResponse', {
        'finca_id': fields.Integer(description='ID de la nueva finca'),
        'finca_name': fields.String(description='Nombre de la finca'),
        'finca_type': fields.String(description='Tipo de finca'),
        'role': fields.String(description='Rol asignado al usuario creador'),
        'message': fields.String(description='Mensaje informativo'),
    })

    @jwt_required()
    @multi_finca_ns.doc('create_finca', security='jwt',
                        description='Crear una nueva finca como usuario existente. '
                                    'El usuario se asigna como Propietario (Tradicional) o '
                                    'Administrador (Educativa). La finca activa no cambia automáticamente.')
    @multi_finca_ns.expect(create_finca_model)
    @multi_finca_ns.response(201, 'Finca creada exitosamente', create_finca_response)
    @multi_finca_ns.response(400, 'Datos inválidos')
    @multi_finca_ns.response(401, 'No autenticado')
    def post(self):
        """
        Crear una nueva finca como usuario existente.

        El usuario autenticado registra una nueva finca y se asigna como
        Propietario (Tradicional) o Administrador (Educativa) según el tipo.
        La finca activa del usuario NO cambia automáticamente; debe usar
        el endpoint /switch para activarla si lo desea.
        """
        try:
            data = flask.request.get_json() or {}
            name = data.get('name')
            finca_type_str = data.get('type')

            # Validaciones
            errors = {}
            if not name or not name.strip():
                errors['name'] = 'El nombre de la finca es requerido'
            if not finca_type_str:
                errors['type'] = 'El tipo de finca es requerido'
            elif finca_type_str not in ['Educativa', 'Tradicional']:
                errors['type'] = 'Debe ser "Educativa" o "Tradicional"'

            if errors:
                return APIResponse.validation_error(errors)

            name = name.strip()

            # Obtener usuario autenticado
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            user = User.query.get(user_id)
            if not user:
                return APIResponse.error('Usuario no encontrado', status_code=404)

            # Verificar que no exista finca con el mismo nombre
            existing = Finca.query.filter_by(name=name).first()
            if existing:
                return APIResponse.validation_error({
                    'name': f'Ya existe una finca con el nombre "{name}"'
                })

            # Determinar rol por defecto según tipo de finca
            default_role_str = get_default_role_for_finca(finca_type_str)
            try:
                finca_type = FarmType(finca_type_str)
            except ValueError:
                return APIResponse.validation_error({
                    'type': f'Tipo inválido: {finca_type_str}'
                })

            # Crear finca manualmente (no usar Finca.create() para evitar
            # que el bloque JWT interno marque is_primary=True automáticamente)
            finca = Finca(
                name=name,
                type=finca_type,
                nit=data.get('nit'),
                department=data.get('department'),
                municipality=data.get('municipality'),
                address=data.get('address'),
                is_active=True,
            )
            db.session.add(finca)
            db.session.flush()

            # Asignar usuario creador como propietario/administrador
            # is_primary=False para no cambiar la finca activa actual
            UserFinca.assign(
                user_id=user.id,
                finca_id=finca.id,
                role=default_role_str,
                is_active=True,
                is_primary=False,
                commit=False
            )

            db.session.commit()

            # Sembrar configuraciones por defecto
            try:
                from app.services.default_alert_configs import seed_default_configs_for_finca
                seed_default_configs_for_finca(finca.id)
            except Exception as e:
                logger.warning("Error al sembrar configs para finca %s: %s", finca.id, e)

            logger.info(
                f"Usuario {user.id} creó nueva finca: {finca.name} (ID: {finca.id}) "
                f"como {default_role_str}"
            )

            return APIResponse.success(
                message='Finca creada exitosamente',
                data={
                    'finca_id': finca.id,
                    'finca_name': finca.name,
                    'finca_type': finca.type.value,
                    'role': default_role_str,
                    'message': f'Finca "{finca.name}" creada. Puedes cambiar a ella desde Mis Fincas.',
                },
                status_code=201
            )

        except Exception as e:
            db.session.rollback()
            logger.error(f'Error al crear finca: {e}', exc_info=True)
            return APIResponse.error(
                'Error al crear la finca',
                details={'error': str(e)},
                status_code=500
            )


@multi_finca_ns.route('/invite-user')
class InviteUserResource(Resource):
    """
    Invitar/Agregar un usuario existente a una finca.
    Solo Administradores y Propietarios pueden usar este endpoint.
    """

    invite_model = multi_finca_ns.model('InviteUserRequest', {
        'user_id': fields.Integer(required=False, description='ID del usuario a invitar'),
        'email': fields.String(required=False, description='Email del usuario a invitar'),
        'finca_id': fields.Integer(required=True, description='ID de la finca'),
        'role': fields.String(required=True, description='Rol a asignar en la finca'),
    })

    @jwt_required()
    @multi_finca_ns.doc('invite_user_to_finca', security='jwt')
    @multi_finca_ns.expect(invite_model)
    @multi_finca_ns.response(201, 'Usuario agregado a la finca')
    @multi_finca_ns.response(403, 'No tiene permisos')
    @multi_finca_ns.response(404, 'Usuario o finca no encontrados')
    def post(self):
        """
        Agregar un usuario existente a una finca con un rol específico.

        Requiere ser Administrador o Propietario de la finca.
        """
        try:
            data = flask.request.get_json() or {}
            target_user_id = data.get('user_id')
            email = data.get('email')
            target_finca_id = data.get('finca_id')
            role = data.get('role')

            if not any([target_user_id, email]) or not all([target_finca_id, role]):
                return APIResponse.validation_error({
                    'user_id': 'Requerido si no se envía email',
                    'email': 'Requerido si no se envía user_id',
                    'finca_id': 'Requerido',
                    'role': 'Requerido',
                })

            # Verificar rol válido
            try:
                role_enum = Role(role)
            except ValueError:
                valid_roles = [r.value for r in Role]
                return APIResponse.validation_error({
                    'role': f'Rol inválido. Roles válidos: {valid_roles}'
                })

            # Obtener usuario autenticado
            current_user_id = get_jwt_identity()
            jwt_data = get_jwt()

            try:
                current_user_id = int(current_user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            # Verificar que el usuario autenticado pertenezca a la finca destino
            role_in_target = UserFinca.get_role_in_finca(current_user_id, target_finca_id)
            if not role_in_target:
                return APIResponse.error(
                    'No tiene acceso a esta finca',
                    status_code=403
                )

            # Solo Administradores y Propietarios pueden asignar usuarios directamente
            if role_in_target not in {'Administrador', 'Propietario'}:
                return APIResponse.error(
                    'No tienes permisos para agregar usuarios a esta finca',
                    status_code=403
                )

            # Buscar usuario si se proporcionó email
            target_user = None
            if target_user_id:
                target_user = User.query.get(target_user_id)
            elif email:
                target_user = User.query.filter_by(email=email.strip().lower()).first()
                if target_user:
                    target_user_id = target_user.id

            if not target_user:
                if email:
                    return APIResponse.error(
                        f'No se encontró ningún usuario con el correo {email}. '
                        'El usuario debe estar registrado en el sistema primero.',
                        status_code=404
                    )
                return APIResponse.error('Usuario no encontrado', status_code=404)

            # Verificar que la finca existe
            finca = Finca.query.get(target_finca_id)
            if not finca:
                return APIResponse.error('Finca no encontrada', status_code=404)

            # Verificar que el rol es válido para el tipo de finca
            from app.models.user import is_role_valid_for_finca
            if not is_role_valid_for_finca(role, finca.type.value):
                return APIResponse.validation_error({
                    'role': f'Rol {role} no es válido para finca {finca.type.value}'
                })

            # Crear la asignación
            membership = UserFinca.assign(
                user_id=target_user_id,
                finca_id=target_finca_id,
                role=role,
                is_active=True,
                is_primary=False  # El usuario decide cuál es su finca primary
            )

            logger.info(
                f'Usuario {current_user_id} agregó usuario {target_user_id} '
                f'a finca {target_finca_id} con rol {role}'
            )

            return APIResponse.success(
                message=f'{target_user.fullname} agregado a {finca.name} como {role}',
                data=membership.to_dict(),
                status_code=201
            )

        except Exception as e:
            logger.error(f'Error al invitar usuario: {e}', exc_info=True)
            return APIResponse.error(
                'Error al invitar usuario',
                details={'error': str(e)},
                status_code=500
            )


@multi_finca_ns.route('/compare-kpis')
class CompareKPIsResource(Resource):
    """Comparar KPIs básicos entre todas las fincas del usuario."""

    @jwt_required()
    @multi_finca_ns.doc('compare_fincas_kpis', security='jwt')
    def get(self):
        """
        Obtener un reporte comparativo de KPIs entre las fincas del usuario.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error('ID de usuario inválido', status_code=400)

            fincas = UserFinca.get_user_fincas(user_id, active_only=True)
            results = []

            for f in fincas:
                f_id = f['finca_id']

                # Importaciones locales para evitar problemas circulares
                from app.models.animals import Animals, AnimalStatus, Sex
                from app.models.milk_production import MilkProduction
                from app.models.financial import Transaction, TransactionType
                from app.models.fields import Fields
                from sqlalchemy import func

                # Obtener finca
                finca = Finca.query.get(f_id)
                if not finca:
                    continue

                # Calcular KPIs básicos
                total_animals = Animals.query.filter_by(finca_id=f_id, status=AnimalStatus.Vivo).count()
                total_animals_males = Animals.query.filter_by(finca_id=f_id, status=AnimalStatus.Vivo, sex=Sex.Macho).count()
                total_animals_females = Animals.query.filter_by(finca_id=f_id, status=AnimalStatus.Vivo, sex=Sex.Hembra).count()

                total_milk = db.session.query(func.sum(MilkProduction.liters)).filter_by(finca_id=f_id).scalar() or 0.0

                total_income = db.session.query(func.sum(Transaction.amount)).filter_by(finca_id=f_id, transaction_type=TransactionType.Income).scalar() or 0.0
                total_expenses = db.session.query(func.sum(Transaction.amount)).filter_by(finca_id=f_id, transaction_type=TransactionType.Expense).scalar() or 0.0

                # Potreros
                total_fields = Fields.query.filter_by(finca_id=f_id).count()
                fields = Fields.query.filter_by(finca_id=f_id).all()
                total_fields_area = sum([f.area_num for f in fields])

                results.append({
                    'finca_id': f_id,
                    'finca_name': finca.name,
                    'finca_type': finca.type.value if finca.type else 'Educativa',
                    'department': finca.department or '',
                    'municipality': finca.municipality or '',
                    'role': f.get('role', 'Operario'),
                    'kpis': {
                        'total_animals': total_animals,
                        'total_animals_males': total_animals_males,
                        'total_animals_females': total_animals_females,
                        'total_milk_liters': float(total_milk),
                        'total_income': float(total_income),
                        'total_expenses': float(total_expenses),
                        'total_fields': total_fields,
                        'total_fields_area': float(total_fields_area)
                    }
                })

            return APIResponse.success(
                message='KPIs comparativos generados exitosamente',
                data=results
            )

        except Exception as e:
            logger.error(f'Error comparando KPIs: {e}', exc_info=True)
            return APIResponse.error(
                'Error al comparar KPIs',
                details={'error': str(e)},
                status_code=500
            )

