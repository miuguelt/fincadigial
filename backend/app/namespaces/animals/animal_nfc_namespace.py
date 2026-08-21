"""Endpoints de identificación electrónica del animal.

El celular graba el chip sin pasar por el servidor; estas rutas solo registran
y consultan el vínculo animal↔chip, que es lo único auditable.
"""

import flask
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource, fields

from app import db
from app.models.base_model import ValidationError
from app.services.nfc.tag_binding_service import (
    TagConflictError,
    bind_tag,
    find_by_tag,
    unbind_tag,
)
from app.utils.namespace_helpers import _cache_clear
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

animal_nfc_ns = Namespace(
    "animal-nfc",
    description="Vinculación de aretes NFC y transpondedores LF con animales",
    path="/animals/nfc",
)

bind_model = animal_nfc_ns.model(
    "AnimalTagBinding",
    {
        "animal_id": fields.Integer(required=True),
        "nfc_uid": fields.String(description="UID hexadecimal del arete de 13.56 MHz"),
        "lf_tag_code": fields.String(description="Código ISO 11784 de 15 dígitos"),
        "written_at": fields.DateTime(description="Momento real de la grabación"),
        "force": fields.Boolean(
            default=False, description="Reasignar el chip si ya pertenece a otro animal"
        ),
    },
)


def _parse_written_at(raw):
    """Acepta la marca de tiempo del celular, que puede venir de una cola offline."""
    if not raw:
        return None
    from datetime import datetime

    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


@animal_nfc_ns.route("/bind")
class AnimalTagBind(Resource):
    @animal_nfc_ns.doc("bind_animal_tag")
    @animal_nfc_ns.expect(bind_model)
    @jwt_required()
    def post(self):
        """Registra el chip grabado en el arete de un animal."""
        data = flask.request.get_json() or {}
        try:
            animal = bind_tag(
                animal_id=data.get("animal_id"),
                finca_id=get_current_finca_id(),
                nfc_uid=data.get("nfc_uid"),
                lf_tag_code=data.get("lf_tag_code"),
                written_at=_parse_written_at(data.get("written_at")),
                force=bool(data.get("force")),
            )
            _cache_clear("Animals")
            return APIResponse.success(
                data=animal.to_namespace_dict(),
                message=f"Chip vinculado con {animal.record}",
            )
        except TagConflictError as conflict:
            db.session.rollback()
            return APIResponse.error(
                message=str(conflict),
                status_code=409,
                details={
                    "conflict": {
                        "holder_id": conflict.holder_id,
                        "holder_record": conflict.holder_record,
                        "code": conflict.code,
                    }
                },
            )
        except ValidationError as err:
            db.session.rollback()
            return APIResponse.validation_error(err.errors or {"detail": err.message})
        except Exception as err:  # noqa: BLE001 - la finca no puede quedarse sin respuesta
            db.session.rollback()
            return APIResponse.error(message=f"Error al vincular el chip: {err}")


@animal_nfc_ns.route("/unbind")
class AnimalTagUnbind(Resource):
    @animal_nfc_ns.doc("unbind_animal_tag")
    @jwt_required()
    def post(self):
        """Retira la identificación electrónica (arete perdido o chip dañado)."""
        data = flask.request.get_json() or {}
        try:
            animal = unbind_tag(
                animal_id=data.get("animal_id"), finca_id=get_current_finca_id()
            )
            _cache_clear("Animals")
            return APIResponse.success(
                data=animal.to_namespace_dict(),
                message=f"Identificación electrónica retirada de {animal.record}",
            )
        except ValidationError as err:
            db.session.rollback()
            return APIResponse.validation_error(err.errors or {"detail": err.message})
        except Exception as err:  # noqa: BLE001
            db.session.rollback()
            return APIResponse.error(message=f"Error al retirar el chip: {err}")


@animal_nfc_ns.route("/lookup")
class AnimalTagLookup(Resource):
    @animal_nfc_ns.doc("lookup_animal_by_tag")
    @jwt_required()
    def get(self):
        """Resuelve el animal a partir del chip leído en el potrero."""
        nfc_uid = flask.request.args.get("nfc_uid")
        lf_tag_code = flask.request.args.get("lf_tag_code")
        try:
            animal = find_by_tag(
                finca_id=get_current_finca_id(),
                nfc_uid=nfc_uid,
                lf_tag_code=lf_tag_code,
            )
            if animal is None:
                return APIResponse.error(
                    message="Ningún animal de esta finca tiene ese chip",
                    status_code=404,
                )
            return APIResponse.success(data=animal.to_namespace_dict())
        except ValidationError as err:
            return APIResponse.validation_error(err.errors or {"detail": err.message})
        except Exception as err:  # noqa: BLE001
            return APIResponse.error(message=f"Error al consultar el chip: {err}")
