"""Namespace de protocolos de tratamiento (base de conocimiento por finca).

CRUD genérico vía ``create_optimized_namespace`` más el endpoint ``apply``:
aplica un protocolo a una res copiando sus valores por defecto en un nuevo
``Treatments`` (instancia trazable), con enlace opcional a un caso clínico.
"""

import datetime as dt
import logging

import flask
from flask import jsonify, make_response
from flask_jwt_extended import jwt_required
from flask_restx import Resource, fields

from app import db
from app.models.treatment_protocols import TreatmentProtocol
from app.utils.namespace_helpers import (
    _cache_clear,
    _detail_cache_clear,
    create_optimized_namespace,
)
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter, get_current_user_id

logger = logging.getLogger(__name__)

treatment_protocols_ns = create_optimized_namespace(
    "treatment-protocols",
    "Protocolos de tratamiento reutilizables (base de conocimiento)",
    TreatmentProtocol,
    rbac_entity="treatment-protocols",
)

apply_model = treatment_protocols_ns.model(
    "TreatmentProtocolApply",
    {
        "animal_id": fields.Integer(
            required=True,
            description="Res a la que se aplica el protocolo",
        ),
        "animal_disease_id": fields.Integer(
            required=False,
            description="Caso clínico (episodio) al que se vincula la aplicación",
        ),
        "treatment_date": fields.String(
            required=False,
            description="Fecha de aplicación (YYYY-MM-DD). Por defecto hoy",
        ),
        "dosis": fields.String(
            required=False,
            description="Sobrescribe la dosis por defecto del protocolo",
        ),
        "frequency": fields.String(
            required=False,
            description="Sobrescribe la frecuencia por defecto del protocolo",
        ),
        "observations": fields.String(
            required=False,
            description="Sobrescribe las observaciones del protocolo",
        ),
    },
)


def _json_response(payload, status):
    """Devuelve una Response lista para Flask-RESTX."""
    return make_response(jsonify(payload), status)


def _parse_date(value):
    if not value:
        return dt.date.today()
    try:
        return dt.date.fromisoformat(str(value).split("T")[0])
    except (TypeError, ValueError):
        return None


def _clip(value, max_len=255):
    """Recorta un texto libre al límite de la columna destino (… si se corta)."""
    text = str(value or "").strip()
    if not text:
        return None
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


@treatment_protocols_ns.route("/<int:protocol_id>/apply")
class TreatmentProtocolApply(Resource):
    """Aplica el protocolo a una res generando un Treatment trazable."""

    @jwt_required()
    @treatment_protocols_ns.doc(
        "apply_treatment_protocol",
        description="Copia el protocolo en un nuevo tratamiento aplicado a la "
        "res (dosis/frecuencia/retiro). No registra salida de insumos: eso se "
        "hace aparte desde la ficha del tratamiento.",
    )
    @treatment_protocols_ns.expect(apply_model, validate=False)
    def post(self, protocol_id: int):
        try:
            from app.models.animalDiseases import AnimalDiseases
            from app.models.animals import Animals
            from app.models.treatments import Treatments

            payload = flask.request.get_json(silent=True) or {}

            protocol = (
                apply_tenant_filter(TreatmentProtocol.query, TreatmentProtocol)
                .filter(
                    TreatmentProtocol.id == protocol_id,
                    TreatmentProtocol.is_deleted.is_(False),
                )
                .first()
            )
            if not protocol:
                body, status = APIResponse.not_found("Protocolo de tratamiento")
                return _json_response(body, status)

            animal_id = payload.get("animal_id")
            if not animal_id:
                body, status = APIResponse.validation_error(
                    {"animal_id": "Debe indicar la res (animal_id)"}
                )
                return _json_response(body, status)

            animal = (
                apply_tenant_filter(Animals.query, Animals)
                .filter(
                    Animals.id == int(animal_id),
                    Animals.is_deleted.is_(False),
                )
                .first()
            )
            if not animal:
                body, status = APIResponse.not_found("Animal")
                return _json_response(body, status)
            if animal.finca_id != protocol.finca_id:
                body, status = APIResponse.validation_error(
                    {
                        "protocol_id": "El protocolo no pertenece a la finca de la res"
                    }
                )
                return _json_response(body, status)

            treatment_date = _parse_date(payload.get("treatment_date"))
            if treatment_date is None:
                body, status = APIResponse.validation_error(
                    {
                        "treatment_date": "La fecha debe tener formato YYYY-MM-DD"
                    }
                )
                return _json_response(body, status)

            episode = None
            episode_id = payload.get("animal_disease_id")
            if episode_id is not None:
                episode = (
                    apply_tenant_filter(
                        AnimalDiseases.query, AnimalDiseases
                    )
                    .filter(
                        AnimalDiseases.id == int(episode_id),
                        AnimalDiseases.is_deleted.is_(False),
                    )
                    .first()
                )
                if not episode:
                    body, status = APIResponse.not_found(
                        "Caso clínico (episodio)"
                    )
                    return _json_response(body, status)
                if episode.animal_id != animal.id:
                    body, status = APIResponse.validation_error(
                        {
                            "animal_disease_id": "El caso clínico no corresponde a la res indicada"
                        }
                    )
                    return _json_response(body, status)
                if episode.finca_id != animal.finca_id:
                    body, status = APIResponse.validation_error(
                        {
                            "animal_disease_id": "El caso clínico pertenece a otra finca"
                        }
                    )
                    return _json_response(body, status)

            withdrawal_days = int(protocol.withdrawal_days or 0)
            withdrawal_end_date = None
            if withdrawal_days > 0:
                withdrawal_end_date = treatment_date + dt.timedelta(
                    days=withdrawal_days
                )

            created = Treatments.create(
                animal_id=animal.id,
                finca_id=animal.finca_id,
                treatment_date=treatment_date,
                animal_disease_id=episode.id if episode else None,
                description=protocol.name,
                dosis=(
                    str(payload.get("dosis") or "").strip()
                    or protocol.default_dosis
                    or "Sin dosis definida"
                ),
                frequency=(
                    str(payload.get("frequency") or "").strip()
                    or protocol.default_frequency
                    or "Según protocolo"
                ),
                observations=(
                    _clip(payload.get("observations"))
                    or _clip(protocol.description)
                ),
                withdrawal_days=withdrawal_days,
                withdrawal_end_date=withdrawal_end_date,
                performed_by=get_current_user_id(),
            )

            _cache_clear("Treatments")
            _detail_cache_clear("Treatments", created.id)
            try:
                from app.models.animal_health_history import AnimalHealthHistory

                _cache_clear(AnimalHealthHistory.__name__)
            except Exception:
                pass

            body, status = APIResponse.success(
                data=created.to_namespace_dict(include_relations=True),
                message="Protocolo aplicado: tratamiento registrado a la res",
            )
            return _json_response(body, status)
        except Exception as e:
            db.session.rollback()
            from app.models.base_model import ValidationError

            if isinstance(e, ValidationError):
                errs = getattr(e, "errors", None) or str(e)
                body, status = APIResponse.validation_error(
                    errs if isinstance(errs, dict) else {"error": str(errs)}
                )
                return _json_response(body, status)
            logger.error(
                f"Error aplicando protocolo {protocol_id}: {e}", exc_info=True
            )
            body, status = APIResponse.error(
                message=f"Error al aplicar el protocolo: {str(e)}",
                status_code=500,
            )
            return _json_response(body, status)
