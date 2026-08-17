"""Endpoints de acreditación profesional del veterinario.

Reparto de acceso:
  - `/me`      : el titular administra su propia credencial (solo JWT).
  - `/badge`   : cualquier autenticado ve el resumen público (matrícula enmascarada).
  - el resto   : Administrador o Propietario de la finca, que son quienes cotejan
                 contra el registro público de COMVEZCOL.

La entidad `professional-credentials` está en READ_RESTRICTED_ENTITIES
(`app/utils/rbac.py`), así que el CRUD genérico ya queda cerrado a los demás roles.
"""

import logging
import re
from datetime import UTC, date, datetime

import flask
from flask_jwt_extended import get_jwt, jwt_required
from flask_restx import Resource

from app import db
from app.models.base_model import ValidationError
from app.models.professional_credentials import (
    CONSENT_VERSION,
    REVERIFY_TRIGGER_FIELDS,
    CredentialStatus,
    ProfessionalCredential,
)
from app.models.user import User
from app.models.user_finca import UserFinca
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

logger = logging.getLogger(__name__)

VERIFIER_ROLES = {"Administrador", "Propietario"}
DEFAULT_VERIFICATION_SOURCE = "Registro público COMVEZCOL"

# Campos que el titular puede enviar. El estado, la verificación y la prueba de
# consentimiento los fija el servidor: si viajaran en el payload, cualquiera
# podría autoverificarse.
SELF_EDITABLE_FIELDS = (
    "title",
    "professional_card_number",
    "issuing_authority",
    "card_issued_at",
    "university",
    "graduation_year",
    "specialization",
    "ica_registration",
    "practice_areas",
    "liability_insurer",
    "liability_policy_number",
    "liability_expires_at",
)

professional_credentials_ns = create_optimized_namespace(
    "professional-credentials",
    "Acreditación profesional de veterinarios",
    ProfessionalCredential,
)


def _current_user_id() -> int | None:
    raw = get_jwt().get("id")
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def _current_role() -> str:
    return get_jwt().get("role") or ""


def _is_verifier() -> bool:
    return _current_role() in VERIFIER_ROLES


def _extract_payload() -> dict:
    body = flask.request.get_json(silent=True) or {}
    return {key: body.get(key) for key in SELF_EDITABLE_FIELDS if key in body}


def _comparable(field: str, value):
    """Forma canónica de un campo para detectar cambios reales.

    Lo almacenado y lo recibido no comparten tipo: el modelo guarda enums y
    `date`, mientras el cliente envía cadenas. Sin normalizar, cada guardado
    parecería un cambio de matrícula y tumbaría verificaciones legítimas.
    """
    if value is None:
        return None

    value = getattr(value, "value", value)  # enums -> su valor

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    if isinstance(value, str):
        value = value.strip()
        if field == "professional_card_number":
            return re.sub(r"\s+", "", value).upper()
        return value or None

    return value


def _changed_fields(credential, payload: dict) -> set[str]:
    return {
        key
        for key in payload
        if _comparable(key, getattr(credential, key, None))
        != _comparable(key, payload[key])
    }


def _shares_finca(verifier_id: int, target_user_id: int) -> bool:
    """El verificador solo alcanza credenciales de usuarios de su finca activa.

    Un Administrador global (sin finca en el contexto) queda fuera de esta
    restricción porque su alcance ya es toda la plataforma.
    """
    finca_id = get_current_finca_id()
    if not finca_id:
        return _current_role() == "Administrador"
    return UserFinca.has_access(target_user_id, finca_id)


