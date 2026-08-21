"""Rutas de genealogía y de registro reproductivo por lote.

El registro por lote existe porque en campo una jornada de palpación o de
sincronización toca decenas de animales: obliga a un solo viaje al servidor y
reporta el resultado animal por animal.
"""

import logging

import flask
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Resource, fields

from app import db
from app.models.animals import Animals
from app.models.reproduction import ReproductiveEvent
from app.services.reproduction import apply_event_effects, validate_event
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.utils.tree_builder import build_ancestor_tree, build_descendant_tree

from ._namespace import reproduction_ns

logger = logging.getLogger(__name__)

#: Campos que cada tipo de evento aporta al registro por lote.
_BATCH_FIELDS = {
    "Inseminacion": ("sire_id", "technique"),
    "Diagnostico": ("diagnosis_result",),
    "Parto": ("alive_count", "dead_count", "complications"),
}


def _actor_id() -> int | None:
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return None


def _missing_batch_fields(data: dict) -> dict:
    """Valida la forma del lote antes de tocar la base de datos."""
    errors = {}
    animal_ids = data.get("animal_ids")
    if not animal_ids or not isinstance(animal_ids, list):
        errors["animal_ids"] = "Se requiere una lista de IDs de animales."
    if not data.get("event_type"):
        errors["event_type"] = "Se requiere el tipo de evento."
    if not data.get("event_date"):
        errors["event_date"] = "Se requiere la fecha del evento."
    return errors


def _batch_event_data(
    data: dict, animal_id: int, finca_id: int, actor_id: int | None
) -> dict:
    """Arma el evento de un animal a partir de los datos comunes del lote."""
    event_type = data["event_type"]
    event_data = {
        "animal_id": animal_id,
        "event_type": event_type,
        "event_date": data["event_date"],
        "finca_id": finca_id,
        "actor_id": actor_id,
        "notes": data.get("notes"),
    }
    for field in _BATCH_FIELDS.get(event_type, ()):
        if field in data:
            event_data[field] = data[field]
    if event_type == "Parto":
        event_data.setdefault("alive_count", 1)
        event_data.setdefault("dead_count", 0)
        event_data.setdefault("complications", False)
    return event_data


@reproduction_ns.route("/genealogy/<int:animal_id>")
class GenealogyTree(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "genealogy_tree",
        params={
            "depth": "Profundidad del árbol (default: 3)",
            "direction": "ancestors | descendants | both (default: both)",
        },
    )
    def get(self, animal_id):
        """Árbol genealógico de un animal."""
        depth = max(1, flask.request.args.get("depth", default=3, type=int))
        direction = flask.request.args.get("direction", default="both")

        animal = Animals.get_by_id(animal_id)
        if not animal:
            return APIResponse.error("Animal no encontrado", status_code=404)

        result = {
            "root_id": animal_id,
            "root_record": animal.record,
            "root_sex": str(animal.sex) if animal.sex else None,
        }

        if direction in ("ancestors", "both"):
            result["ancestors"] = build_ancestor_tree(animal_id, max_depth=depth)

        if direction in ("descendants", "both"):
            result["descendants"] = build_descendant_tree(animal_id, max_depth=depth)

        return APIResponse.success(data=result, message="Árbol genealógico")


@reproduction_ns.route("/batch")
class ReproductionBatch(Resource):
    @jwt_required()
    @reproduction_ns.expect(
        reproduction_ns.model(
            "ReproductionBatchInput",
            {
                "animal_ids": fields.List(
                    fields.Integer,
                    required=True,
                    description="Lista de IDs de las hembras",
                ),
                "event_type": fields.String(
                    required=True, enum=["Celo", "Inseminacion", "Diagnostico", "Parto"]
                ),
                "event_date": fields.Date(required=True),
                "sire_id": fields.Integer(
                    description="ID del macho (solo Inseminacion)"
                ),
                "technique": fields.String(
                    enum=["Natural", "Artificial", "Transferencia_Embrionaria"]
                ),
                "diagnosis_result": fields.String(
                    enum=["Positivo", "Negativo", "Pendiente"]
                ),
                "alive_count": fields.Integer(description="Crías vivas (solo Parto)"),
                "dead_count": fields.Integer(description="Crías muertas (solo Parto)"),
                "complications": fields.Boolean(
                    description="¿Hubo complicaciones? (solo Parto)"
                ),
                "notes": fields.String(),
            },
        )
    )
    def post(self):
        """Registrar eventos reproductivos masivos.

        Cada animal se valida por separado: los que no cumplen las reglas de
        dominio se reportan con su motivo en lugar de descartarse en silencio.
        """
        data = flask.request.get_json() or {}
        invalid = _missing_batch_fields(data)
        if invalid:
            return APIResponse.validation_error(invalid)

        finca_id = get_current_finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)

        actor_id = _actor_id()
        created, rejected = [], []
        for animal_id in data["animal_ids"]:
            event_data = _batch_event_data(data, animal_id, finca_id, actor_id)
            try:
                validate_event(event_data, finca_id)
                event = ReproductiveEvent.create(**event_data)
                apply_event_effects(event)
                created.append(event)
            except Exception as e:  # noqa: BLE001 — un animal no debe tumbar el lote
                rejected.append({"animal_id": animal_id, "reason": str(e)})

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.exception("Error confirmando registro reproductivo masivo")
            return APIResponse.error(
                message=f"Error en registro reproductivo masivo: {e}"
            )

        from app.utils.namespace_helpers import _cache_clear

        for entity in ("ReproductiveEvent", "Animals", "LactationCycle"):
            _cache_clear(entity)

        return APIResponse.success(
            data={
                "created": [
                    event.to_namespace_dict(include_relations=True) for event in created
                ],
                "rejected": rejected,
            },
            message=(
                f"Evento reproductivo registrado para {len(created)} animales; "
                f"{len(rejected)} rechazados"
            ),
        )
