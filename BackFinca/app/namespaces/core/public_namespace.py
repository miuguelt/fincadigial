"""
Public Namespace - Registro de Fincas
=======================================
Endpoint público para registro de nuevas fincas y sus administradores/propietarios.

POST /api/v1/public/register
    Registra una nueva finca con su primer usuario (admin/propietario).
    Retorna tokens JWT para acceso inmediato.
"""

from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import create_access_token, create_refresh_token
from app import db
from app.models import Finca, FarmType, User, Role, get_default_role_for_finca
from app.models.base_model import ValidationError
from app.utils.response_handler import APIResponse
from app.utils.validators import validate_password
import logging

logger = logging.getLogger(__name__)

# Crear namespace
public_ns = Namespace(
    'public',
    description='Registro público de nuevas fincas',
    path='/public'
)

# Modelos para documentación
finca_model = public_ns.model('FincaInput', {
    'name': fields.String(required=True, description='Nombre de la finca', example='Mi Finca'),
    'type': fields.String(required=True, description='Tipo: Educativa o Tradicional', example='Tradicional'),
    'nit': fields.String(required=False, description='NIT de la finca', example='123456789-0'),
    'department': fields.String(required=False, description='Departamento', example='Santander'),
    'municipality': fields.String(required=False, description='Municipio', example='Bucaramanga'),
    'address': fields.String(required=False, description='Dirección', example='Vereda El Carmen'),
})

owner_model = public_ns.model('OwnerInput', {
    'identification': fields.Integer(required=True, description='Número de identificación', example=123456789),
    'fullname': fields.String(required=True, description='Nombre completo', example='Juan Pérez'),
    'email': fields.String(required=True, description='Correo electrónico', example='juan@example.com'),
    'phone': fields.String(required=True, description='Teléfono', example='3001234567'),
    'password': fields.String(required=True, description='Contraseña (mínimo 8 caracteres)', example='SecurePass123!'),
    'address': fields.String(required=False, description='Dirección del usuario'),
    'professional_card': fields.String(required=False, description='Tarjeta Profesional (para Veterinarios)'),
    'professional_specialty': fields.String(required=False, description='Especialidad profesional'),
    'habeas_data_accepted': fields.Boolean(required=False, default=False, description='Aceptación de Habeas Data'),
    'terms_accepted': fields.Boolean(required=False, default=False, description='Aceptación de Términos y Salvedades Legales'),
})

register_model = public_ns.model('RegisterRequest', {
    'finca': fields.Nested(finca_model, required=True, description='Datos de la finca'),
    'owner': fields.Nested(owner_model, required=True, description='Datos del propietario/administrador'),
})

finca_response = public_ns.model('FincaResponse', {
    'id': fields.Integer,
    'name': fields.String,
    'type': fields.String,
    'nit': fields.String,
    'department': fields.String,
    'municipality': fields.String,
    'address': fields.String,
    'is_active': fields.Boolean,
})

user_response = public_ns.model('UserResponse', {
    'id': fields.Integer,
    'identification': fields.Integer,
    'fullname': fields.String,
    'email': fields.String,
    'phone': fields.String,
    'role': fields.String,
    'finca_id': fields.Integer,
})

register_response = public_ns.model('RegisterResponse', {
    'message': fields.String,
    'finca': fields.Nested(finca_response),
    'user': fields.Nested(user_response),
    'access_token': fields.String,
    'token_type': fields.String(default='Bearer'),
})


