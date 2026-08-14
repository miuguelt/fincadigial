"""
Veterinarians Namespace - Validación de Tarjeta Profesional e Idoneidad
======================================================================
Permite a los Médicos Veterinarios registrar su Tarjeta Profesional (COMVEZCOL),
solicitar verificación de idoneidad y permitir a los ganaderos/usuarios consultar
y validar sus credenciales sin vulnerar los derechos de Protección de Datos Personales
(Habeas Data Ley 1581 de 2012 / GDPR), manteniendo oculta información sensible (cédula,
teléfono personal, dirección privada).
"""

from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime
import logging

from app import db
from app.models.user import User, Role
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

vets_ns = Namespace(
    'veterinarians',
    description='🩺 Validación de Tarjeta Profesional Veterinaria y Verificación de Idoneidad',
    path='/veterinarians'
)

# Modelos para Swagger
verification_request_model = vets_ns.model('VeterinarianVerificationRequest', {
    'professional_card': fields.String(required=True, description='Número de Tarjeta Profesional (COMVEZCOL)', example='TP-12345'),
    'professional_specialty': fields.String(required=False, description='Especialidad (ej. Salud Bovina, Zootecnia)', example='Medicina Veterinaria y Zootecnia'),
    'verification_document_url': fields.String(required=False, description='URL o soporte escaneado de la tarjeta profesional'),
})

approval_model = vets_ns.model('VeterinarianApprovalRequest', {
    'is_verified': fields.Boolean(required=True, description='True para aprobar, False para rechazar/revocar'),
    'notes': fields.String(required=False, description='Notas administrativas sobre la verificación')
})

@vets_ns.route('/request-verification')
class RequestVerificationResource(Resource):
    @vets_ns.doc('request_vet_verification', description='Registrar o actualizar tarjeta profesional y solicitar verificación', security=['Bearer'])
    @vets_ns.expect(verification_request_model)
    @jwt_required()
    def post(self):
        try:
            current_user_id = int(get_jwt().get('id'))
            user = User.query.get(current_user_id)
            if not user:
                return APIResponse.not_found('Usuario no encontrado')

            data = flask.request.get_json() or {}
            card = data.get('professional_card')
            if not card or not str(card).strip():
                return APIResponse.validation_error({'professional_card': 'La tarjeta profesional es requerida.'})

            card_clean = str(card).strip().upper()
            specialty_clean = (data.get('professional_specialty') or 'Médico Veterinario Zootecnista').strip()
            doc_url = data.get('verification_document_url')

            # Verificar que no exista otra persona con la misma tarjeta profesional
            existing = User.query.filter(
                User.professional_card == card_clean,
                User.id != user.id
            ).first()
            if existing:
                return APIResponse.error(
                    message='La tarjeta profesional ingresada ya se encuentra registrada por otro usuario.',
                    status_code=409,
                    error_code='DUPLICATE_PROFESSIONAL_CARD'
                )

            user.professional_card = card_clean
            user.professional_specialty = specialty_clean
            if doc_url:
                user.verification_document_url = str(doc_url).strip()
            
            # Si se actualiza la tarjeta, requiere re-verificación por administración
            user.is_verified_professional = False
            user.verification_date = None

            db.session.commit()

            return APIResponse.success(
                data={
                    'user_id': user.id,
                    'fullname': user.fullname,
                    'professional_card': user.professional_card,
                    'professional_specialty': user.professional_specialty,
                    'is_verified_professional': user.is_verified_professional,
                },
                message='Solicitud de verificación registrada exitosamente. Pendiente de aprobación por administración.'
            )
        except Exception as e:
            db.session.rollback()
            logger.exception('Error al solicitar verificación veterinaria: %s', e)
            return APIResponse.error('Error interno procesando la solicitud', details={'error': str(e)})