@professional_credentials_ns.route("/me")
class MyProfessionalCredential(Resource):
    @professional_credentials_ns.doc(
        "get_my_professional_credential",
        description="Credencial profesional del usuario autenticado",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        user_id = _current_user_id()
        if not user_id:
            return APIResponse.unauthorized("No se pudo identificar al usuario")

        credential = ProfessionalCredential.query.filter_by(user_id=user_id).first()
        if not credential:
            # Ausencia de credencial no es un error: el perfil aún no se acreditó.
            return APIResponse.success(
                data=None,
                message="Sin credencial profesional registrada",
            )

        return APIResponse.success(
            data=credential.to_namespace_dict(include_relations=True),
            message="Credencial profesional",
        )

    @professional_credentials_ns.doc(
        "upsert_my_professional_credential",
        description="Crear o actualizar la credencial profesional propia",
        security=["Bearer"],
    )
    @jwt_required()
    def put(self):
        user_id = _current_user_id()
        if not user_id:
            return APIResponse.unauthorized("No se pudo identificar al usuario")

        if _current_role() != "Veterinario":
            return APIResponse.forbidden(
                "La acreditación profesional está disponible para el rol Veterinario"
            )

        body = flask.request.get_json(silent=True) or {}
        if not body.get("consent_accepted"):
            return APIResponse.validation_error(
                {
                    "consent_accepted": (
                        "Debes autorizar el tratamiento de tus datos profesionales "
                        "para registrar la acreditación"
                    )
                }
            )

        payload = _extract_payload()
        credential = ProfessionalCredential.query.filter_by(user_id=user_id).first()

        try:
            now = datetime.now(UTC)

            if credential is None:
                credential = ProfessionalCredential.create(
                    user_id=user_id,
                    consent_version=CONSENT_VERSION,
                    consent_accepted_at=now,
                    status=CredentialStatus.EnRevision,
                    **payload,
                )
                message = "Acreditación registrada. Queda pendiente de revisión."
            else:
                # Solo se reinicia la revisión si cambió algo que la verificación
                # respaldaba; corregir el teléfono de la aseguradora no debería
                # tumbar una insignia legítima.
                changed_keys = _changed_fields(credential, payload)
                needs_reverification = bool(changed_keys & REVERIFY_TRIGGER_FIELDS)

                updates = dict(payload)
                updates["consent_version"] = CONSENT_VERSION
                updates["consent_accepted_at"] = now
                if needs_reverification:
                    updates["status"] = CredentialStatus.EnRevision
                    updates["verified_at"] = None
                    updates["verified_by_id"] = None
                    updates["verification_reference"] = None
                    updates["verification_expires_at"] = None
                    updates["rejection_reason"] = None

                credential.update(**updates)
                message = (
                    "Acreditación actualizada. Vuelve a quedar pendiente de revisión."
                    if needs_reverification
                    else "Acreditación actualizada."
                )

            return APIResponse.success(
                data=credential.to_namespace_dict(include_relations=True),
                message=message,
            )

        except ValidationError as exc:
            db.session.rollback()
            errors = getattr(exc, "errors", None) or {"error": exc.message}
            return APIResponse.validation_error(errors)
        except Exception as exc:
            db.session.rollback()
            logger.error(
                "Error guardando credencial profesional: %s", exc, exc_info=True
            )
            return APIResponse.error("No se pudo guardar la acreditación profesional")

    @professional_credentials_ns.doc(
        "delete_my_professional_credential",
        description="Suprimir la credencial profesional propia (Ley 1581 de 2012)",
        security=["Bearer"],
    )
    @jwt_required()
    def delete(self):
        user_id = _current_user_id()
        if not user_id:
            return APIResponse.unauthorized("No se pudo identificar al usuario")

        credential = ProfessionalCredential.query.filter_by(user_id=user_id).first()
        if not credential:
            return APIResponse.not_found("Credencial profesional")

        try:
            db.session.delete(credential)
            db.session.commit()
            return APIResponse.success(message="Datos profesionales eliminados")
        except Exception as exc:
            db.session.rollback()
            logger.error(
                "Error eliminando credencial profesional: %s", exc, exc_info=True
            )
            return APIResponse.error("No se pudo eliminar la acreditación profesional")


@professional_credentials_ns.route("/user/<int:user_id>/badge")
class ProfessionalCredentialBadge(Resource):
    @professional_credentials_ns.doc(
        "get_professional_credential_badge",
        description="Resumen público de la acreditación de un usuario",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self, user_id):
        credential = ProfessionalCredential.query.filter_by(user_id=user_id).first()
        if not credential:
            return APIResponse.success(data=None, message="Sin acreditación registrada")
        return APIResponse.success(
            data=credential.public_summary(),
            message="Resumen de acreditación",
        )


@professional_credentials_ns.route("/pending")
class PendingProfessionalCredentials(Resource):
    @professional_credentials_ns.doc(
        "list_pending_professional_credentials",
        description="Credenciales pendientes de cotejo en la finca activa",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        if not _is_verifier():
            return APIResponse.forbidden(
                "Solo Administrador o Propietario pueden revisar acreditaciones"
            )

        query = ProfessionalCredential.query.filter(
            ProfessionalCredential.status.in_(
                [
                    CredentialStatus.Autodeclarado,
                    CredentialStatus.EnRevision,
                ]
            )
        )

        finca_id = get_current_finca_id()
        if finca_id:
            query = query.join(
                UserFinca, UserFinca.user_id == ProfessionalCredential.user_id
            ).filter(
                UserFinca.finca_id == finca_id,
                UserFinca.is_active.is_(True),
            )

        pending = query.order_by(ProfessionalCredential.updated_at.asc()).all()
        return APIResponse.success(
            data=[item.to_namespace_dict(include_relations=True) for item in pending],
            message=f"{len(pending)} acreditaciones pendientes de revisión",
        )


def _load_for_verification(credential_id: int):
    """Devuelve (credencial, respuesta_de_error). Solo una de las dos es no nula."""
    if not _is_verifier():
        return None, APIResponse.forbidden(
            "Solo Administrador o Propietario pueden verificar acreditaciones"
        )

    verifier_id = _current_user_id()
    if not verifier_id:
        return None, APIResponse.unauthorized("No se pudo identificar al usuario")

    credential = ProfessionalCredential.query.get(credential_id)
    if not credential:
        return None, APIResponse.not_found("Credencial profesional")

    if credential.user_id == verifier_id:
        return None, APIResponse.forbidden("No puedes verificar tu propia acreditación")

    if not _shares_finca(verifier_id, credential.user_id):
        return None, APIResponse.forbidden(
            "Solo puedes revisar acreditaciones de usuarios de tu finca"
        )

    return credential, None


def _log_verification(credential, action: str, title: str, description: str):
    """El cotejo es un acto con consecuencias: debe quedar rastro fuera de la fila."""
    try:
        from app.models.activity_log import ActivityLog

        ActivityLog.create(
            action=action,
            entity="ProfessionalCredential",
            entity_id=credential.id,
            title=title,
            description=description,
            severity="info",
            actor_id=_current_user_id(),
            finca_id=get_current_finca_id(),
        )
        db.session.commit()
    except Exception as exc:
        logger.warning("No se pudo registrar la verificación en ActivityLog: %s", exc)


@professional_credentials_ns.route("/<int:credential_id>/verify")
class VerifyProfessionalCredential(Resource):
    @professional_credentials_ns.doc(
        "verify_professional_credential",
        description="Registrar el cotejo contra el registro público de COMVEZCOL",
        security=["Bearer"],
    )
    @jwt_required()
    def post(self, credential_id):
        credential, error = _load_for_verification(credential_id)
        if error:
            return error

        body = flask.request.get_json(silent=True) or {}
        reference = (body.get("reference") or "").strip()
        if not reference:
            return APIResponse.validation_error(
                {
                    "reference": (
                        "Indica la referencia del cotejo (número de consulta, "
                        "fecha o enlace del registro público)"
                    )
                }
            )

        source = (body.get("source") or "").strip() or DEFAULT_VERIFICATION_SOURCE
        notes = (body.get("notes") or "").strip() or None

        try:
            user = User.query.get(credential.user_id)
            credential.mark_verified(
                verifier_id=_current_user_id(),
                source=source,
                reference=reference,
                notes=notes,
            )
            db.session.commit()

            _log_verification(
                credential,
                action="verify",
                title=f"Acreditación verificada: {user.fullname if user else credential.user_id}",
                description=f"Cotejada contra {source}. Referencia: {reference}",
            )

            return APIResponse.success(
                data=credential.to_namespace_dict(include_relations=True),
                message="Acreditación verificada",
            )
        except Exception as exc:
            db.session.rollback()
            logger.error("Error verificando acreditación: %s", exc, exc_info=True)
            return APIResponse.error("No se pudo verificar la acreditación")


@professional_credentials_ns.route("/<int:credential_id>/reject")
class RejectProfessionalCredential(Resource):
    @professional_credentials_ns.doc(
        "reject_professional_credential",
        description="Rechazar una acreditación indicando el motivo",
        security=["Bearer"],
    )
    @jwt_required()
    def post(self, credential_id):
        credential, error = _load_for_verification(credential_id)
        if error:
            return error

        body = flask.request.get_json(silent=True) or {}
        reason = (body.get("reason") or "").strip()
        if not reason:
            return APIResponse.validation_error(
                {
                    "reason": "Indica el motivo del rechazo para que el titular pueda corregir"
                }
            )

        try:
            user = User.query.get(credential.user_id)
            credential.mark_rejected(verifier_id=_current_user_id(), reason=reason)
            db.session.commit()

            _log_verification(
                credential,
                action="reject",
                title=f"Acreditación rechazada: {user.fullname if user else credential.user_id}",
                description=reason,
            )

            return APIResponse.success(
                data=credential.to_namespace_dict(include_relations=True),
                message="Acreditación rechazada",
            )
        except Exception as exc:
            db.session.rollback()
            logger.error("Error rechazando acreditación: %s", exc, exc_info=True)
            return APIResponse.error("No se pudo rechazar la acreditación")
