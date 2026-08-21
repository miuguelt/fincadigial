"""Rutas de descendencia: crías del parto y su alta como animal del hato.

Separadas del CRUD de eventos porque la cría tiene su propio ciclo: primero
existe como fila de `offspring` con los conteos del parto, y solo entra al
inventario cuando el operario le asigna un arete.
"""

import logging

import flask
from flask_jwt_extended import jwt_required
from flask_restx import Resource, fields

from app import db
from app.models.base_model import ValidationError
from app.models.reproduction import EventType, Offspring, ReproductiveEvent
from app.services.reproduction.calf_registration import register_calf
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import apply_tenant_filter, get_current_finca_id

from ._namespace import _parse_int, offspring_input_model, reproduction_ns

logger = logging.getLogger(__name__)

calf_input_model = reproduction_ns.model(
    "CalfRegistrationInput",
    {
        "record": fields.String(required=True, description="Arete o registro de la cría"),
        "sex": fields.String(enum=["Hembra", "Macho"]),
        "weight": fields.Float(description="Peso al nacer en kilos"),
        "breeds_id": fields.Integer(description="Raza; por defecto la de la madre"),
    },
)


@reproduction_ns.route("/offspring/")
class OffspringList(Resource):
    @jwt_required()
    def get(self):
        """Listar crías."""
        page = _parse_int("page", 1)
        limit = _parse_int("limit", 20)
        filters = {}
        birth_event_id = flask.request.args.get("birth_event_id", type=int)
        if birth_event_id:
            filters["birth_event_id"] = birth_event_id
        query = Offspring.get_namespace_query(
            filters=filters,
            sort_by="created_at",
            sort_order="desc",
            page=page,
            per_page=limit,
        )
        result = Offspring.get_paginated_response(query)
        return APIResponse.paginated_success(
            data=result.get("items", []),
            page=result.get("page", page),
            limit=result.get("limit", limit),
            total_items=result.get("total_items", 0),
            message="Crías obtenidas",
        )

    @jwt_required()
    @reproduction_ns.expect(offspring_input_model)
    def post(self):
        """Registrar cría de un parto."""
        data = dict(reproduction_ns.payload or {})
        birth_event_id = data.get("birth_event_id")
        if birth_event_id:
            ev = ReproductiveEvent.get_by_id(birth_event_id)
            if not ev or ev.event_type != EventType.Parto:
                return APIResponse.error(
                    "El evento debe ser de tipo Parto", status_code=400
                )
        try:
            offspring = Offspring.create(**data)
        except ValidationError as e:
            logger.warning(
                f"Error de validación al registrar cría: {e.message} - Payload: {data}"
            )
            return APIResponse.error(e.message, status_code=400)
        except Exception as e:
            logger.error(f"Error inesperado al registrar cría: {str(e)}", exc_info=True)
            return APIResponse.error(
                "Error al procesar el registro de la cría", status_code=500
            )
        return APIResponse.success(
            data=offspring.to_namespace_dict(include_relations=True),
            message="Cría registrada",
            status_code=201,
        )


@reproduction_ns.route("/offspring/<int:offspring_id>/register-animal")
class CalfRegistration(Resource):
    @jwt_required()
    @reproduction_ns.expect(calf_input_model)
    @reproduction_ns.doc("register_calf")
    def post(self, offspring_id):
        """Dar de alta la cría como animal del hato.

        Deriva del parto la fecha de nacimiento, la madre, el padre del servicio
        que la engendró, la raza y los abuelos conocidos; el operario solo aporta
        el arete y el sexo.
        """
        finca_id = get_current_finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)

        try:
            calf = register_calf(offspring_id, finca_id, dict(reproduction_ns.payload or {}))
            db.session.commit()
            from app.utils.namespace_helpers import _cache_clear

            _cache_clear("Animals")
            _cache_clear("Offspring")
        except ValidationError as e:
            db.session.rollback()
            return APIResponse.error(
                e.message, status_code=400, details={"errors": e.errors, "field": e.field}
            )
        except Exception as e:
            db.session.rollback()
            logger.exception("Error registrando la cría %s", offspring_id)
            return APIResponse.error(str(e), status_code=500)

        return APIResponse.success(
            data=calf.to_namespace_dict(include_relations=True),
            message=f"Cría registrada como animal {calf.record}",
            status_code=201,
        )