@public_ns.route('/register')
class RegisterFincaResource(Resource):
    """Registro público de nuevas fincas con su primer usuario."""

    @public_ns.doc('register_finca', description='Registrar una nueva finca con su administrador/propietario.', security=[])
    @public_ns.expect(register_model)
    @public_ns.response(201, 'Finca creada exitosamente', register_response)
    @public_ns.response(400, 'Datos inválidos')
    @public_ns.response(409, 'Conflicto: email o identificación ya existen')
    def post(self):
        """
        Registrar una nueva finca con su primer usuario.

        El rol del usuario se asigna automáticamente según el tipo de finca:
        - Educativa -> Administrador
        - Tradicional -> Propietario
        """
        data = flask.request.get_json() or {}
        finca_data = data.get('finca', {})
        owner_data = data.get('owner', {})

        # Validaciones básicas
        errors = {}
        if not finca_data:
            errors['finca'] = 'Requerido'
        if not owner_data:
            errors['owner'] = 'Requerido'

        if errors:
            return APIResponse.validation_error(errors)

        # Validar tipo de finca
        finca_type_str = finca_data.get('type')
        if finca_type_str not in ['Educativa', 'Tradicional']:
            return APIResponse.validation_error({
                'finca.type': 'Debe ser "Educativa" o "Tradicional"'
            })

        # Determinar rol automáticamente según tipo de finca
        default_role = get_default_role_for_finca(finca_type_str)

        try:
            # Convertir tipo a enum
            finca_type = FarmType(finca_type_str)
        except ValueError:
            return APIResponse.validation_error({
                'finca.type': f'Tipo inválido: {finca_type_str}'
            })

        # Validar que no exista usuario con mismo email o identification
        existing_user = User.query.filter(
            (User.email == owner_data.get('email')) |
            (User.identification == owner_data.get('identification'))
        ).first()

        if existing_user:
            conflict_fields = []
            if existing_user.email == owner_data.get('email'):
                conflict_fields.append('email')
            if existing_user.identification == owner_data.get('identification'):
                conflict_fields.append('identification')
            return APIResponse.error(
                message=f'Usuario ya existe con: {", ".join(conflict_fields)}',
                status_code=409,
                error_code='USER_EXISTS'
            )

        # Validar contraseña
        try:
            validate_password(owner_data.get('password', ''), field_name='owner.password')
        except Exception as e:
            return APIResponse.validation_error({
                'owner.password': str(e)
            })

        # Crear finca y usuario en transacción atómica
        try:
            # 1. Crear la finca
            finca = Finca.create(
                name=finca_data.get('name'),
                type=finca_type,
                nit=finca_data.get('nit'),
                department=finca_data.get('department'),
                municipality=finca_data.get('municipality'),
                address=finca_data.get('address'),
                is_active=True
            )

            # 2. Crear el usuario con rol correspondiente
            # El propietario/administrador que registra su propia finca
            # se auto-aprueba: no necesita validación de un admin externo.
            from app.models.user import ApprovalStatus
            from datetime import datetime

            habeas = bool(owner_data.get('habeas_data_accepted', False))
            terms = bool(owner_data.get('terms_accepted', False))

            user = User.create(
                identification=owner_data.get('identification'),
                fullname=owner_data.get('fullname'),
                email=owner_data.get('email'),
                phone=owner_data.get('phone'),
                password=owner_data.get('password'),
                address=owner_data.get('address'),
                role=Role(default_role),
                status=True,
                finca_id=finca.id,
                approval_status=ApprovalStatus.Approved,
                professional_card=owner_data.get('professional_card'),
                professional_specialty=owner_data.get('professional_specialty'),
                habeas_data_accepted=habeas,
                habeas_data_accepted_at=datetime.utcnow() if habeas else None,
                terms_accepted=terms,
                terms_accepted_at=datetime.utcnow() if terms else None,
            )

            # 3. Generar tokens JWT
            user_claims = {
                'id': user.id,
                'identification': user.identification,
                'role': user.role.value,
                'fullname': user.fullname,
                'finca_id': finca.id,
                'finca_type': finca.type.value,
            }

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=user_claims
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                additional_claims=user_claims
            )

            logger.info(f"Nueva finca registrada: {finca.name} (ID: {finca.id}) por usuario {user.email}")

            return APIResponse.success(
                message='Finca registrada exitosamente',
                data={
                    'finca': finca.to_namespace_dict(),
                    'user': user.to_namespace_dict(),
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'token_type': 'Bearer',
                },
                status_code=201
            )

        except ValidationError as e:
            db.session.rollback()
            return APIResponse.validation_error(
                errors=e.errors if hasattr(e, 'errors') else {'general': str(e)}
            )

        except Exception as e:
            db.session.rollback()
            logger.exception(f"Error en registro de finca: {e}")
            return APIResponse.error(
                message='Error al registrar la finca',
                status_code=500,
                details={'error': str(e)}
            )


@public_ns.route('/')
class PublicInfoResource(Resource):
    """Información pública del sistema."""

    @public_ns.doc('public_info', description='Obtener información pública del sistema.', security=[])
    def get(self):
        """Retorna información pública y tipos de finca disponibles."""
        return APIResponse.success(
            message='Información del sistema',
            data={
                'name': '_projects/villaluz - Sistema de Gestión Ganadera',
                'version': '2.0.0-multi-tenant',
                'finca_types': [
                    {
                        'value': 'Educativa',
                        'description': 'Fincas educativas (SENA, Universidades)',
                        'roles': ['Aprendiz', 'Instructor', 'Administrador']
                    },
                    {
                        'value': 'Tradicional',
                        'description': 'Fincas ganaderas tradicionales',
                        'roles': ['Propietario', 'Capataz', 'Operario', 'Veterinario']
                    }
                ]
            }
        )