@vets_ns.route('/verify/<string:card_number>')
class PublicVerifyVeterinarianResource(Resource):
    @vets_ns.doc('verify_vet_card', description='Consultar validez de Tarjeta Profesional. Resguarda datos personales sensibles (Habeas Data).', security=[])
    def get(self, card_number):
        try:
            card_clean = str(card_number).strip().upper()
            user = User.query.filter(User.professional_card == card_clean).first()

            if not user:
                return APIResponse.not_found(
                    message=f'No se encontró ningún registro activo para la Tarjeta Profesional {card_clean}.',
                    details={'verified': False, 'found': False}
                )

            # GARANTÍA HABEAS DATA / LEY 1581 DE 2012:
            # Únicamente se exponen datos públicos de idoneidad.
            # NO se retorna Cédula (identification), Teléfono, Dirección ni Email personal.
            sanitized_data = {
                'fullname': user.fullname,
                'professional_card': user.professional_card,
                'professional_specialty': user.professional_specialty or 'Médico Veterinario',
                'is_verified_professional': bool(user.is_verified_professional),
                'verification_date': user.verification_date.isoformat() if user.verification_date else None,
                'finca_name': user.finca_name,
                'status': 'Activo' if user.status else 'Inactivo',
                'privacy_notice': 'Datos desplegados bajo los términos de la Ley 1581 de 2012 (Habeas Data). La cédula y datos de contacto personal se encuentran protegidos.'
            }

            return APIResponse.success(
                data=sanitized_data,
                message='Información de validación profesional obtenida correctamente.'
            )
        except Exception as e:
            logger.exception('Error al verificar tarjeta veterinaria %s: %s', card_number, e)
            return APIResponse.error('Error al realizar la consulta de verificación', details={'error': str(e)})


@vets_ns.route('/<int:user_id>/approve-verification')
class AdminApproveVerificationResource(Resource):
    @vets_ns.doc('approve_vet_verification', description='[ADMINISTRADOR] Aprobar o rechazar la verificación de tarjeta profesional', security=['Bearer'])
    @vets_ns.expect(approval_model)
    @jwt_required()
    def patch(self, user_id):
        try:
            jwt_claims = get_jwt()
            if jwt_claims.get('role') != 'Administrador':
                return APIResponse.unauthorized('Solo los administradores pueden verificar credenciales profesionales.')

            user = User.query.get(user_id)
            if not user:
                return APIResponse.not_found('Usuario no encontrado')

            data = flask.request.get_json() or {}
            is_verified = bool(data.get('is_verified', True))

            user.is_verified_professional = is_verified
            user.verification_date = datetime.utcnow() if is_verified else None

            db.session.commit()

            status_msg = 'aprobada y verificada' if is_verified else 'rechazada/revocada'
            return APIResponse.success(
                data={
                    'user_id': user.id,
                    'fullname': user.fullname,
                    'professional_card': user.professional_card,
                    'is_verified_professional': user.is_verified_professional,
                    'verification_date': user.verification_date.isoformat() if user.verification_date else None
                },
                message=f'La tarjeta profesional de {user.fullname} ha sido {status_msg}.'
            )
        except Exception as e:
            db.session.rollback()
            logger.exception('Error administrando verificación de veterinario: %s', e)
            return APIResponse.error('Error interno al actualizar estado de verificación', details={'error': str(e)})


@vets_ns.route('/pending')
class AdminListPendingVerificationsResource(Resource):
    @vets_ns.doc('list_pending_verifications', description='[ADMINISTRADOR] Listar profesionales pendientes de verificación de tarjeta profesional', security=['Bearer'])
    @jwt_required()
    def get(self):
        try:
            jwt_claims = get_jwt()
            if jwt_claims.get('role') != 'Administrador':
                return APIResponse.unauthorized('Solo los administradores pueden consultar verificaciones pendientes.')

            # Obtener usuarios con tarjeta profesional registrada o rol Veterinario
            pending_users = User.query.filter(
                (User.professional_card.isnot(None)) | (User.role == Role.Veterinario)
            ).all()

            results = []
            for u in pending_users:
                results.append({
                    'id': u.id,
                    'fullname': u.fullname,
                    'email': u.email,
                    'role': getattr(u.role, 'value', str(u.role)),
                    'professional_card': u.professional_card,
                    'professional_specialty': u.professional_specialty,
                    'is_verified_professional': bool(u.is_verified_professional),
                    'verification_document_url': u.verification_document_url,
                    'verification_date': u.verification_date.isoformat() if u.verification_date else None,
                    'finca_name': u.finca_name
                })

            return APIResponse.success(
                data=results,
                message=f'Se encontraron {len(results)} registros profesionales.'
            )
        except Exception as e:
            logger.exception('Error al listar verificaciones pendientes: %s', e)
            return APIResponse.error('Error al consultar lista de profesionales', details={'error': str(e)})
