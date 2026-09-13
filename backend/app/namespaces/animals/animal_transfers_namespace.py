"""API de venta local, reclamación y continuidad del historial animal."""

from __future__ import annotations

import logging

import flask
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource, fields

from app.services.animal_transfer_service import AnimalTransferError, AnimalTransferService
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id, get_current_user_id

logger = logging.getLogger(__name__)

animal_transfers_ns = Namespace(
    "animal-transfers",
    description="Venta consentida y continuidad segura del historial de animales",
    path="/animals/transfers",
)

sell_model = animal_transfers_ns.model(
    "AnimalSaleIntent",
    {
        "animal_id": fields.Integer(required=True),
        "sale_date": fields.String(description="Fecha YYYY-MM-DD"),
        "buyer_name": fields.String(description="Nombre del comprador o destino"),
        "destination_finca_id": fields.Integer(description="Destino Villa Luz opcional"),
        "notes": fields.String(description="Observaciones"),
    },
)

registration_model = animal_transfers_ns.model(
    "AnimalRegistrationOrClaim",
    {
        "record": fields.String(required=True, description="Registro/arete local del animal"),
        "birth_date": fields.String(required=True, description="Fecha de nacimiento YYYY-MM-DD"),
        "sex": fields.String(required=True, enum=["Hembra", "Macho"]),
        "weight": fields.Float(required=True),
        "breeds_id": fields.Integer(required=True),
        "idFather": fields.Integer(),
        "idMother": fields.Integer(),
        "nfc_uid": fields.String(),
        "lf_tag_code": fields.String(),
        "claim_code": fields.String(description="Código privado entregado por el vendedor"),
        "official_code": fields.String(description="Se almacena pendiente de verificación ICA"),
        "request_history": fields.Boolean(default=True),
        "entry_date": fields.String(),
        "purchase_date": fields.String(),
    },
)

decision_model = animal_transfers_ns.model(
    "AnimalTransferDecision",
    {
        "approve": fields.Boolean(required=True, description="Aprobar y compartir historial"),
        "note": fields.String(description="Nota de la decisión"),
    },
)


def _failure(error: AnimalTransferError):
    return APIResponse.error(error.message, status_code=error.status_code, error_code=error.code)


@animal_transfers_ns.route("/sell")
class AnimalSaleIntentResource(Resource):
    @animal_transfers_ns.doc("mark_animal_sold", security=["Bearer"])
    @animal_transfers_ns.expect(sell_model)
    @jwt_required()
    def post(self):
        user_id = get_current_user_id()
        finca_id = get_current_finca_id()
        if not user_id or not finca_id:
            return APIResponse.error("No se pudo resolver el usuario o la finca activa", 400, "TENANT_CONTEXT_REQUIRED")
        try:
            data = flask.request.get_json(silent=True) or {}
            result = AnimalTransferService.mark_sold(
                animal_id=int(data.get("animal_id")),
                finca_id=finca_id,
                user_id=user_id,
                sale_date=data.get("sale_date"),
                buyer_name=data.get("buyer_name"),
                destination_finca_id=data.get("destination_finca_id"),
                notes=data.get("notes"),
            )
            return APIResponse.success(
                data=result,
                message="Animal marcado como vendido en la finca. Comparta el código privado con el comprador.",
                status_code=201,
            )
        except (TypeError, ValueError):
            return APIResponse.validation_error({"animal_id": "Debe ser un número válido"})
        except AnimalTransferError as error:
            return _failure(error)
        except Exception:
            logger.exception("Error marcando animal vendido")
            return APIResponse.error("No se pudo registrar la venta", 500, "SALE_REGISTRATION_ERROR")


@animal_transfers_ns.route("/register")
class AnimalRegistrationOrClaimResource(Resource):
    @animal_transfers_ns.doc("register_or_claim_animal", security=["Bearer"])
    @animal_transfers_ns.expect(registration_model)
    @jwt_required()
    def post(self):
        user_id = get_current_user_id()
        finca_id = get_current_finca_id()
        if not user_id or not finca_id:
            return APIResponse.error("No se pudo resolver el usuario o la finca activa", 400, "TENANT_CONTEXT_REQUIRED")
        try:
            result = AnimalTransferService.register_or_claim(
                user_id=user_id,
                finca_id=finca_id,
                data=flask.request.get_json(silent=True) or {},
            )
            status = 202 if result.get("registration_status") == "TRANSFER_PENDING" else 201
            message = result.get("message") or "Animal registrado correctamente en la finca"
            return APIResponse.success(data=result, message=message, status_code=status)
        except AnimalTransferError as error:
            return _failure(error)
        except Exception:
            logger.exception("Error registrando o reclamando animal")
            return APIResponse.error("No se pudo registrar el animal", 500, "ANIMAL_REGISTRATION_ERROR")


@animal_transfers_ns.route("/claims")
class AnimalTransferClaimsResource(Resource):
    @animal_transfers_ns.doc("list_animal_transfer_claims", security=["Bearer"])
    @jwt_required()
    def get(self):
        user_id = get_current_user_id()
        if not user_id:
            return APIResponse.error("Usuario no autenticado", 401, "AUTH_REQUIRED")
        return APIResponse.success(data=AnimalTransferService.claims_for_user(user_id))


@animal_transfers_ns.route("/claims/<int:claim_id>/decision")
class AnimalTransferClaimDecisionResource(Resource):
    @animal_transfers_ns.doc("decide_animal_transfer_claim", security=["Bearer"])
    @animal_transfers_ns.expect(decision_model)
    @jwt_required()
    def post(self, claim_id: int):
        user_id = get_current_user_id()
        if not user_id:
            return APIResponse.error("Usuario no autenticado", 401, "AUTH_REQUIRED")
        data = flask.request.get_json(silent=True) or {}
        if "approve" not in data or not isinstance(data.get("approve"), bool):
            return APIResponse.validation_error({"approve": "Indique true para aprobar o false para rechazar"})
        try:
            result = AnimalTransferService.decide_claim(
                claim_id=claim_id,
                user_id=user_id,
                approve=data["approve"],
                note=data.get("note"),
            )
            return APIResponse.success(
                data=result,
                message="Transferencia aprobada y el historial quedó asociado"
                if data["approve"]
                else "Solicitud rechazada; el animal permanece vendido en la finca origen",
            )
        except AnimalTransferError as error:
            return _failure(error)
        except Exception:
            logger.exception("Error decidiendo solicitud de animal %s", claim_id)
            return APIResponse.error("No se pudo procesar la decisión", 500, "CLAIM_DECISION_ERROR")


@animal_transfers_ns.route("/<int:animal_id>/portable-history")
class AnimalPortableHistoryResource(Resource):
    @animal_transfers_ns.doc("get_portable_animal_history", security=["Bearer"])
    @jwt_required()
    def get(self, animal_id: int):
        user_id = get_current_user_id()
        finca_id = get_current_finca_id()
        if not user_id or not finca_id:
            return APIResponse.error("No se pudo resolver el usuario o la finca activa", 400, "TENANT_CONTEXT_REQUIRED")
        try:
            return APIResponse.success(
                data=AnimalTransferService.portable_history(
                    animal_id=animal_id,
                    user_id=user_id,
                    finca_id=finca_id,
                    limit=flask.request.args.get("limit", 100, type=int),
                )
            )
        except AnimalTransferError as error:
            return _failure(error)
        except Exception:
            logger.exception("Error obteniendo historial portátil del animal %s", animal_id)
            return APIResponse.error("No se pudo obtener el historial", 500, "PORTABLE_HISTORY_ERROR")

